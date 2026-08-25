from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from app.models.exam import Exam, ExamStatus
from app.models.question import Question
from app.models.exam_attempt import ExamAttempt


class ExamRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, exam_id: int, include_questions: bool = False) -> Optional[Exam]:
        query = select(Exam).where(Exam.id == exam_id)
        if include_questions:
            query = query.options(
                selectinload(Exam.questions).selectinload(Question.options)
            )
        result = await self.db.execute(query)
        return result.scalars().first()

    async def get_all(self, status: Optional[str] = None) -> List[Exam]:
        query = select(Exam).order_by(Exam.created_at.desc())
        if status:
            query = query.where(Exam.status == status)
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_published_active(self) -> Optional[Exam]:
        query = select(Exam).where(Exam.status == ExamStatus.PUBLISHED.value).order_by(Exam.published_at.desc())
        result = await self.db.execute(query)
        return result.scalars().first()

    async def create(self, exam: Exam) -> Exam:
        self.db.add(exam)
        await self.db.flush()
        await self.db.refresh(exam)
        return exam

    async def update(self, exam: Exam) -> Exam:
        await self.db.flush()
        await self.db.refresh(exam)
        return exam

    async def delete(self, exam: Exam) -> None:
        await self.db.delete(exam)
        await self.db.flush()

    async def get_questions_count(self, exam_id: int) -> int:
        result = await self.db.execute(
            select(func.count(Question.id)).where(Question.exam_id == exam_id)
        )
        return result.scalar() or 0

    async def get_attempts_count(self, exam_id: int) -> int:
        result = await self.db.execute(
            select(func.count(ExamAttempt.id)).where(ExamAttempt.exam_id == exam_id)
        )
        return result.scalar() or 0
