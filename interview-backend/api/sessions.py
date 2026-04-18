import asyncio
import json
import os
import uuid

from flask import Blueprint, request, jsonify, g
from livekit import api as lkapi

from api.db import get_supabase
from api.middleware import require_auth

sessions_bp = Blueprint("sessions", __name__)


def _livekit_api():
    return lkapi.LiveKitAPI(
        url=os.environ["LIVEKIT_URL"],
        api_key=os.environ["LIVEKIT_API_KEY"],
        api_secret=os.environ["LIVEKIT_API_SECRET"],
    )


def _create_room_and_dispatch(room_name: str, interview_id: str, session_id: str):
    async def _run():
        lk = _livekit_api()
        try:
            await lk.room.create_room(
                lkapi.CreateRoomRequest(
                    name=room_name,
                    empty_timeout=300,
                    max_participants=2,
                )
            )
            await lk.agent_dispatch.create_dispatch(
                lkapi.CreateAgentDispatchRequest(
                    agent_name="interview-agent",
                    room=room_name,
                    metadata=json.dumps({
                        "interview_id": interview_id,
                        "session_id":   session_id,
                    }),
                )
            )
        finally:
            await lk.aclose()
    asyncio.run(_run())


def _make_participant_token(room_name: str, identity: str, display_name: str) -> str:
    token = lkapi.AccessToken(
        api_key=os.environ["LIVEKIT_API_KEY"],
        api_secret=os.environ["LIVEKIT_API_SECRET"],
    )
    token.with_identity(identity)
    token.with_name(display_name)
    token.with_grants(
        lkapi.VideoGrants(
            room_join=True,
            room=room_name,
            can_publish=True,
            can_subscribe=True,
        )
    )
    return token.to_jwt()


@sessions_bp.post("/start")
def start_session():
    body = request.get_json(silent=True) or {}
    interview_id    = (body.get("interview_id") or "").strip()
    respondent_name = (body.get("respondent_name") or "Respondent").strip()
    if not interview_id:
        return jsonify({"error": "interview_id is required"}), 400
    supabase = get_supabase()
    try:
        interview_result = (
            supabase.table("interviews")
            .select("id, title")
            .eq("id", interview_id)
            .single()
            .execute()
        )
        if not interview_result.data:
            return jsonify({"error": "Interview not found"}), 404
    except Exception:
        return jsonify({"error": "Interview not found"}), 404
    room_name = f"interview-{interview_id[:8]}-{uuid.uuid4().hex[:8]}"
    try:
        session_result = (
            supabase.table("interview_sessions")
            .insert({
                "interview_id":    interview_id,
                "room_name":       room_name,
                "status":          "pending",
                "respondent_name": respondent_name,
            })
            .execute()
        )
        session = session_result.data[0]
        session_id = session["id"]
    except Exception as e:
        return jsonify({"error": f"Failed to create session: {str(e)}"}), 500
    try:
        _create_room_and_dispatch(room_name, interview_id, session_id)
    except Exception as e:
        supabase.table("interview_sessions").delete().eq("id", session_id).execute()
        return jsonify({"error": f"Failed to start LiveKit session: {str(e)}"}), 500
    identity = f"respondent-{uuid.uuid4().hex[:6]}"
    token = _make_participant_token(room_name, identity, respondent_name)
    supabase.table("interview_sessions").update({"status": "active"}).eq("id", session_id).execute()
    return jsonify({
        "session_id":    session_id,
        "room_name":     room_name,
        "livekit_token": token,
        "livekit_url":   os.environ["LIVEKIT_URL"],
    }), 200


@sessions_bp.get("/<session_id>/responses")
@require_auth
def get_session_responses(session_id: str):
    supabase = get_supabase()
    try:
        session_result = (
            supabase.table("interview_sessions")
            .select("id, interview_id, status, respondent_name, created_at, completed_at")
            .eq("id", session_id)
            .single()
            .execute()
        )
        if not session_result.data:
            return jsonify({"error": "Session not found"}), 404
        session = session_result.data
    except Exception:
        return jsonify({"error": "Session not found"}), 404
    owner_check = (
        supabase.table("interviews")
        .select("id")
        .eq("id", session["interview_id"])
        .eq("creator_id", str(g.user.id))
        .single()
        .execute()
    )
    if not owner_check.data:
        return jsonify({"error": "Forbidden"}), 403
    responses_result = (
        supabase.table("responses")
        .select("question_id, question_text, response, created_at")
        .eq("session_id", session_id)
        .order("created_at")
        .execute()
    )
    return jsonify({"session": session, "responses": responses_result.data}), 200
