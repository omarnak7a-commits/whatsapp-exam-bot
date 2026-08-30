from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.db.session import get_db
from app.services.public_attempt_service import PublicAttemptService
from app.models.exam import Exam
from app.models.question import Question
from app.schemas.public import (
    PublicExamDetailOut,
    CreateAttemptRequest,
    AttemptOut,
    AnswerRequest,
    AnswerOut,
    SubmitOut,
)
from app.services.timer_service import TimerService

router = APIRouter(prefix="/public", tags=["Public Exam"])


@router.get("/exams/{slug}")
async def get_public_exam(slug: str, db: AsyncSession = Depends(get_db)):
    service = PublicAttemptService(db)
    exam = await service.get_public_exam(slug)

    questions_count = len(exam.questions)
    total_points = sum((q.points or 1) for q in exam.questions)

    return {
        "public_slug": exam.public_slug,
        "title": exam.title,
        "description": exam.description,
        "duration_minutes": exam.duration_minutes or (exam.duration_seconds // 60 if exam.duration_seconds else 20),
        "questions_count": questions_count,
        "total_points": total_points,
        "status": exam.status,
    }


@router.post("/exams/{slug}/attempts")
async def create_attempt(slug: str, data: CreateAttemptRequest, db: AsyncSession = Depends(get_db)):
    service = PublicAttemptService(db)
    attempt, exam, student = await service.start_attempt(slug, data.student_name)

    remaining = TimerService.calculate_remaining_seconds(attempt.expires_at)

    return {
        "id": attempt.id,
        "exam_id": attempt.exam_id,
        "student_id": attempt.student_id,
        "student_name": student.name,
        "started_at": attempt.started_at,
        "expires_at": attempt.expires_at,
        "status": attempt.status,
        "remaining_seconds": remaining,
        "total_questions": attempt.total_questions,
        "total_score": attempt.total_score,
        "answered_count": 0,
    }


@router.get("/attempts/{attempt_id}")
async def get_attempt(attempt_id: int, db: AsyncSession = Depends(get_db)):
    service = PublicAttemptService(db)
    attempt = await service.get_attempt(attempt_id)

    # If expired, handle
    if attempt.status == "IN_PROGRESS" and TimerService.is_expired(attempt.expires_at):
        attempt = await service._expire_attempt(attempt)

    remaining = TimerService.calculate_remaining_seconds(attempt.expires_at) if attempt.status == "IN_PROGRESS" else 0

    # Build questions for frontend (without correct answers)
    exam = attempt.exam
    sorted_questions = sorted(exam.questions, key=lambda q: q.order_index)

    # Answers map
    ans_map = {}
    for ans in attempt.answers:
        ans_map[ans.question_id] = ans.option_id or ans.selected_option_id

    questions_data = []
    for q in sorted_questions:
        opts = sorted(q.options, key=lambda o: o.order_index)
        questions_data.append({
            "id": q.id,
            "text": q.text or q.question_text,
            "order_index": q.order_index,
            "points": q.points or 1,
            "options": [
                {
                    "id": o.id,
                    "text": o.text or o.option_text,
                    "order_index": o.order_index,
                }
                for o in opts
            ],
            "selected_option_id": ans_map.get(q.id),
        })

    return {
        "attempt": {
            "id": attempt.id,
            "exam_id": attempt.exam_id,
            "student_id": attempt.student_id,
            "student_name": attempt.student.name if attempt.student else "",
            "started_at": attempt.started_at,
            "expires_at": attempt.expires_at,
            "status": attempt.status,
            "remaining_seconds": remaining,
            "total_questions": len(sorted_questions),
            "total_score": attempt.total_score or sum((q.points or 1) for q in sorted_questions),
            "answered_count": len(ans_map),
        },
        "exam": {
            "public_slug": exam.public_slug,
            "title": exam.title,
            "description": exam.description,
            "duration_minutes": exam.duration_minutes,
        },
        "questions": questions_data,
    }


@router.post("/attempts/{attempt_id}/answers")
async def save_answer(attempt_id: int, data: AnswerRequest, db: AsyncSession = Depends(get_db)):
    service = PublicAttemptService(db)
    attempt = await service.save_answer(attempt_id, data.question_id, data.option_id)

    # Count answers
    from sqlalchemy import select
    from app.models.attempt_answer import AttemptAnswer
    result = await db.execute(select(AttemptAnswer).where(AttemptAnswer.attempt_id == attempt_id))
    answered = len(list(result.scalars().all()))

    # Determine next question
    exam = attempt.exam
    sorted_q = sorted(exam.questions, key=lambda q: q.order_index)
    q_ids = [q.id for q in sorted_q]
    try:
        current_idx = q_ids.index(data.question_id)
        next_id = q_ids[current_idx + 1] if current_idx + 1 < len(q_ids) else None
    except ValueError:
        next_id = None

    return {
        "attempt_id": attempt_id,
        "question_id": data.question_id,
        "option_id": data.option_id,
        "answered_count": answered,
        "next_question_id": next_id,
        "is_last": next_id is None,
    }


@router.post("/attempts/{attempt_id}/submit")
async def submit_attempt(attempt_id: int, db: AsyncSession = Depends(get_db)):
    service = PublicAttemptService(db)
    attempt = await service.submit_attempt(attempt_id)

    total_q = attempt.total_questions or 0
    # Calculate unanswered
    from sqlalchemy import select
    from app.models.attempt_answer import AttemptAnswer
    result = await db.execute(select(AttemptAnswer).where(AttemptAnswer.attempt_id == attempt_id))
    answered_count = len(list(result.scalars().all()))
    unanswered = max(0, total_q - answered_count)

    return {
        "id": attempt.id,
        "score": attempt.score,
        "total_score": attempt.total_score,
        "percentage": attempt.percentage,
        "completion_time_seconds": attempt.completion_time_seconds or attempt.completion_seconds or 0,
        "ranking": attempt.ranking or attempt.final_rank,
        "correct_answers": attempt.correct_answers,
        "wrong_answers": attempt.wrong_answers,
        "unanswered": unanswered,
        "total_questions": total_q,
        "status": attempt.status,
    }


@router.get("/attempts/{attempt_id}/result")
async def get_result(attempt_id: int, db: AsyncSession = Depends(get_db)):
    service = PublicAttemptService(db)
    data = await service.get_attempt_result(attempt_id)

    attempt = data["attempt"]
    exam = data["exam"]

    # Leaderboard limited to top 50 for public
    leaderboard = data["leaderboard"][:50]

    lb_data = [
        {
            "rank": entry.rank,
            "student_name": entry.student_name,
            "score": entry.score,
            "total_score": entry.total_score,
            "percentage": entry.percentage,
            "completion_time_seconds": entry.completion_time_seconds,
        }
        for entry in leaderboard
    ]

    total_ranked = len(leaderboard)

    return {
        "attempt_id": attempt.id,
        "student_name": attempt.student.name if attempt.student else "",
        "exam_title": exam.title,
        "public_slug": exam.public_slug,
        "score": attempt.score,
        "total_score": attempt.total_score,
        "percentage": attempt.percentage,
        "completion_time_seconds": attempt.completion_time_seconds or attempt.completion_seconds or 0,
        "ranking": attempt.ranking or attempt.final_rank,
        "total_ranked": total_ranked,
        "correct_answers": data["correct"],
        "wrong_answers": data["wrong"],
        "unanswered": data["unanswered"],
        "answers": data["detailed_answers"],
        "leaderboard": lb_data,
        "status": attempt.status,
        "started_at": attempt.started_at,
        "submitted_at": attempt.submitted_at or attempt.finished_at,
    }


@router.get("/exams/{slug}/leaderboard")
async def get_leaderboard(slug: str, db: AsyncSession = Depends(get_db)):
    service = PublicAttemptService(db)
    exam = await service.get_public_exam(slug)
    leaderboard = await service.ranking_service.get_leaderboard(exam.id)

    return [
        {
            "rank": entry.rank,
            "student_name": entry.student_name,
            "score": entry.score,
            "total_score": entry.total_score,
            "percentage": entry.percentage,
            "completion_time_seconds": entry.completion_time_seconds,
            "submitted_at": entry.submitted_at,
        }
        for entry in leaderboard[:100]
    ]
