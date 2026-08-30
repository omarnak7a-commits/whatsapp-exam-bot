import asyncio
import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from sqlalchemy import text
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.config import settings
from app.api.routes import auth, exams, questions, students, results, public
from app.db.session import engine, Base
from app.core.logging import logger
from app.db.base import Base as BaseModels  # ensure models are imported
from app.seed import ensure_admin_seeded


def _find_frontend_dist() -> Path | None:
    """Locate the built React SPA (working directory or repo-relative)."""
    candidates = [
        Path(os.getcwd()) / "frontend" / "dist",
        Path(__file__).resolve().parents[2] / "frontend" / "dist",
    ]
    for candidate in candidates:
        if (candidate / "index.html").is_file():
            return candidate
    return None


FRONTEND_DIST: Path | None = _find_frontend_dist()
if FRONTEND_DIST:
    logger.info("Serving frontend SPA from %s", FRONTEND_DIST)
else:
    logger.warning(
        "frontend/dist not found - SPA fallback disabled (API only). "
        "Run `npm run build` inside frontend/ (committed dist is bundled on Vercel)."
    )


# Columns that were added by the ORM models but may be missing on databases that
# were created before the web-platform schema evolved (e.g. the live Vercel DB).
# Each fix is idempotent and isolated so a single failure never blocks startup.
# NOTE: default expressions must be valid on BOTH PostgreSQL and SQLite
# (PostgreSQL rejects `DEFAULT 0` for BOOLEAN columns - use TRUE/FALSE).
SCHEMA_FIXES: dict[str, list[tuple[str, str, str | None]]] = {
    "exams": [
        ("public_slug", "VARCHAR(100)", None),
        ("duration_minutes", "INTEGER", "20"),
        ("instant_feedback_enabled", "BOOLEAN", "FALSE"),
        ("show_correct_answers", "BOOLEAN", "TRUE"),
        ("leaderboard_enabled", "BOOLEAN", "TRUE"),
    ],
    "questions": [
        ("text", "TEXT", None),
        ("points", "INTEGER", "1"),
        ("question_type", "VARCHAR(20)", "'multiple_choice'"),
    ],
    "options": [
        ("text", "VARCHAR(1000)", None),
    ],
    "exam_attempts": [
        ("submitted_at", "DATETIME", None),
        ("total_score", "INTEGER", "0"),
        ("completion_time_seconds", "INTEGER", "0"),
        ("ranking", "INTEGER", None),
    ],
    "attempt_answers": [
        ("option_id", "INTEGER", None),
        ("points_awarded", "INTEGER", "0"),
    ],
}


async def _existing_columns(conn, table: str) -> set[str]:
    """Return the set of existing column names for a table."""
    if conn.dialect.name == "sqlite":
        res = await conn.execute(text(f"PRAGMA table_info({table})"))
        return {str(row[1]) for row in res.fetchall()}
    # PostgreSQL / generic: query information_schema.
    res = await conn.execute(
        text(
            "SELECT column_name FROM information_schema.columns "
            "WHERE table_name = :t"
        ),
        {"t": table},
    )
    return {str(row[0]) for row in res.fetchall()}


async def _apply_schema_fixes(conn) -> None:
    """Ensure every expected column exists (dialect-aware, idempotent).

    PostgreSQL supports `ADD COLUMN IF NOT EXISTS` natively; SQLite's bundled
    version does not, so there we check existing columns first and only issue
    plain `ALTER TABLE ... ADD COLUMN` for the missing ones.
    """
    dialect = conn.dialect.name
    for table, columns in SCHEMA_FIXES.items():
        existing = await _existing_columns(conn, table)
        for column, col_type, default in columns:
            if column in existing:
                continue
            default_clause = f" DEFAULT {default}" if default is not None else ""
            if dialect == "sqlite":
                stmt = f"ALTER TABLE {table} ADD COLUMN {column} {col_type}{default_clause}"
            else:
                stmt = (
                    f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS "
                    f"{column} {col_type}{default_clause}"
                )
            try:
                await conn.execute(text(stmt))
                logger.info("Schema fix applied: %s.%s", table, column)
            except Exception as e:  # noqa: BLE001
                # Column already exists, DB flavour quirk, or permission issue.
                logger.warning(
                    "Schema fix skipped for %s.%s: %s", table, column, e
                )


async def _ensure_schema_on_conn(conn) -> None:
    await conn.run_sync(Base.metadata.create_all)
    await _apply_schema_fixes(conn)


# ---------------------------------------------------------------------------
# Serverless-safe schema bootstrap.
#
# Vercel's Python runtime does NOT run FastAPI `lifespan` events, so on
# production the old lifespan-only bootstrap never executed and the live
# database stayed behind the ORM models (missing columns -> 500 on writes).
# `ensure_schema_ready()` also runs once per process on the first HTTP
# request (cold start), which covers serverless runtimes.
# ---------------------------------------------------------------------------
_schema_state = {"done": False, "attempted": False}
_schema_lock: asyncio.Lock | None = None


