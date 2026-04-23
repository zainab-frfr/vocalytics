from livekit import rtc
import asyncio
import json
import logging
import os

import aiohttp
from dotenv import load_dotenv
from livekit.agents import JobContext, WorkerOptions, cli
from livekit.agents.voice import Agent, AgentSession
from livekit.agents import function_tool
from livekit.plugins import azure, deepgram, groq

load_dotenv(".env.local")

logging.getLogger("hpack").setLevel(logging.WARNING)
logging.getLogger("asyncio").setLevel(logging.WARNING)
logging.getLogger("livekit").setLevel(logging.WARNING)
logging.basicConfig(level=logging.WARNING)
logger = logging.getLogger("interview-agent")

SUPABASE_URL     = os.environ["SUPABASE_URL"]
SUPABASE_KEY     = os.environ["SUPABASE_SERVICE_KEY"]
INTERNAL_API_URL = os.environ["INTERNAL_API_URL"]
INTERNAL_API_KEY = os.environ["INTERNAL_API_KEY"]


async def fetch_questions(interview_id: str) -> tuple[list[dict], str, str]:
    url = f"{INTERNAL_API_URL}/internal/interviews/{interview_id}/questions"
    headers = {"X-Internal-API-Key": INTERNAL_API_KEY}
    async with aiohttp.ClientSession() as http:
        async with http.get(url, headers=headers, timeout=aiohttp.ClientTimeout(total=10)) as resp:
            resp.raise_for_status()
            data = await resp.json()
            return data["questions"], data.get("prompt", ""), data.get("language", "ur")


async def mark_complete(session_id: str) -> None:
    url = f"{INTERNAL_API_URL}/internal/sessions/{session_id}/complete"
    headers = {"X-Internal-API-Key": INTERNAL_API_KEY}
    async with aiohttp.ClientSession() as http:
        async with http.post(url, headers=headers, timeout=aiohttp.ClientTimeout(total=10)) as resp:
            resp.raise_for_status()


async def save_response(session_id, question_id, question_text, response):
    from supabase import acreate_client
    supabase = await acreate_client(SUPABASE_URL, SUPABASE_KEY)
    try:
        existing = await supabase.table("responses") \
            .select("id, response") \
            .eq("session_id", session_id) \
            .eq("question_id", question_id) \
            .execute()

        if not existing.data:
            # Nothing saved yet — insert fresh
            await supabase.table("responses").insert({
                "session_id":    session_id,
                "question_id":   question_id,
                "question_text": question_text,
                "response":      response,
            }).execute()
            print(f"[DB] Inserted new Q{question_id}: {response}")
        else:
            old = existing.data[0]["response"]
            if old.lower() in response.lower():
                # Old is contained in new — new is the fuller version, just update
                final = response
            else:
                # Genuinely new fragment — concatenate
                final = old + " " + response
            await supabase.table("responses") \
                .update({"response": final}) \
                .eq("session_id", session_id) \
                .eq("question_id", question_id) \
                .execute()
            print(f"[DB] Updated Q{question_id}: {final}")

    except Exception as e:
        logger.error(f"Failed to save response: {e}")


DEFAULT_PROMPT = """You are a professional interview assistant conducting a research interview in Urdu.
Your goal is to ask the following questions in order.

Strict Rules:
1. Speak only in Urdu. Use simple, everyday language.
2. Ask one question at a time, exactly as written. Do not rephrase.
3. Wait for the user's response before moving to the next question.
4. If a response is irrelevant, politely ask them to answer the question.
5. Never echo the user's answer back.
6. Do not thank after each answer. Only say thank you at the very end.
7. Only repeat a question if the user asks for clarification.
8. Once you have received a valid answer to the current question, you MUST call the advance_question tool with the user's answer before proceeding to the next question. Do not skip this."""


def build_instructions(questions: list[dict], custom_prompt: str = "", language: str = "ur") -> str:
    base = custom_prompt.strip() if custom_prompt.strip() else DEFAULT_PROMPT
    lang_name = "English" if language == "en" else "Urdu"
    return f"""{base}

IMPORTANT: You must speak ENTIRELY in {lang_name} — including all numbers, options, and choices. Never mix languages.

Questions:
{json.dumps(questions, ensure_ascii=False, indent=2)}
"""


