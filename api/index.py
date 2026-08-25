"""
Vercel serverless function entrypoint.
This file re-exports the FastAPI application from the backend package
so that Vercel's @vercel/python runtime can discover and serve it.
"""
import sys
import os

# Add the backend directory to the Python path so that
# "from app.xxx import yyy" imports resolve correctly.
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from app.main import app  # noqa: E402, F401
