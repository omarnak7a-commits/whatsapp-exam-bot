from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.routes import auth, exams, questions, students, results, public
from app.db.session import engine, Base
from app.core.logging import logger
from app.db.base import Base as BaseModels  # ensure models are imported


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing database tables for جبت كام؟ platform...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database initialization complete.")
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

# Register API Routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(exams.router, prefix=settings.API_V1_STR)
app.include_router(questions.router, prefix=settings.API_V1_STR)
app.include_router(students.router, prefix=settings.API_V1_STR)
app.include_router(results.router, prefix=settings.API_V1_STR)
app.include_router(public.router, prefix=settings.API_V1_STR)

# Legacy WhatsApp route isolated - not included in active flow
# If needed, can be re-enabled via env flag
import os
if os.getenv("ENABLE_WHATSAPP", "false").lower() == "true":
    from app.api.routes import whatsapp
    app.include_router(whatsapp.router, prefix=settings.API_V1_STR)
    logger.info("WhatsApp webhook route enabled (legacy mode)")


@app.get("/")
async def root():
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
