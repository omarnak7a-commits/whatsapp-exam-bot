from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import settings
from app.db.session import get_db
from app.repositories.admin_repository import AdminRepository
from app.models.admin import Admin

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login")


async def get_current_admin(
    token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)
) -> Admin:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="غير المصرح به (رمز الجلسة غير صالحة)",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    repo = AdminRepository(db)
    admin = await repo.get_by_email(email)
    if admin is None or not admin.is_active:
        raise credentials_exception
    return admin