async def entrypoint(ctx: JobContext):
    metadata = {}
    if ctx.job.metadata:
        try:
            metadata = json.loads(ctx.job.metadata)
        except json.JSONDecodeError:
            logger.error("Invalid job metadata JSON")
            return

    interview_id = metadata.get("interview_id")
    session_id   = metadata.get("session_id")

    if not interview_id or not session_id:
        logger.error(f"Missing interview_id or session_id in metadata: {metadata}")
        return

    logger.warning(f"Starting session={session_id} interview={interview_id}")

    try:
        questions, custom_prompt, language = await fetch_questions(interview_id)
    except Exception as e:
        logger.error(f"Failed to fetch questions: {e}")
        return

    if not questions:
        logger.error("Empty question list")
        return

    STT_LANGUAGES = {
        "ur": "ur",
        "en": "en-US",
    }
    TTS_VOICES = {
        "ur": "ur-PK-UzmaNeural",
        "en": "en-US-AriaNeural",
    }
    stt_language = STT_LANGUAGES.get(language, "ur")
    tts_voice = TTS_VOICES.get(language, "ur-PK-UzmaNeural")
    instructions = build_instructions(questions, custom_prompt, language)

    # Shared state — only the tool mutates this now
    state = {
        "question_index": 0,
    }

    print("\n" + "="*60)
    print(f"SESSION:  {session_id}")
    print(f"LANGUAGE: {language}")
    print(f"STT:      deepgram ({stt_language})")
    print(f"TTS:      azure ({tts_voice})")
    print(f"LLM:      groq/llama-3.3-70b-versatile")
    print(f"\nPROMPT:\n{instructions}")
    print("="*60 + "\n")

    await ctx.connect()

    session = AgentSession(
        stt=deepgram.STT(language=stt_language),
        llm=groq.LLM(model="llama-3.3-70b-versatile"),
        tts=azure.TTS(voice=tts_voice),
    )
    
    # Define the tool — closures capture session_id, questions, state, ctx
    @function_tool
    async def advance_question(answer: str) -> str:
        """
        Call this tool when the user has given a valid answer to the current question.

        How to fill the 'answer' parameter depends on the question type:
        - If the question has type "mcq" (has numbered options like 1, 2, 3...):
        pass ONLY the number the user selected (e.g. "2"). If the user said the
        option name instead of the number, convert it to the corresponding number.
        - If the question has type "open-ended" (no numbered options):
        pass the user's exact spoken words verbatim, do not summarize or rephrase.

        Never leave answer empty.
        """
        current_index = state["question_index"]
        current_q = questions[current_index]

        print(f"[TOOL] advance_question | type={current_q.get('type')} | Q{current_q['id']}: {answer}")
        print(f"[TOOL] advance_question called for Q{current_q['id']}: {answer}")

        # Save response to Supabase
        await save_response(
            session_id,
            current_q["id"],
            current_q["text"],
            answer,
        )

        next_index = current_index + 1

        if next_index >= len(questions):
            # All questions done — notify frontend we're on the last one still
            print(f"[TOOL] All questions completed")
            async def signal_complete_after_speech():
                await asyncio.sleep(1.0)  # give TTS time to start generating
                while session.agent_state not in ("listening", "idle", "initializing"):
                    print(session.agent_state)
                    await asyncio.sleep(0.5)
                
                await asyncio.sleep(0.5)  # small buffer after state change
                payload = json.dumps({"type": "interview_complete"}).encode("utf-8")
                await ctx.room.local_participant.publish_data(
                    payload, reliable=True, topic="question_index",
                )
                print("[SIGNAL] Sent interview_complete to frontend")

            asyncio.create_task(signal_complete_after_speech())
            return "All questions have been answered. Thank the user and tell them that interview is over. End the interview."

        # Advance state
        state["question_index"] = next_index
        next_q = questions[next_index]
        print(f"[TRACKER] Advanced to Q{next_q['id']}")

        # Notify frontend via DataChannel
        payload = json.dumps({
            "type": "question_index",
            "index": next_index,
        }).encode("utf-8")
        await ctx.room.local_participant.publish_data(
            payload,
            reliable=True,
            topic="question_index",
        )

        return f"Response saved. Now ask question {next_index + 1}: {next_q['text']}"

    @session.on("conversation_item_added")
    def on_agent_spoke(event):
        if not hasattr(event.item, "role"):
            return
        if event.item.role != "assistant":
            return
        print(f"[AGENT] {event.item.text_content}")

    agent = Agent(instructions=instructions, tools=[advance_question])
    await session.start(agent=agent, room=ctx.room)
    await session.generate_reply(
        instructions="Greet the user warmly and ask the first question."
    )

    disconnect_event = asyncio.Event()

    @ctx.room.on("disconnected")
    def on_disconnected(*args):
        disconnect_event.set()

    await disconnect_event.wait()

    try:
        await mark_complete(session_id)
    except Exception as e:
        logger.error(f"Failed to mark complete: {e}")


if __name__ == "__main__":
    cli.run_app(WorkerOptions(
        entrypoint_fnc=entrypoint,
        agent_name="interview-agent",
        load_threshold=0.9,
    ))