async def ensure_schema_ready() -> None:
    global _schema_lock
    if _schema_state["done"]:
        return
    if _schema_lock is None:
        _schema_lock = asyncio.Lock()
    async with _schema_lock:
        if _schema_state["done"] or _schema_state["attempted"]:
            return
        _schema_state["attempted"] = True
        try:
            async with engine.begin() as conn:
                await _ensure_schema_on_conn(conn)
            _schema_state["done"] = True
            logger.info("Schema ensured (tables + missing columns)")
        except Exception as e:  # noqa: BLE001
            # Keep the app serving; the real error stays in the logs.
            logger.error("Schema ensure failed: %r", e)


async def _seed_admin() -> None:
    try:
        admin = await ensure_admin_seeded()
        logger.info("Admin ready: %s", admin.email)
    except Exception as e:  # noqa: BLE001
        logger.warning("Admin seed skipped: %r", e)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await ensure_schema_ready()
    await _seed_admin()
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="منصة جبت كام؟ - امتحن، اعرف نتيجتك، وشوف ترتيبك",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    lifespan=lifespan,
)

# CORS Middleware Setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS + ["*"] if not settings.is_production else settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def serverless_bootstrap_middleware(request: Request, call_next):
    """Run the DB bootstrap once per process on first request.

    Required because serverless platforms (Vercel) never fire lifespan events.
    After the first request this is a single boolean check.
    """
    if not _schema_state["done"] and request.url.path.startswith("/api/"):
        await ensure_schema_ready()
    return await call_next(request)


# ---------------------------------------------------------------------------
# Error handling: keep friendly Arabic details for clients, log the real
# exception server-side so production logs show the true cause.
# ---------------------------------------------------------------------------
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    if exc.status_code >= 500:
        logger.error("HTTP %s on %s %s: %r", exc.status_code, request.method, request.url.path, exc.detail)
    detail = exc.detail
    if not isinstance(detail, str):
        detail = "حدث خطأ، حاول مرة أخرى"
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": detail},
        headers=getattr(exc, "headers", None),
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.warning("Validation error on %s %s: %s", request.method, request.url.path, exc.errors())
    return JSONResponse(
        status_code=422,
        content={"detail": "تحقق من صحة البيانات المدخلة"},
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    # Full traceback in server logs; generic friendly message for clients.
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content={"detail": "حدث خطأ، حاول مرة أخرى"},
    )


# Register API Routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(exams.router, prefix=settings.API_V1_STR)
app.include_router(questions.router, prefix=settings.API_V1_STR)
app.include_router(students.router, prefix=settings.API_V1_STR)
app.include_router(results.router, prefix=settings.API_V1_STR)
app.include_router(public.router, prefix=settings.API_V1_STR)

# Legacy WhatsApp route isolated - not included in active flow
# If needed, can be re-enabled via env flag
if os.getenv("ENABLE_WHATSAPP", "false").lower() == "true":
    from app.api.routes import whatsapp
    app.include_router(whatsapp.router, prefix=settings.API_V1_STR)
    logger.info("WhatsApp webhook route enabled (legacy mode)")


@app.get("/")
async def root():
    if FRONTEND_DIST:
        # Serve the SPA at the root (Vercel FastAPI preset routes every request here).
        return FileResponse(FRONTEND_DIST / "index.html")
    return {
        "app": settings.PROJECT_NAME,
        "tagline": "امتحن، اعرف نتيجتك، وشوف ترتيبك",
        "status": "online",
        "docs": "/api/docs",
        "version": "2.0.0 - جبت كام؟ Web Platform",
    }


@app.get("/health")
async def health():
    return {"status": "healthy"}


@app.get("/{full_path:path}", include_in_schema=False)
async def spa_fallback(full_path: str):
    """
    SPA fallback: serve static assets from frontend/dist and return index.html
    for client-side routes (e.g. /admin, /admin/login, /exam/{slug}).

    On Vercel, when the FastAPI framework preset is detected, every request is
    routed to this app - this route keeps the React frontend working there.
    """
    if full_path == "api" or full_path.startswith("api/"):
        # Unknown API paths should stay JSON 404, not return HTML.
        raise HTTPException(status_code=404, detail="Not Found")

    if FRONTEND_DIST is None:
        raise HTTPException(status_code=404, detail="Not Found")

    root_dir = FRONTEND_DIST.resolve()
    candidate = (root_dir / full_path).resolve()
    if (
        candidate.is_file()
        and str(candidate).startswith(str(root_dir) + os.sep)
    ):
        return FileResponse(candidate)

    return FileResponse(root_dir / "index.html")
