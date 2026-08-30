from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.models.student import Student


class StudentRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, student_id: int) -> Optional[Student]:
        query = select(Student).where(Student.id == student_id)
        result = await self.db.execute(query)
        return result.scalars().first()

    async def get_by_name(self, name: str) -> Optional[Student]:
        query = select(Student).where(Student.name == name)
        result = await self.db.execute(query)
        return result.scalars().first()

    async def get_by_whatsapp(self, whatsapp_number: str) -> Optional[Student]:
        query = select(Student).where(Student.whatsapp_number == whatsapp_number)
        result = await self.db.execute(query)
        return result.scalars().first()

    async def create(self, student: Student) -> Student:
        self.db.add(student)
        await self.db.flush()
        await self.db.refresh(student)
        return student

    async def get_all(self) -> List[Student]:
        query = select(Student).order_by(Student.created_at.desc()).options(selectinload(Student.attempts))
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def find_or_create_by_name(self, name: str) -> Student:
        existing = await self.get_by_name(name)
        if existing:
            return existing
        student = Student(name=name)
        return await self.create(student)
