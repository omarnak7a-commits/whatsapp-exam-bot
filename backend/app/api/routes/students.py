from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from app.db.session import get_db
from app.schemas.student import StudentAggregatedOut
from app.models.student import Student
from app.models.exam_attempt import ExamAttempt, AttemptStatus
from app.api.dependencies import get_current_admin
from app.models.admin import Admin

router = APIRouter(prefix="/students", tags=["Students"])


@router.get("", response_model=List[StudentAggregatedOut])
async def list_students(
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    # Base query for students
    query = select(Student).order_by(Student.created_at.desc())

    if search:
        query = query.where(Student.name.ilike(f"%{search}%"))

    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size).options(selectinload(Student.attempts))

    result = await db.execute(query)
    students = list(result.scalars().all())

    aggregated = []
    for s in students:
        attempts = s.attempts or []
        completed = [a for a in attempts if a.status == AttemptStatus.COMPLETED.value]

        total_attempts = len(attempts)
        avg_percentage = sum(a.percentage or 0 for a in completed) / len(completed) if completed else 0
        best_percentage = max((a.percentage or 0 for a in completed), default=0)
        exams_count = len(set(a.exam_id for a in attempts))
        last_attempt = max((a.started_at for a in attempts), default=None)

        aggregated.append(StudentAggregatedOut(
            id=s.id,
            name=s.name,
            total_attempts=total_attempts,
            average_percentage=round(avg_percentage, 1),
            best_percentage=round(best_percentage, 1),
            exams_count=exams_count,
            last_attempt_at=last_attempt,
        ))

    return aggregated


@router.get("/{student_id}/attempts")
async def get_student_attempts(
    student_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    query = (
        select(ExamAttempt)
        .where(ExamAttempt.student_id == student_id)
        .options(selectinload(ExamAttempt.exam))
        .order_by(ExamAttempt.started_at.desc())
    )
    result = await db.execute(query)
    attempts = list(result.scalars().all())

    return [
        {
            "id": a.id,
            "exam_id": a.exam_id,
            "exam_title": a.exam.title if a.exam else "",
            "score": a.score or 0,
            "total_score": a.total_score or a.total_questions or 0,
            "percentage": a.percentage or 0,
            "completion_time_seconds": a.completion_time_seconds or a.completion_seconds or 0,
            "ranking": a.ranking or a.final_rank,
            "status": a.status,
            "started_at": a.started_at,
            "submitted_at": a.submitted_at or a.finished_at,
        }
        for a in attempts
    ]
