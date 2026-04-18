import os
from flask import Flask, jsonify
from flask_cors import CORS

from api.auth import auth_bp
from api.interviews import interviews_bp
from api.sessions import sessions_bp
from api.internal import internal_bp

from dotenv import load_dotenv
load_dotenv(".env.local")

def create_app() -> Flask:
    app = Flask(__name__)
    CORS(app, resources={r"/*": {"origins": os.environ.get("CORS_ORIGIN", "*")}})

    app.register_blueprint(auth_bp,       url_prefix="/auth")
    app.register_blueprint(interviews_bp, url_prefix="/interviews")
    app.register_blueprint(sessions_bp,   url_prefix="/sessions")
    app.register_blueprint(internal_bp,   url_prefix="/internal")

    @app.get("/health")
    def health():
        return jsonify({"status": "ok"}), 200

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"error": "Not found"}), 404

    @app.errorhandler(405)
    def method_not_allowed(e):
        return jsonify({"error": "Method not allowed"}), 405

    @app.errorhandler(500)
    def internal_error(e):
        return jsonify({"error": "Internal server error"}), 500

    return app


app = create_app()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)), debug=False)
