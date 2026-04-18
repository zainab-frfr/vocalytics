import asyncio
import json
import logging
import os

import aiohttp
from dotenv import load_dotenv
from livekit.agents import Agent, AgentServer, AgentSession, JobContext, cli
from livekit.plugins import azure, deepgram, groq, silero
from supabase import AsyncClient, acreate_client

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

server = AgentServer()


async def fetch_questions(interview_id: str) -> list[dict]:
    url = f"{INTERNAL_API_URL}/internal/interviews/{interview_id}/questions"
    headers = {"X-Internal-API-Key": INTERNAL_API_KEY}
    async with aiohttp.ClientSession() as http:
        async with http.get(url, headers=headers, timeout=aiohttp.ClientTimeout(total=10)) as resp:
            resp.raise_for_status()
            data = await resp.json()
            return data["questions"]


async def mark_complete(session_id: str) -> None:
    url = f"{INTERNAL_API_URL}/internal/sessions/{session_id}/complete"
    headers = {"X-Internal-API-Key": INTERNAL_API_KEY}
    async with aiohttp.ClientSession() as http:
        async with http.post(url, headers=headers, timeout=aiohttp.ClientTimeout(total=10)) as resp:
            resp.raise_for_status()


async def save_response(supabase, session_id, question_id, question_text, response):
    try:
        await supabase.table("responses").insert({
            "session_id":    session_id,
            "question_id":   question_id,
            "question_text": question_text,
            "response":      response,
        }).execute()
    except Exception as e:
        logger.error(f"Failed to save response: {e}")


def build_instructions(questions: list[dict]) -> str:
    return f"""
آپ ایک پیشہ ور انٹرویو اسسٹنٹ ہیں جو ایک ریسرچ انٹرویو کر رہے ہیں۔
آپ کا مقصد نیچے دیے گئے سوالات ترتیب سے پوچھنا ہے۔

**سوالات:**
{json.dumps(questions, ensure_ascii=False, indent=2)}

**سخت اصول:**
1. صرف اردو میں بات کریں۔ آسان، روزمرہ کی زبان استعمال کریں۔
2. ایک وقت میں صرف ایک سوال پوچھیں، بالکل ویسے ہی جیسے لکھا ہے۔
3. اگلے سوال پر جانے سے پہلے صارف کا جواب سنیں۔
4. اگر جواب غیر متعلق ہو تو شائستگی سے سوال دہرائیں۔
5. صارف کا جواب کبھی نہ دہرائیں۔
6. ہر جواب کے بعد شکریہ نہ کہیں۔ صرف آخر میں شکریہ کہیں۔
7. صرف تب سوال دہرائیں جب صارف وضاحت مانگے۔
"""


def build_question_markers(questions: list[dict]) -> dict[str, str]:
    markers = {}
    for q in questions:
        text = q["text"]
        start = min(5, len(text))
        end   = min(start + 15, len(text))
        markers[q["id"]] = text[start:end]
    return markers


@server.rtc_session()
async def run_interview(ctx: JobContext):
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

    try:
        questions = await fetch_questions(interview_id)
    except Exception as e:
        logger.error(f"Failed to fetch questions: {e}")
        return

    if not questions:
        logger.error("Empty question list — aborting")
        return

    supabase: AsyncClient = await acreate_client(SUPABASE_URL, SUPABASE_KEY)

    class InterviewAgent(Agent):
        def __init__(self):
            super().__init__(instructions=build_instructions(questions))

    state = {"current_question": None, "last_saved": None}
    question_markers = build_question_markers(questions)

    session = AgentSession(
        stt=deepgram.STT(language="ur"),
        llm=groq.LLM(model="llama-3.3-70b-versatile"),
        tts=azure.TTS(voice="ur-PK-UzmaNeural"),
        vad=silero.VAD.load(),
    )

    @session.on("user_input_transcribed")
    def on_user_input(event):
        if not event.is_final:
            return
        transcript = event.transcript
        current_q  = state["current_question"]
        if current_q and state["last_saved"] != transcript:
            asyncio.create_task(
                save_response(supabase, session_id, current_q["id"], current_q["text"], transcript)
            )
            state["last_saved"] = transcript

    @session.on("conversation_item_added")
    def on_agent_spoke(event):
        if event.item.role != "assistant":
            return
        agent_text = event.item.text_content
        for q_id, marker in question_markers.items():
            if marker in agent_text:
                for q in questions:
                    if q["id"] == q_id:
                        state["current_question"] = q
                        break
                break

    await session.start(agent=InterviewAgent(), room=ctx.room)
    await session.generate_reply(
        instructions="السلام علیکم۔ صارف کو خوش آمدید کہیں۔ پھر پہلا سوال پوچھیں۔"
    )

    await ctx.wait_for_disconnect()

    try:
        await mark_complete(session_id)
    except Exception as e:
        logger.error(f"Failed to mark session complete: {e}")


if __name__ == "__main__":
    cli.run_app(server)
