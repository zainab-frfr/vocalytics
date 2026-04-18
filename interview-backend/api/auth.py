from flask import Blueprint, request, jsonify
from api.db import get_supabase

auth_bp = Blueprint("auth", __name__)


@auth_bp.post("/signup")
def signup():
    body = request.get_json(silent=True) or {}
    email    = (body.get("email") or "").strip().lower()
    password = (body.get("password") or "").strip()
    if not email or not password:
        return jsonify({"error": "email and password are required"}), 400
    if len(password) < 8:
        return jsonify({"error": "password must be at least 8 characters"}), 400
    try:
        supabase = get_supabase()
        result = supabase.auth.sign_up({"email": email, "password": password})
        if not result.user:
            return jsonify({"error": "Signup failed"}), 400
        return jsonify({
            "message": "Account created. Check your email to confirm.",
            "user": {"id": str(result.user.id), "email": result.user.email}
        }), 201
    except Exception as e:
        msg = str(e)
        if "already registered" in msg.lower() or "already exists" in msg.lower():
            return jsonify({"error": "Email already registered"}), 409
        return jsonify({"error": msg}), 400


@auth_bp.post("/login")
def login():
    body = request.get_json(silent=True) or {}
    email    = (body.get("email") or "").strip().lower()
    password = (body.get("password") or "").strip()
    if not email or not password:
        return jsonify({"error": "email and password are required"}), 400
    try:
        supabase = get_supabase()
        result = supabase.auth.sign_in_with_password({"email": email, "password": password})
        if not result.session:
            return jsonify({"error": "Login failed"}), 401
        return jsonify({
            "access_token":  result.session.access_token,
            "refresh_token": result.session.refresh_token,
            "expires_in":    result.session.expires_in,
            "user": {"id": str(result.user.id), "email": result.user.email}
        }), 200
    except Exception:
        return jsonify({"error": "Invalid email or password"}), 401


@auth_bp.post("/refresh")
def refresh():
    body = request.get_json(silent=True) or {}
    refresh_token = body.get("refresh_token", "").strip()
    if not refresh_token:
        return jsonify({"error": "refresh_token is required"}), 400
    try:
        supabase = get_supabase()
        result = supabase.auth.refresh_session(refresh_token)
        return jsonify({
            "access_token":  result.session.access_token,
            "refresh_token": result.session.refresh_token,
            "expires_in":    result.session.expires_in,
        }), 200
    except Exception:
        return jsonify({"error": "Invalid or expired refresh token"}), 401
