from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload
from app.models.exam_attempt import ExamAttempt, AttemptStatus
from app.models.attempt_answer import AttemptAnswer
from app.models.student import Student
from app.models.exam import Exam


class AttemptRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, attempt_id: int) -> Optional[ExamAttempt]:
        query = (
            select(ExamAttempt)
            .where(ExamAttempt.id == attempt_id)
            .options(
                selectinload(ExamAttempt.student),
                selectinload(ExamAttempt.exam),
                selectinload(ExamAttempt.answers),
            )
        )
        result = await self.db.execute(query)
        return result.scalars().first()

    async def get_active_attempt(self, student_id: int, exam_id: int) -> Optional[ExamAttempt]:
        query = (
            select(ExamAttempt)
            .where(
                and_(
                    ExamAttempt.student_id == student_id,
                    ExamAttempt.exam_id == exam_id,
                    ExamAttempt.status == AttemptStatus.IN_PROGRESS.value,
                )
            )
            .order_by(ExamAttempt.started_at.desc())
        )
        result = await self.db.execute(query)
        return result.scalars().first()

    async def get_any_attempt(self, student_id: int, exam_id: int) -> Optional[ExamAttempt]:
        query = (
            select(ExamAttempt)
            .where(
                and_(
                    ExamAttempt.student_id == student_id,
                    ExamAttempt.exam_id == exam_id,
                )
            )
            .order_by(ExamAttempt.started_at.desc())
        )
        result = await self.db.execute(query)
        return result.scalars().first()

    async def create(self, attempt: ExamAttempt) -> ExamAttempt:
        self.db.add(attempt)
        await self.db.flush()
        await self.db.refresh(attempt)
        return attempt

    async def update(self, attempt: ExamAttempt) -> ExamAttempt:
        await self.db.flush()
        await self.db.refresh(attempt)
        return attempt

    async def get_answer(self, attempt_id: int, question_id: int) -> Optional[AttemptAnswer]:
        query = select(AttemptAnswer).where(
            and_(
                AttemptAnswer.attempt_id == attempt_id,
                AttemptAnswer.question_id == question_id,
            )
        )
        result = await self.db.execute(query)
        return result.scalars().first()

    async def add_answer(self, answer: AttemptAnswer) -> AttemptAnswer:
        self.db.add(answer)
        await self.db.flush()
        await self.db.refresh(answer)
        return answer

    async def get_all_results(
        self, exam_id: Optional[int] = None, student_id: Optional[int] = None
    ) -> List[ExamAttempt]:
        query = (
            select(ExamAttempt)
            .options(
                selectinload(ExamAttempt.student),
                selectinload(ExamAttempt.exam),
            )
            .order_by(ExamAttempt.started_at.desc())
        )
        if exam_id:
            query = query.where(ExamAttempt.exam_id == exam_id)
        if student_id:
            query = query.where(ExamAttempt.student_id == student_id)
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_completed_attempts_for_exam(self, exam_id: int) -> List[ExamAttempt]:
        query = (
            select(ExamAttempt)
            .where(
                and_(
                    ExamAttempt.exam_id == exam_id,
                    ExamAttempt.status == AttemptStatus.COMPLETED.value,
                )
            )
            .options(
                selectinload(ExamAttempt.student),
            )
            .order_by(
                ExamAttempt.score.desc(),
                ExamAttempt.completion_seconds.asc(),
                ExamAttempt.finished_at.asc(),
            )
        )
        result = await self.db.execute(query)
        return list(result.scalars().all())
