from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.admin import Admin


class AdminRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_email(self, email: str) -> Optional[Admin]:
        result = await self.db.execute(select(Admin).where(Admin.email == email))
        return result.scalars().first()

    async def create(self, admin: Admin) -> Admin:
        self.db.add(admin)
        await self.db.flush()
        await self.db.refresh(admin)
        return admin
