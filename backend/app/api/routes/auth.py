from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.schemas.auth import LoginRequest, TokenResponse, AdminOut
from app.services.auth_service import AuthService
from app.api.dependencies import get_current_admin
from app.models.admin import Admin

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=TokenResponse)
async def login(data: LoginRequest, db: AsyncSession = Depends(get_db)):
    service = AuthService(db)
    return await service.login(data)


@router.get("/me", response_model=AdminOut)
async def get_me(current_admin: Admin = Depends(get_current_admin)):
    return current_admin
