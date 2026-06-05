from flask import Blueprint, request, jsonify, g
from api.db import get_supabase, invalidate_all, get_interviews, get_interview, get_interview_sessions, _execute_with_retry
from api.middleware import require_auth

interviews_bp = Blueprint("interviews", __name__)


@interviews_bp.post("/")
@require_auth
def create_interview():
    body = request.get_json(silent=True) or {}
    title       = (body.get("title") or "").strip()
    description = (body.get("description") or "").strip()
    questions   = body.get("questions") or []
    if not title:
        return jsonify({"error": "title is required"}), 400
    if not isinstance(questions, list) or len(questions) == 0:
        return jsonify({"error": "at least one question is required"}), 400
    for i, q in enumerate(questions):
        if not isinstance(q, dict):
            return jsonify({"error": f"question[{i}] must be an object"}), 400
        if not q.get("id") or not q.get("text"):
            return jsonify({"error": f"question[{i}] must have 'id' and 'text'"}), 400
        q.setdefault("type", "general")
        q.setdefault("order", i + 1)
    try:
        result = _execute_with_retry(
            lambda: get_supabase().table("interviews").insert({
                "creator_id":  str(g.user.id),
                "title":       title,
                "description": description or None,
                "questions":   questions,
                "prompt":      body.get("prompt") or None,
                "language":    body.get("language") or "ur",
            }).execute()
        )
        invalidate_all()
        return jsonify({"interview": result.data[0]}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@interviews_bp.get("/")
@require_auth
def list_interviews():
    try:
        interviews = get_interviews(str(g.user.id))  # ← cached
        return jsonify({"interviews": interviews}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@interviews_bp.get("/<interview_id>")
@require_auth
def get_interview_route(interview_id: str):
    try:
        interview = get_interview(interview_id)  # ← cached
        if not interview:
            return jsonify({"error": "Interview not found"}), 404
        # ownership check
        if interview.get("creator_id") != str(g.user.id):
            return jsonify({"error": "Interview not found"}), 404
        return jsonify({"interview": interview}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@interviews_bp.delete("/<interview_id>")
@require_auth
def delete_interview(interview_id: str):
    try:
        existing = _execute_with_retry(
            lambda: get_supabase().table("interviews")
                .select("id").eq("id", interview_id)
                .eq("creator_id", str(g.user.id)).single().execute()
        )
        if not existing.data:
            return jsonify({"error": "Interview not found"}), 404
        _execute_with_retry(
            lambda: get_supabase().table("interviews")
                .delete().eq("id", interview_id).execute()
        )
        invalidate_all()
        return jsonify({"message": "Interview deleted"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@interviews_bp.get("/<interview_id>/sessions")
@require_auth
def get_interview_sessions_route(interview_id: str):
    try:
        interview = get_interview(interview_id)  # ← cached
        if not interview or interview.get("creator_id") != str(g.user.id):
            return jsonify({"error": "Interview not found"}), 404
        sessions = get_interview_sessions(interview_id)  # ← cached
        return jsonify({"sessions": sessions}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500