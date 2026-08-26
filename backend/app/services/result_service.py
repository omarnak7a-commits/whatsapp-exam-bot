from datetime import datetime, timezone
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.attempt import ExamAttempt, AttemptAnswer, AttemptQuestion
from app.models.question import Question, Option
from app.services.ranking_service import recalculate_rankings

async def finalize_attempt(db:AsyncSession, attempt:ExamAttempt, status="COMPLETED"):
    if attempt.status in ["COMPLETED","EXPIRED","CANCELLED"]: return attempt
    answers=(await db.execute(select(AttemptAnswer).where(AttemptAnswer.attempt_id==attempt.id))).scalars().all()
    attempt.correct_answers=sum(1 for a in answers if a.is_correct)
    attempt.wrong_answers=len(answers)-attempt.correct_answers
    attempt.score=attempt.correct_answers
    attempt.percentage=round((attempt.correct_answers/attempt.total_questions*100),2) if attempt.total_questions else 0
    attempt.finished_at=datetime.now(timezone.utc)
    attempt.completion_seconds=max(0,int((attempt.finished_at-attempt.started_at).total_seconds()))
    attempt.status=status
    await db.flush()
    await recalculate_rankings(db,attempt.exam_id)
    await db.commit(); await db.refresh(attempt); return attempt
