from datetime import datetime
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status
from app.repositories.exam_repository import ExamRepository
from app.schemas.exam import ExamCreate, ExamUpdate, ExamOut
from app.models.exam import Exam, ExamStatus
from app.core.exceptions import ExamNotFoundException


class ExamService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = ExamRepository(db)

    async def create_exam(self, data: ExamCreate) -> Exam:
        exam = Exam(
            title=data.title,
            description=data.description,
            duration_seconds=data.duration_seconds,
            number_of_questions=data.number_of_questions,
            randomize_questions=data.randomize_questions,
            randomize_options=data.randomize_options,
            one_attempt_only=data.one_attempt_only,
            show_correct_answer_immediately=data.show_correct_answer_immediately,
            status=ExamStatus.DRAFT.value,
        )
        return await self.repo.create(exam)

    async def get_exam(self, exam_id: int, include_questions: bool = False) -> Exam:
        exam = await self.repo.get_by_id(exam_id, include_questions=include_questions)
        if not exam:
            raise HTTPException(status_code=404, detail="الامتحان غير موجود")
        return exam

    async def list_exams(self, status_filter: Optional[str] = None) -> List[ExamOut]:
        exams = await self.repo.get_all(status=status_filter)
        result = []
        for e in exams:
            q_count = await self.repo.get_questions_count(e.id)
            a_count = await self.repo.get_attempts_count(e.id)
            dto = ExamOut.model_validate(e)
            dto.total_questions_count = q_count
            dto.total_attempts_count = a_count
            result.append(dto)
        return result

    async def update_exam(self, exam_id: int, data: ExamUpdate) -> Exam:
        exam = await self.get_exam(exam_id)
        update_data = data.model_dump(exclude_unset=True)
        for key, val in update_data.items():
            setattr(exam, key, val)
        return await self.repo.update(exam)

    async def delete_exam(self, exam_id: int) -> None:
        exam = await self.get_exam(exam_id)
        await self.repo.delete(exam)

    async def publish_exam(self, exam_id: int) -> Exam:
        exam = await self.get_exam(exam_id)
        q_count = await self.repo.get_questions_count(exam_id)
        if q_count == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="لا يمكن نشر امتحان بدون أسئلة",
            )
        exam.status = ExamStatus.PUBLISHED.value
        exam.published_at = datetime.utcnow()
        return await self.repo.update(exam)

    async def close_exam(self, exam_id: int) -> Exam:
        exam = await self.get_exam(exam_id)
        exam.status = ExamStatus.CLOSED.value
        exam.closed_at = datetime.utcnow()
        return await self.repo.update(exam)
