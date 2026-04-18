from datetime import datetime, timezone
from flask import Blueprint, jsonify
from api.db import get_supabase
from api.middleware import require_internal_key

internal_bp = Blueprint("internal", __name__)


@internal_bp.get("/interviews/<interview_id>/questions")
@require_internal_key
def get_questions(interview_id: str):
    try:
        supabase = get_supabase()
        result = (
            supabase.table("interviews")
            .select("id, title, questions")
            .eq("id", interview_id)
            .single()
            .execute()
        )
        if not result.data:
            return jsonify({"error": "Interview not found"}), 404
        interview = result.data
        questions = sorted(interview["questions"], key=lambda q: q.get("order", 0))
        return jsonify({
            "interview_id": interview["id"],
            "title":        interview["title"],
            "questions":    questions,
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@internal_bp.post("/sessions/<session_id>/complete")
@require_internal_key
def complete_session(session_id: str):
    try:
        supabase = get_supabase()
        existing = (
            supabase.table("interview_sessions")
            .select("id, status")
            .eq("id", session_id)
            .single()
            .execute()
        )
        if not existing.data:
            return jsonify({"error": "Session not found"}), 404
        now = datetime.now(timezone.utc).isoformat()
        supabase.table("interview_sessions").update({
            "status":       "completed",
            "completed_at": now,
        }).eq("id", session_id).execute()
        return jsonify({"message": "Session marked as completed"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
