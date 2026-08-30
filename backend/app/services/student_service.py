import re
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.student_repository import StudentRepository
from app.models.student import Student
from app.models.exam_attempt import AttemptStatus


def normalize_name(name: str) -> str:
    return name.strip()


class StudentService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = StudentRepository(db)

    async def get_or_create_student_by_name(self, name: str) -> Student:
        name = normalize_name(name)
        if len(name) < 2:
            raise ValueError("الاسم قصير جداً")
        student = await self.repo.get_by_name(name)
        if not student:
            student = Student(name=name, is_active=True)
            student = await self.repo.create(student)
        return student

    # Legacy WhatsApp method kept for compatibility
    async def get_or_create_student(self, whatsapp_number: str, default_name: Optional[str] = None) -> Student:
        from app.repositories.student_repository import StudentRepository
        # Try whatsapp first
        cleaned = re.sub(r"\D", "", whatsapp_number)
        student = await self.repo.get_by_whatsapp(cleaned)
        if student:
            return student
        # Fallback to name
        if default_name:
            return await self.get_or_create_student_by_name(default_name)
        name = f"طالب ({cleaned[-4:]})" if cleaned else "طالب"
        return await self.get_or_create_student_by_name(name)

    async def list_students(self):
        # This is handled in route now with aggregation
        students = await self.repo.get_all()
        return students
