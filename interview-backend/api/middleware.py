import os
from functools import wraps
from flask import request, jsonify, g
from api.db import get_supabase


def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return jsonify({"error": "Missing or invalid Authorization header"}), 401
        token = auth_header.split(" ", 1)[1].strip()
        try:
            supabase = get_supabase()
            result = supabase.auth.get_user(token)
            if not result or not result.user:
                raise ValueError("No user returned")
            g.user = result.user
        except Exception:
            return jsonify({"error": "Invalid or expired token"}), 401
        return f(*args, **kwargs)
    return decorated


def require_internal_key(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        key = request.headers.get("X-Internal-API-Key", "")
        if not key or key != os.environ["INTERNAL_API_KEY"]:
            return jsonify({"error": "Unauthorized"}), 401
        return f(*args, **kwargs)
    return decorated
