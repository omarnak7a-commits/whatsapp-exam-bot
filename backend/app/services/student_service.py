import re
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.student_repository import StudentRepository
from app.schemas.student import StudentOut
from app.models.student import Student
from app.models.exam_attempt import AttemptStatus


def normalize_whatsapp_number(number: str) -> str:
    cleaned = re.sub(r"\D", "", number)
    if cleaned.startswith("00"):
        cleaned = cleaned[2:]
    return cleaned


class StudentService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = StudentRepository(db)

    async def get_or_create_student(self, whatsapp_number: str, default_name: Optional[str] = None) -> Student:
        norm_number = normalize_whatsapp_number(whatsapp_number)
        student = await self.repo.get_by_whatsapp(norm_number)
        if not student:
            name = default_name if default_name else f"طالب ({norm_number[-4:]})"
            student = Student(
                name=name,
                whatsapp_number=norm_number,
                is_active=True,
            )
            student = await self.repo.create(student)
        return student

    async def list_students(self) -> List[StudentOut]:
        students = await self.repo.get_all()
        result = []
        for s in students:
            completed_attempts = [a for a in s.attempts if a.status == AttemptStatus.COMPLETED.value]
            total_att = len(completed_attempts)
            avg_score = (
                sum(a.percentage for a in completed_attempts) / total_att
                if total_att > 0
                else 0.0
            )
            best_score = (
                max((a.percentage for a in completed_attempts), default=0.0)
                if total_att > 0
                else 0.0
            )
            dto = StudentOut.model_validate(s)
            dto.total_attempts = total_att
            dto.average_score = round(avg_score, 1)
            dto.best_score = round(best_score, 1)
            result.append(dto)
        return result
