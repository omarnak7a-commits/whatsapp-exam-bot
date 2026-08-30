import json
from datetime import datetime, timezone
from typing import Optional, List, Dict, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status

from app.models.exam import Exam, ExamStatus
from app.models.question import Question
from app.models.option import Option
from app.models.student import Student
from app.models.exam_attempt import ExamAttempt, AttemptStatus
from app.models.attempt_answer import AttemptAnswer
from app.services.timer_service import TimerService
from app.services.ranking_service import RankingService


def _utcnow():
    return datetime.now(timezone.utc)


class PublicAttemptService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.ranking_service = RankingService(db)

    async def get_public_exam(self, slug: str) -> Exam:
        query = select(Exam).where(Exam.public_slug == slug).options(
            selectinload(Exam.questions).selectinload(Question.options)
        )
        result = await self.db.execute(query)
        exam = result.scalars().first()
        if not exam:
            raise HTTPException(status_code=404, detail="الامتحان غير موجود")
        if exam.status == ExamStatus.DRAFT.value:
            raise HTTPException(status_code=403, detail="الامتحان غير منشور حالياً")
        if exam.status == ExamStatus.CLOSED.value:
            raise HTTPException(status_code=403, detail="الامتحان مغلق")
        return exam

    async def get_or_create_student(self, name: str) -> Student:
        name = name.strip()
        if len(name) < 2:
            raise HTTPException(status_code=400, detail="الاسم يجب أن يكون على الأقل حرفين")
        if len(name) > 100:
            raise HTTPException(status_code=400, detail="الاسم طويل جداً")

        # Try to find existing student with same normalized name (case-insensitive)
        # For simplicity, we look for exact match trimmed lower
        result = await self.db.execute(
            select(Student).where(Student.name == name).order_by(Student.created_at.desc())
        )
        existing = result.scalars().first()
        if existing:
            return existing

        # Create new
        student = Student(name=name)
        self.db.add(student)
        await self.db.flush()
        await self.db.refresh(student)
        return student

    async def start_attempt(self, slug: str, student_name: str) -> Tuple[ExamAttempt, Exam, Student]:
        exam = await self.get_public_exam(slug)

        # Validate exam has questions
        if not exam.questions or len(exam.questions) == 0:
            raise HTTPException(status_code=400, detail="الامتحان لا يحتوي على أسئلة")

        student = await self.get_or_create_student(student_name)

        # Check if student has an in-progress attempt for this exam - resume it
        existing_query = select(ExamAttempt).where(
            and_(
                ExamAttempt.exam_id == exam.id,
                ExamAttempt.student_id == student.id,
                ExamAttempt.status == AttemptStatus.IN_PROGRESS.value,
            )
        ).order_by(ExamAttempt.started_at.desc())
        result = await self.db.execute(existing_query)
        existing_attempt = result.scalars().first()

        if existing_attempt:
            # Check if expired
            if TimerService.is_expired(existing_attempt.expires_at):
                await self._expire_attempt(existing_attempt)
                # Continue to create new attempt
            else:
                return existing_attempt, exam, student

        now = _utcnow()
        duration_seconds = exam.duration_seconds or (exam.duration_minutes * 60)
        expires_at = TimerService.calculate_expiration(now, duration_seconds)

        # Calculate total_score
        total_score = sum((q.points or 1) for q in exam.questions)

        # Persist question order (by order_index)
        sorted_questions = sorted(exam.questions, key=lambda q: q.order_index)
        question_ids = [q.id for q in sorted_questions]

        # Option order map (keep original order)
        option_order_map: Dict[str, List[int]] = {}
        for q in sorted_questions:
            opts = sorted(q.options, key=lambda o: o.order_index)
            option_order_map[str(q.id)] = [o.id for o in opts]

        attempt = ExamAttempt(
            exam_id=exam.id,
            student_id=student.id,
            started_at=now,
            expires_at=expires_at,
            status=AttemptStatus.IN_PROGRESS.value,
            total_questions=len(sorted_questions),
            total_score=total_score,
            score=0,
            percentage=0.0,
            correct_answers=0,
            wrong_answers=0,
            completion_seconds=0,
            completion_time_seconds=0,
            question_order_json=json.dumps(question_ids),
            option_order_json=json.dumps(option_order_map),
        )
        self.db.add(attempt)
        await self.db.flush()
        await self.db.refresh(attempt)
        return attempt, exam, student

    async def get_attempt(self, attempt_id: int) -> ExamAttempt:
        query = (
            select(ExamAttempt)
            .where(ExamAttempt.id == attempt_id)
            .options(
                selectinload(ExamAttempt.exam).selectinload(Exam.questions).selectinload(Question.options),
                selectinload(ExamAttempt.student),
                selectinload(ExamAttempt.answers),
            )
        )
        result = await self.db.execute(query)
        attempt = result.scalars().first()
        if not attempt:
            raise HTTPException(status_code=404, detail="المحاولة غير موجودة")
        return attempt

    async def _expire_attempt(self, attempt: ExamAttempt) -> ExamAttempt:
        if attempt.status != AttemptStatus.IN_PROGRESS.value:
            return attempt
        now = _utcnow()
        attempt.status = AttemptStatus.EXPIRED.value
        attempt.submitted_at = now
        attempt.finished_at = now
        attempt.completion_time_seconds = TimerService.calculate_completion_seconds(attempt.started_at, now)
        attempt.completion_seconds = attempt.completion_time_seconds
        # Calculate partial score if any answers exist
        await self._calculate_score(attempt)
        await self.db.flush()
        return attempt

    async def _calculate_score(self, attempt: ExamAttempt) -> None:
        # Load answers and questions
        ans_query = select(AttemptAnswer).where(AttemptAnswer.attempt_id == attempt.id)
        result = await self.db.execute(ans_query)
        answers = list(result.scalars().all())

        # Load exam questions with points and correct options
        exam_query = select(Exam).where(Exam.id == attempt.exam_id).options(
            selectinload(Exam.questions).selectinload(Question.options)
        )
        exam_result = await self.db.execute(exam_query)
        exam = exam_result.scalars().first()
        if not exam:
            return

        q_map = {q.id: q for q in exam.questions}
        total_score = sum((q.points or 1) for q in exam.questions)
        score = 0
        correct = 0
        wrong = 0

        for ans in answers:
            q = q_map.get(ans.question_id)
            if not q:
                continue
            # Determine if correct and points
            opt_id = ans.option_id or ans.selected_option_id
            # Find option
            correct_opt = next((o for o in q.options if o.is_correct), None)
            is_correct = False
            if correct_opt and opt_id == correct_opt.id:
                is_correct = True
            ans.is_correct = is_correct
            ans.points_awarded = (q.points or 1) if is_correct else 0
            if is_correct:
                score += ans.points_awarded
                correct += 1
            else:
                wrong += 1

        attempt.score = score
        attempt.total_score = total_score
        attempt.correct_answers = correct
        attempt.wrong_answers = wrong
        attempt.percentage = round((score / total_score * 100) if total_score > 0 else 0, 2)

    async def save_answer(self, attempt_id: int, question_id: int, option_id: int) -> ExamAttempt:
        attempt = await self.get_attempt(attempt_id)

        if attempt.status != AttemptStatus.IN_PROGRESS.value:
            raise HTTPException(status_code=400, detail="المحاولة مكتملة أو منتهية")

        if TimerService.is_expired(attempt.expires_at):
            await self._expire_attempt(attempt)
            raise HTTPException(status_code=400, detail="انتهى وقت الامتحان")

        # Validate question belongs to exam
        exam = attempt.exam
        question_ids = [q.id for q in exam.questions]
        if question_id not in question_ids:
            raise HTTPException(status_code=400, detail="السؤال غير مرتبط بهذا الامتحان")

        # Validate option belongs to question
        question = next((q for q in exam.questions if q.id == question_id), None)
        if not question:
            raise HTTPException(status_code=400, detail="السؤال غير موجود")
        option_ids = [o.id for o in question.options]
        if option_id not in option_ids:
            raise HTTPException(status_code=400, detail="الاختيار غير موجود")

        # Upsert answer
        existing_query = select(AttemptAnswer).where(
            and_(
                AttemptAnswer.attempt_id == attempt_id,
                AttemptAnswer.question_id == question_id,
            )
        )
        result = await self.db.execute(existing_query)
        existing = result.scalars().first()

        now = _utcnow()
        if existing:
            existing.option_id = option_id
            existing.selected_option_id = option_id
            existing.answered_at = now
            # is_correct will be calculated on submit
        else:
            new_ans = AttemptAnswer(
                attempt_id=attempt_id,
                question_id=question_id,
                option_id=option_id,
                selected_option_id=option_id,
                is_correct=False,
                points_awarded=0,
                answered_at=now,
            )
            self.db.add(new_ans)

        await self.db.flush()
        return attempt

    async def submit_attempt(self, attempt_id: int) -> ExamAttempt:
        attempt = await self.get_attempt(attempt_id)

        # Idempotent: if already completed, return it
        if attempt.status in [AttemptStatus.COMPLETED.value, AttemptStatus.EXPIRED.value]:
            return attempt

        now = _utcnow()

        # Check expiration - if expired, mark as expired but still calculate score
        is_expired = TimerService.is_expired(attempt.expires_at, now)

        # Calculate score
        await self._calculate_score(attempt)

        # Set completion time
        completion_seconds = TimerService.calculate_completion_seconds(attempt.started_at, now)
        attempt.completion_time_seconds = completion_seconds
        attempt.completion_seconds = completion_seconds
        attempt.submitted_at = now
        attempt.finished_at = now
        attempt.status = AttemptStatus.EXPIRED.value if is_expired else AttemptStatus.COMPLETED.value

        await self.db.flush()

        # Update rankings if completed
        if attempt.status == AttemptStatus.COMPLETED.value:
            await self.ranking_service.update_exam_rankings(attempt.exam_id)
            # Refresh to get ranking
            await self.db.refresh(attempt)

        return attempt

    async def get_attempt_result(self, attempt_id: int) -> dict:
        attempt = await self.get_attempt(attempt_id)

        if attempt.status == AttemptStatus.IN_PROGRESS.value:
            # If still in progress but expired, expire it
            if TimerService.is_expired(attempt.expires_at):
                attempt = await self._expire_attempt(attempt)
            else:
                raise HTTPException(status_code=400, detail="الامتحان لم ينته بعد")

        # Load exam with questions and options
        exam = attempt.exam
        # Build answers detail
        ans_query = select(AttemptAnswer).where(AttemptAnswer.attempt_id == attempt.id)
        result = await self.db.execute(ans_query)
        answers = list(result.scalars().all())
        ans_map = {a.question_id: a for a in answers}

        detailed_answers = []
        correct = 0
        wrong = 0
        unanswered = 0

        for q in sorted(exam.questions, key=lambda x: x.order_index):
            ans = ans_map.get(q.id)
            correct_opt = next((o for o in q.options if o.is_correct), None)
            if ans:
                opt_id = ans.option_id or ans.selected_option_id
                selected_opt = next((o for o in q.options if o.id == opt_id), None)
                detailed_answers.append({
                    "question_id": q.id,
                    "question_text": q.text or q.question_text,
                    "question_points": q.points or 1,
                    "selected_option_id": opt_id,
                    "selected_option_text": (selected_opt.text or selected_opt.option_text) if selected_opt else None,
                    "correct_option_id": correct_opt.id if correct_opt else None,
                    "correct_option_text": (correct_opt.text or correct_opt.option_text) if correct_opt else None,
                    "is_correct": ans.is_correct,
                    "points_awarded": ans.points_awarded,
                })
                if ans.is_correct:
                    correct += 1
                else:
                    wrong += 1
            else:
                unanswered += 1
                detailed_answers.append({
                    "question_id": q.id,
                    "question_text": q.text or q.question_text,
                    "question_points": q.points or 1,
                    "selected_option_id": None,
                    "selected_option_text": None,
                    "correct_option_id": correct_opt.id if correct_opt else None,
                    "correct_option_text": (correct_opt.text or correct_opt.option_text) if correct_opt else None,
                    "is_correct": False,
                    "points_awarded": 0,
                })

        # Leaderboard for this exam
        leaderboard = await self.ranking_service.get_leaderboard(exam.id)

        return {
            "attempt": attempt,
            "exam": exam,
            "detailed_answers": detailed_answers,
            "correct": correct,
            "wrong": wrong,
            "unanswered": unanswered,
            "leaderboard": leaderboard,
        }

    async def get_public_leaderboard(self, slug: str) -> List[dict]:
        exam = await self.get_public_exam(slug)
        leaderboard = await self.ranking_service.get_leaderboard(exam.id)
        return leaderboard
