"""
CLI entrypoint for the full seed (admin + sample exam).

Usage (from backend/):
    python seed.py
    python -m app.seed
"""
import asyncio

from app.seed import seed_data

if __name__ == "__main__":
    asyncio.run(seed_data())
