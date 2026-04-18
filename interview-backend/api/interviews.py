from flask import Blueprint, request, jsonify, g
from api.db import get_supabase
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
        supabase = get_supabase()
        result = (
            supabase.table("interviews")
            .insert({
                "creator_id":  str(g.user.id),
                "title":       title,
                "description": description or None,
                "questions":   questions,
            })
            .execute()
        )
        return jsonify({"interview": result.data[0]}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@interviews_bp.get("/")
@require_auth
def list_interviews():
    try:
        supabase = get_supabase()
        result = (
            supabase.table("interviews")
            .select("id, title, description, created_at")
            .eq("creator_id", str(g.user.id))
            .order("created_at", desc=True)
            .execute()
        )
        return jsonify({"interviews": result.data}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@interviews_bp.get("/<interview_id>")
@require_auth
def get_interview(interview_id: str):
    try:
        supabase = get_supabase()
        result = (
            supabase.table("interviews")
            .select("*")
            .eq("id", interview_id)
            .eq("creator_id", str(g.user.id))
            .single()
            .execute()
        )
        if not result.data:
            return jsonify({"error": "Interview not found"}), 404
        return jsonify({"interview": result.data}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@interviews_bp.delete("/<interview_id>")
@require_auth
def delete_interview(interview_id: str):
    try:
        supabase = get_supabase()
        existing = (
            supabase.table("interviews")
            .select("id")
            .eq("id", interview_id)
            .eq("creator_id", str(g.user.id))
            .single()
            .execute()
        )
        if not existing.data:
            return jsonify({"error": "Interview not found"}), 404
        supabase.table("interviews").delete().eq("id", interview_id).execute()
        return jsonify({"message": "Interview deleted"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@interviews_bp.get("/<interview_id>/sessions")
@require_auth
def get_interview_sessions(interview_id: str):
    try:
        supabase = get_supabase()
        owner_check = (
            supabase.table("interviews")
            .select("id")
            .eq("id", interview_id)
            .eq("creator_id", str(g.user.id))
            .single()
            .execute()
        )
        if not owner_check.data:
            return jsonify({"error": "Interview not found"}), 404
        result = (
            supabase.table("interview_sessions")
            .select("id, room_name, status, respondent_name, created_at, completed_at")
            .eq("interview_id", interview_id)
            .order("created_at", desc=True)
            .execute()
        )
        return jsonify({"sessions": result.data}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
