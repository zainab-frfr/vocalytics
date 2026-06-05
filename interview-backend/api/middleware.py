import os
from functools import wraps
from flask import request, jsonify, g
from api.db import get_supabase, _reset_client


def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return jsonify({"error": "Missing or invalid Authorization header"}), 401
        token = auth_header.split(" ", 1)[1].strip()

        # Try auth, retry once on connection errors
        for attempt in range(2):
            try:
                supabase = get_supabase()
                result = supabase.auth.get_user(token)
                if not result or not result.user:
                    raise ValueError("No user returned")
                g.user = result.user
                break  # success
            except Exception as e:
                error_str = str(e)
                is_connection_error = any(kw in error_str or kw in type(e).__name__ for kw in [
                    "RemoteProtocolError", "Server disconnected", "WriteError",
                    "EOF occurred", "ReadError", "ConnectError", "ConnectionTerminated",
                ])
                if is_connection_error and attempt == 0:
                    _reset_client()  # force fresh client and retry
                    continue
                # Not a connection error, or second attempt failed
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