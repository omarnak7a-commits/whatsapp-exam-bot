from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.db.session import get_db
from app.schemas.result import AttemptResultOut, LeaderboardEntryOut, AdminDashboardStats
from app.repositories.attempt_repository import AttemptRepository
from app.repositories.exam_repository import ExamRepository
from app.repositories.student_repository import StudentRepository
from app.services.ranking_service import RankingService
from app.models.exam import Exam, ExamStatus
from app.models.student import Student
from app.models.exam_attempt import ExamAttempt, AttemptStatus
from app.api.dependencies import get_current_admin
from app.models.admin import Admin

router = APIRouter(tags=["Results & Analytics"])


@router.get("/results", response_model=List[AttemptResultOut])
async def list_results(
    exam_id: Optional[int] = Query(None),
    student_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    repo = AttemptRepository(db)
    attempts = await repo.get_all_results(exam_id=exam_id, student_id=student_id)
    results = []
    for a in attempts:
        dto = AttemptResultOut(
            id=a.id,
            exam_id=a.exam_id,
            exam_title=a.exam.title if a.exam else "",
            student_id=a.student_id,
            student_name=a.student.name if a.student else "",
            student_whatsapp=a.student.whatsapp_number if a.student else "",
            started_at=a.started_at,
            finished_at=a.finished_at,
            expires_at=a.expires_at,
            status=a.status,
            score=a.score,
            total_questions=a.total_questions,
            correct_answers=a.correct_answers,
            wrong_answers=a.wrong_answers,
            percentage=a.percentage,
            completion_seconds=a.completion_seconds,
            final_rank=a.final_rank,
        )
        results.append(dto)
    return results


@router.get("/results/{attempt_id}", response_model=AttemptResultOut)
async def get_result_detail(
    attempt_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    repo = AttemptRepository(db)
    a = await repo.get_by_id(attempt_id)
    if not a:
        raise HTTPException(status_code=404, detail="النتيجة غير موجودة")
    return AttemptResultOut(
        id=a.id,
        exam_id=a.exam_id,
        exam_title=a.exam.title if a.exam else "",
        student_id=a.student_id,
        student_name=a.student.name if a.student else "",
        student_whatsapp=a.student.whatsapp_number if a.student else "",
        started_at=a.started_at,
        finished_at=a.finished_at,
        expires_at=a.expires_at,
        status=a.status,
        score=a.score,
        total_questions=a.total_questions,
        correct_answers=a.correct_answers,
        wrong_answers=a.wrong_answers,
        percentage=a.percentage,
        completion_seconds=a.completion_seconds,
        final_rank=a.final_rank,
    )


@router.get("/exams/{exam_id}/leaderboard", response_model=List[LeaderboardEntryOut])
async def get_leaderboard(
    exam_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    service = RankingService(db)
    return await service.get_leaderboard(exam_id)


@router.get("/dashboard/stats", response_model=AdminDashboardStats)
async def get_dashboard_stats(
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    total_exams = (await db.execute(select(func.count(Exam.id)))).scalar() or 0
    published_exams = (
        await db.execute(
            select(func.count(Exam.id)).where(Exam.status == ExamStatus.PUBLISHED.value)
        )
    ).scalar() or 0
    total_students = (await db.execute(select(func.count(Student.id)))).scalar() or 0
    completed_attempts = (
        await db.execute(
            select(func.count(ExamAttempt.id)).where(
                ExamAttempt.status == AttemptStatus.COMPLETED.value
            )
        )
    ).scalar() or 0

    avg_score = (
        await db.execute(
            select(func.avg(ExamAttempt.percentage)).where(
                ExamAttempt.status == AttemptStatus.COMPLETED.value
            )
        )
    ).scalar() or 0.0

    max_score = (
        await db.execute(
            select(func.max(ExamAttempt.percentage)).where(
                ExamAttempt.status == AttemptStatus.COMPLETED.value
            )
        )
    ).scalar() or 0.0

    return AdminDashboardStats(
        total_exams=total_exams,
        published_exams=published_exams,
        total_students=total_students,
        total_completed_attempts=completed_attempts,
        average_score_percentage=round(float(avg_score), 1),
        highest_score_percentage=round(float(max_score), 1),
    )
