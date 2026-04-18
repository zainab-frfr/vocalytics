#!/bin/bash
# Start the agent worker in the background
python agent/agent.py start &

# Start the Flask API in the foreground
gunicorn "api.app:app" --bind 0.0.0.0:$PORT --workers 2 --timeout 60
