import os
from typing import List, Union
from pydantic import AnyHttpUrl
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "WhatsApp Exam Bot"
    API_V1_STR: str = "/api"
    SECRET_KEY: str = "supersecretkey_change_me_in_production_123456789"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./whatsapp_exam.db"

    # WhatsApp Meta Cloud API Settings
    WHATSAPP_ACCESS_TOKEN: str = "MOCK_TOKEN"
    WHATSAPP_PHONE_NUMBER_ID: str = "MOCK_PHONE_ID"
    WHATSAPP_VERIFY_TOKEN: str = "MOCK_VERIFY_TOKEN"
    WHATSAPP_API_VERSION: str = "v19.0"

    BACKEND_URL: str = "http://localhost:8000"
    FRONTEND_URL: str = "http://localhost:5173"

    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
    ]

    model_config = SettingsConfigDict(
        case_sensitive=True,
        env_file=".env",
        extra="ignore",
    )


settings = Settings()
