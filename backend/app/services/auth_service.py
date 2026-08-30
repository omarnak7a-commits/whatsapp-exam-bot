from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status
from app.repositories.admin_repository import AdminRepository
from app.schemas.auth import LoginRequest, TokenResponse, AdminCreate
from app.core.security import verify_password, get_password_hash, create_access_token
from app.models.admin import Admin


class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = AdminRepository(db)

    async def login(self, data: LoginRequest) -> TokenResponse:
        admin = await self.repo.get_by_email(str(data.email).strip().lower())
        if not admin or not verify_password(data.password, admin.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="البريد الإلكتروني أو كلمة المرور غير صحيحة",
            )
        if not admin.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="الحساب معطل",
            )

        token = create_access_token(subject=admin.email)
        return TokenResponse(
            access_token=token,
            admin_name=admin.name,
            admin_email=admin.email,
        )

    async def create_admin(self, data: AdminCreate) -> Admin:
        existing = await self.repo.get_by_email(data.email)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="البريد الإلكتروني مستخدم بالفعل",
            )
        admin = Admin(
            name=data.name,
            email=data.email,
            password_hash=get_password_hash(data.password),
        )
        return await self.repo.create(admin)
