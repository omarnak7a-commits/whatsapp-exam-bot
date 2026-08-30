import re
import secrets
import string
from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status
from app.repositories.exam_repository import ExamRepository
from app.schemas.exam import ExamCreate, ExamUpdate, ExamOut
from app.models.exam import Exam, ExamStatus
from app.models.question import Question


def _utcnow():
    return datetime.now(timezone.utc)


def _slugify(text: str) -> str:
    # Keep Arabic? For slug we allow alphanumeric plus hyphen
    # Lowercase, replace spaces with hyphen, remove invalid chars, keep arabic letters? For URL we use ascii fallback
    text = text.strip().lower()
    # Replace whitespace with hyphen
    text = re.sub(r'\s+', '-', text)
    # Keep only alphanumeric, hyphen
    # If Arabic, transliterate to latin approximation? Simpler: if slug becomes empty or non-ascii, use 'exam'
    ascii_slug = re.sub(r'[^a-z0-9\-]', '', text)
    if len(ascii_slug) < 2:
        # If original had arabic, use generic
        return "exam"
    # Collapse multiple hyphens
    ascii_slug = re.sub(r'-+', '-', ascii_slug).strip('-')
    return ascii_slug[:40] or "exam"


def _random_suffix(length: int = 4) -> str:
    alphabet = string.ascii_lowercase + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(length))


async def _generate_unique_slug(db: AsyncSession, title: str) -> str:
    base = _slugify(title)
    # Try base + suffix until unique
    for _ in range(10):
        suffix = _random_suffix(4)
        slug = f"{base}-{suffix}"
        result = await db.execute(select(Exam).where(Exam.public_slug == slug))
        if not result.scalars().first():
            return slug
    # Fallback
    return f"exam-{_random_suffix(8)}"


class ExamService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = ExamRepository(db)

    async def create_exam(self, data: ExamCreate) -> Exam:
        # Normalize duration
        duration_minutes = data.duration_minutes
        if data.duration_seconds and not data.duration_minutes:
            duration_minutes = max(1, data.duration_seconds // 60)
        if duration_minutes is None:
            duration_minutes = 20

        duration_seconds = duration_minutes * 60

        slug = await _generate_unique_slug(self.db, data.title)

        exam = Exam(
            title=data.title,
            description=data.description,
            public_slug=slug,
            duration_minutes=duration_minutes,
            duration_seconds=duration_seconds,
            status=ExamStatus.DRAFT.value,
            number_of_questions=0,
            randomize_questions=False,
            randomize_options=False,
            one_attempt_only=False,
            show_correct_answer_immediately=False,
            instant_feedback_enabled=bool(data.instant_feedback_enabled),
            show_correct_answers=bool(data.show_correct_answers),
            leaderboard_enabled=bool(data.leaderboard_enabled),
        )
        return await self.repo.create(exam)

    async def get_exam(self, exam_id: int, include_questions: bool = False) -> Exam:
        exam = await self.repo.get_by_id(exam_id, include_questions=include_questions)
        if not exam:
            raise HTTPException(status_code=404, detail="الامتحان غير موجود")
        return exam

    async def get_exam_by_slug(self, slug: str, include_questions: bool = False) -> Exam:
        query = select(Exam).where(Exam.public_slug == slug)
        if include_questions:
            query = query.options(selectinload(Exam.questions).selectinload(Question.options))
        result = await self.db.execute(query)
        exam = result.scalars().first()
        if not exam:
            raise HTTPException(status_code=404, detail="الامتحان غير موجود")
        return exam

    async def list_exams(self, status_filter: Optional[str] = None) -> List[ExamOut]:
        exams = await self.repo.get_all(status=status_filter)
        result = []
        for e in exams:
            q_count = await self.repo.get_questions_count(e.id)
            a_count = await self.repo.get_attempts_count(e.id)
            # Ensure duration_minutes exists
            dm = e.duration_minutes or (e.duration_seconds // 60 if e.duration_seconds else 20)
            dto = ExamOut(
                id=e.id,
                title=e.title,
                description=e.description,
                public_slug=e.public_slug,
                duration_minutes=dm,
                duration_seconds=e.duration_seconds or dm * 60,
                status=e.status,
                instant_feedback_enabled=bool(e.instant_feedback_enabled),
                show_correct_answers=bool(e.show_correct_answers),
                leaderboard_enabled=bool(e.leaderboard_enabled),
                created_at=e.created_at,
                updated_at=e.updated_at,
                published_at=e.published_at,
                closed_at=e.closed_at,
                total_questions_count=q_count,
                total_attempts_count=a_count,
            )
            result.append(dto)
        return result

    async def update_exam(self, exam_id: int, data: ExamUpdate) -> Exam:
        exam = await self.get_exam(exam_id)
        update_data = data.model_dump(exclude_unset=True)

        if "duration_minutes" in update_data and update_data["duration_minutes"] is not None:
            dm = update_data["duration_minutes"]
            exam.duration_minutes = dm
            exam.duration_seconds = dm * 60
            del update_data["duration_minutes"]
        if "duration_seconds" in update_data and update_data["duration_seconds"] is not None:
            ds = update_data["duration_seconds"]
            exam.duration_seconds = ds
            exam.duration_minutes = max(1, ds // 60)
            del update_data["duration_seconds"]

        for key, val in update_data.items():
            if hasattr(exam, key):
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
        if not exam.public_slug:
            exam.public_slug = await _generate_unique_slug(self.db, exam.title)
        exam.status = ExamStatus.PUBLISHED.value
        exam.published_at = _utcnow()
        exam.closed_at = None
        return await self.repo.update(exam)

    async def close_exam(self, exam_id: int) -> Exam:
        exam = await self.get_exam(exam_id)
        exam.status = ExamStatus.CLOSED.value
        exam.closed_at = _utcnow()
        return await self.repo.update(exam)

    async def duplicate_exam(self, exam_id: int) -> Exam:
        original = await self.get_exam(exam_id, include_questions=True)
        slug = await _generate_unique_slug(self.db, original.title + " نسخة")
        new_exam = Exam(
            title=original.title + " (نسخة)",
            description=original.description,
            public_slug=slug,
            duration_minutes=original.duration_minutes,
            duration_seconds=original.duration_seconds,
            status=ExamStatus.DRAFT.value,
            instant_feedback_enabled=bool(original.instant_feedback_enabled),
            show_correct_answers=bool(original.show_correct_answers),
            leaderboard_enabled=bool(original.leaderboard_enabled),
        )
        new_exam = await self.repo.create(new_exam)

        # Duplicate questions and options
        from app.models.question import Question
        from app.models.option import Option

        for q in original.questions:
            new_q = Question(
                exam_id=new_exam.id,
                text=q.text or q.question_text,
                question_text=q.text or q.question_text,
                order_index=q.order_index,
                points=getattr(q, 'points', 1) or 1,
            )
            self.db.add(new_q)
            await self.db.flush()
            for opt in q.options:
                new_opt = Option(
                    question_id=new_q.id,
                    text=opt.text or opt.option_text,
                    option_text=opt.text or opt.option_text,
                    is_correct=opt.is_correct,
                    order_index=opt.order_index,
                )
                self.db.add(new_opt)
        await self.db.flush()
        await self.db.refresh(new_exam)
        return new_exam
