from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.schemas.auth import LoginRequest, TokenResponse, AdminOut
from app.services.auth_service import AuthService
from app.api.dependencies import get_current_admin
from app.core.security import verify_password, get_password_hash
from app.models.admin import Admin
from app.seed import ensure_admin_in_session

router = APIRouter(prefix="/auth", tags=["Authentication"])


class ProfileUpdate(BaseModel):
    name: str | None = Field(None, min_length=2, max_length=255)
    email: EmailStr | None = None


class PasswordUpdate(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=6, max_length=128)


@router.post("/login", response_model=TokenResponse)
async def login(data: LoginRequest, db: AsyncSession = Depends(get_db)):
    # Auto-seed: guarantee the default admin exists before authenticating.
    # Idempotent - a no-op when the admin is already present (e.g. serverless cold starts).
    await ensure_admin_in_session(db)
    service = AuthService(db)
    return await service.login(data)


@router.post("/logout")
async def logout(current_admin: Admin = Depends(get_current_admin)):
    # JWT is stateless - the client discards its token. Endpoint exists for
    # API completeness and to let the UI confirm the session end.
    return {"message": "تم تسجيل الخروج بنجاح"}


@router.get("/me", response_model=AdminOut)
async def get_me(current_admin: Admin = Depends(get_current_admin)):
    return current_admin


@router.put("/profile", response_model=AdminOut)
async def update_profile(
    data: ProfileUpdate,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    if data.name is not None:
        current_admin.name = data.name.strip()
    if data.email is not None:
        new_email = str(data.email).strip().lower()
        if new_email != current_admin.email:
            existing = (await db.execute(select(Admin).where(Admin.email == new_email))).scalars().first()
            if existing:
                raise HTTPException(status_code=400, detail="البريد الإلكتروني مستخدم بالفعل")
            current_admin.email = new_email
    await db.flush()
    await db.refresh(current_admin)
    return current_admin


@router.put("/password")
async def update_password(
    data: PasswordUpdate,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    if not verify_password(data.current_password, current_admin.password_hash):
        raise HTTPException(status_code=400, detail="كلمة المرور الحالية غير صحيحة")
    current_admin.password_hash = get_password_hash(data.new_password)
    await db.flush()
    return {"message": "تم تغيير كلمة المرور بنجاح"}
