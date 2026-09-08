import json
import random
from datetime import datetime
from typing import Optional, Tuple, List, Dict
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException, status
from app.repositories.attempt_repository import AttemptRepository
from app.repositories.exam_repository import ExamRepository
from app.repositories.question_repository import QuestionRepository
from app.services.public_attempt_service import ALREADY_ATTEMPTED_MESSAGE, normalize_student_name
from app.services.timer_service import TimerService
from app.services.ranking_service import RankingService
from app.models.exam import Exam, ExamStatus
from app.models.exam_attempt import ExamAttempt, AttemptStatus
from app.models.attempt_answer import AttemptAnswer
from app.models.student import Student
from app.models.question import Question
from app.models.option import Option
from app.core.exceptions import (
    ExamNotFoundException,
    ExamExpiredException,
    AlreadyAnsweredException,
    AttemptAlreadyCompletedException,
    OneAttemptOnlyException,
)


class AttemptService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = AttemptRepository(db)
        self.exam_repo = ExamRepository(db)
        self.question_repo = QuestionRepository(db)
        self.ranking_service = RankingService(db)

    async def start_attempt(self, student_id: int, exam_id: int) -> ExamAttempt:
        exam = await self.exam_repo.get_by_id(exam_id, include_questions=True)
        if not exam or exam.status != ExamStatus.PUBLISHED.value:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="الامتحان غير منشور أو غير موجود حاليًا",
            )

        # One attempt per student per exam (platform-wide rule).
        # ANY previous attempt - IN_PROGRESS, COMPLETED or EXPIRED - means the
        # student already consumed their attempt: no resume, no new attempt.
        existing_attempt = await self.repo.get_any_attempt(student_id, exam_id)
        if existing_attempt:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=ALREADY_ATTEMPTED_MESSAGE,
            )

        # Select & randomize questions
        all_questions = list(exam.questions)
        if not all_questions:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="الامتحان لا يحتوي على أسئلة",
            )

        if exam.randomize_questions:
            random.shuffle(all_questions)

        selected_questions = all_questions[: exam.number_of_questions]
        question_ids = [q.id for q in selected_questions]

        # Randomize options mapping
        option_order_map: Dict[str, List[int]] = {}
        for q in selected_questions:
            opts = list(q.options)
            if exam.randomize_options:
                random.shuffle(opts)
            option_order_map[str(q.id)] = [o.id for o in opts]

        now = datetime.utcnow()
        expires_at = TimerService.calculate_expiration(now, exam.duration_seconds)

        # Keep the normalized-name key in sync with the web flow so both paths
        # share the same "one attempt per student per exam" DB constraint.
        student = await self.db.get(Student, student_id)
        name_key = normalize_student_name(student.name) if student and student.name else None

        attempt = ExamAttempt(
            exam_id=exam_id,
            student_id=student_id,
            student_name_key=name_key,
            started_at=now,
            expires_at=expires_at,
            status=AttemptStatus.IN_PROGRESS.value,
            total_questions=len(selected_questions),
            question_order_json=json.dumps(question_ids),
            option_order_json=json.dumps(option_order_map),
        )
        try:
            async with self.db.begin_nested():
                return await self.repo.create(attempt)
        except IntegrityError:
            # Race condition: a concurrent request already created the single
            # allowed attempt and the DB unique constraint rejected this one.
            self.db.expunge(attempt)
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=ALREADY_ATTEMPTED_MESSAGE,
            )

    async def get_current_question(
        self, attempt_id: int
    ) -> Tuple[ExamAttempt, Optional[Question], Optional[List[Option]], int, int]:
        attempt = await self.repo.get_by_id(attempt_id)
        if not attempt:
            raise HTTPException(status_code=404, detail="المحاولة غير موجودة")

        if attempt.status != AttemptStatus.IN_PROGRESS.value:
            return attempt, None, None, 0, attempt.total_questions

        # Check backend timer expiration
        if TimerService.is_expired(attempt.expires_at):
            await self.complete_attempt(attempt_id, is_expired=True)
            attempt = await self.repo.get_by_id(attempt_id)
            return attempt, None, None, 0, attempt.total_questions

        question_ids = json.loads(attempt.question_order_json or "[]")
        option_order_map = json.loads(attempt.option_order_json or "{}")

        ans_query = await self.db.execute(
            select(AttemptAnswer.question_id).where(AttemptAnswer.attempt_id == attempt_id)
        )
        answered_q_ids = set(ans_query.scalars().all())

        next_q_id = None
        current_index = 0
        for idx, q_id in enumerate(question_ids, start=1):
            if q_id not in answered_q_ids:
                next_q_id = q_id
                current_index = idx
                break

        if not next_q_id:
            # All questions answered, complete attempt
            await self.complete_attempt(attempt_id)
            attempt = await self.repo.get_by_id(attempt_id)
            return attempt, None, None, attempt.total_questions, attempt.total_questions

        question = await self.question_repo.get_by_id(next_q_id)
        if not question:
            raise HTTPException(status_code=404, detail="السؤال غير موجود")

        # Order options according to persisted option sequence
        persisted_option_ids = option_order_map.get(str(next_q_id), [])
        options_dict = {opt.id: opt for opt in question.options}
        ordered_options = []
        if persisted_option_ids:
            for opt_id in persisted_option_ids:
                if opt_id in options_dict:
                    ordered_options.append(options_dict[opt_id])
        else:
            ordered_options = list(question.options)

        return attempt, question, ordered_options, current_index, len(question_ids)

    async def record_answer(
        self, attempt_id: int, question_id: int, option_id: int
    ) -> Tuple[bool, bool, Optional[Option]]:
        """
        Returns: (is_correct, is_exam_finished, correct_option)
        """
        attempt = await self.repo.get_by_id(attempt_id)
        if not attempt:
            raise HTTPException(status_code=404, detail="المحاولة غير موجودة")

        if attempt.status != AttemptStatus.IN_PROGRESS.value:
            raise AttemptAlreadyCompletedException("هذه المحاولة مكتملة أو مغلقة")

        # Check time expiration
        if TimerService.is_expired(attempt.expires_at):
            await self.complete_attempt(attempt_id, is_expired=True)
            raise ExamExpiredException("انتهى وقت الامتحان")

        # Check duplicate answer
        existing_ans = await self.repo.get_answer(attempt_id, question_id)
        if existing_ans:
            raise AlreadyAnsweredException("لقد قمت بالإجابة على هذا السؤال من قبل")

        question = await self.question_repo.get_by_id(question_id)
        if not question or question.exam_id != attempt.exam_id:
            raise HTTPException(status_code=400, detail="السؤال غير مرتبط بهذا الامتحان")

        selected_opt = next((o for o in question.options if o.id == option_id), None)
        if not selected_opt:
            raise HTTPException(status_code=400, detail="الخيار المحدد غير موجود")

        correct_opt = next((o for o in question.options if o.is_correct), None)
        is_correct = selected_opt.is_correct

        answer = AttemptAnswer(
            attempt_id=attempt_id,
            question_id=question_id,
            selected_option_id=option_id,
            is_correct=is_correct,
            answered_at=datetime.utcnow(),
        )
        await self.repo.add_answer(answer)

        # Check if all questions are answered
        question_ids = json.loads(attempt.question_order_json or "[]")
        ans_query = await self.db.execute(
            select(AttemptAnswer.question_id).where(AttemptAnswer.attempt_id == attempt_id)
        )
        answered_q_ids = set(ans_query.scalars().all())

        is_exam_finished = len(answered_q_ids) >= len(question_ids)
        if is_exam_finished:
            await self.complete_attempt(attempt_id)

        return is_correct, is_exam_finished, correct_opt

    async def complete_attempt(
        self, attempt_id: int, is_expired: bool = False
    ) -> ExamAttempt:
        attempt = await self.repo.get_by_id(attempt_id)
        if not attempt:
            raise HTTPException(status_code=404, detail="المحاولة غير موجودة")

        if attempt.status in (AttemptStatus.COMPLETED.value, AttemptStatus.EXPIRED.value):
            return attempt

        now = datetime.utcnow()
        attempt.finished_at = now
        attempt.status = AttemptStatus.EXPIRED.value if is_expired else AttemptStatus.COMPLETED.value

        ans_query = await self.db.execute(
            select(AttemptAnswer).where(AttemptAnswer.attempt_id == attempt_id)
        )
        all_answers = list(ans_query.scalars().all())

        correct_count = sum(1 for a in all_answers if a.is_correct)
        total_q = attempt.total_questions if attempt.total_questions > 0 else 1
        wrong_count = len(all_answers) - correct_count

        attempt.correct_answers = correct_count
        attempt.wrong_answers = wrong_count
        attempt.score = float(correct_count)
        attempt.percentage = round((correct_count / total_q) * 100.0, 1)

        diff = (now - attempt.started_at).total_seconds()
        attempt.completion_seconds = max(1, int(diff))

        await self.repo.update(attempt)

        if attempt.status == AttemptStatus.COMPLETED.value:
            await self.ranking_service.update_exam_rankings(attempt.exam_id)
            attempt = await self.repo.get_by_id(attempt_id)

        return attempt
