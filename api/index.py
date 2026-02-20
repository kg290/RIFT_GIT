"""
Vercel Serverless Function entry point.
Wraps the FastAPI app so Vercel's Python runtime can serve it.
"""
import sys
import os

# Ensure the project root is on sys.path so `backend.*` imports work
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.api.main import app  # noqa: E402

# Vercel uses the variable named `app` or `handler`.
# FastAPI is ASGI-native — Vercel's Python runtime supports ASGI apps
# exported as `app` from api/index.py since late 2024.
