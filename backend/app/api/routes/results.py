from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from sqlalchemy.orm import selectinload
import csv
import io
from datetime import datetime

from app.db.session import get_db
from app.schemas.result import AttemptResultOut, LeaderboardEntryOut, AdminDashboardStats, AttemptDetailOut, AttemptAnswerDetail
from app.repositories.attempt_repository import AttemptRepository
from app.services.ranking_service import RankingService
from app.models.exam import Exam, ExamStatus
from app.models.student import Student
from app.models.exam_attempt import ExamAttempt, AttemptStatus
from app.models.question import Question
from app.models.option import Option
from app.models.attempt_answer import AttemptAnswer
from app.api.dependencies import get_current_admin
from app.models.admin import Admin

router = APIRouter(tags=["Results & Analytics"])


@router.get("/results", response_model=List[AttemptResultOut])
async def list_results(
    exam_id: Optional[int] = Query(None),
    student_id: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    # Build query with pagination
    base_query = select(ExamAttempt).options(
        selectinload(ExamAttempt.student),
        selectinload(ExamAttempt.exam),
    ).order_by(ExamAttempt.started_at.desc())

    if exam_id:
        base_query = base_query.where(ExamAttempt.exam_id == exam_id)
    if student_id:
        base_query = base_query.where(ExamAttempt.student_id == student_id)
    if status:
        base_query = base_query.where(ExamAttempt.status == status)

    if search:
        # Join student
        base_query = base_query.join(Student, ExamAttempt.student_id == Student.id).where(
            Student.name.ilike(f"%{search}%")
        )

    # Pagination
    offset = (page - 1) * page_size
    base_query = base_query.offset(offset).limit(page_size)

    result = await db.execute(base_query)
    attempts = list(result.scalars().all())

    results = []
    for a in attempts:
        dto = AttemptResultOut(
            id=a.id,
            exam_id=a.exam_id,
            exam_title=a.exam.title if a.exam else "",
            student_id=a.student_id,
            student_name=a.student.name if a.student else "",
            started_at=a.started_at,
            submitted_at=a.submitted_at or a.finished_at,
            finished_at=a.finished_at or a.submitted_at,
            expires_at=a.expires_at,
            status=a.status,
            score=a.score or 0,
            total_score=a.total_score or a.total_questions or 0,
            total_questions=a.total_questions or 0,
            correct_answers=a.correct_answers or 0,
            wrong_answers=a.wrong_answers or 0,
            percentage=a.percentage or 0.0,
            completion_time_seconds=a.completion_time_seconds or a.completion_seconds or 0,
            completion_seconds=a.completion_seconds or a.completion_time_seconds or 0,
            ranking=a.ranking or a.final_rank,
            final_rank=a.final_rank or a.ranking,
        )
        results.append(dto)
    return results


@router.get("/results/{attempt_id}", response_model=AttemptDetailOut)
async def get_result_detail(
    attempt_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    query = (
        select(ExamAttempt)
        .where(ExamAttempt.id == attempt_id)
        .options(
            selectinload(ExamAttempt.student),
            selectinload(ExamAttempt.exam).selectinload(Exam.questions).selectinload(Question.options),
            selectinload(ExamAttempt.answers),
        )
    )
    result = await db.execute(query)
    attempt = result.scalars().first()
    if not attempt:
        raise HTTPException(status_code=404, detail="النتيجة غير موجودة")

    # Build answers detail
    ans_map = {ans.question_id: ans for ans in attempt.answers}
    answers_detail = []
    for q in sorted(attempt.exam.questions, key=lambda x: x.order_index) if attempt.exam else []:
        ans = ans_map.get(q.id)
        correct_opt = next((o for o in q.options if o.is_correct), None)
        if ans:
            opt_id = ans.option_id or ans.selected_option_id
            selected_opt = next((o for o in q.options if o.id == opt_id), None)
            answers_detail.append(AttemptAnswerDetail(
                question_id=q.id,
                question_text=q.text or q.question_text or "",
                question_points=getattr(q, 'points', 1) or 1,
                selected_option_id=opt_id,
                selected_option_text=(selected_opt.text or selected_opt.option_text) if selected_opt else None,
                correct_option_id=correct_opt.id if correct_opt else None,
                correct_option_text=(correct_opt.text or correct_opt.option_text) if correct_opt else None,
                is_correct=ans.is_correct,
                points_awarded=ans.points_awarded or 0,
            ))
        else:
            answers_detail.append(AttemptAnswerDetail(
                question_id=q.id,
                question_text=q.text or q.question_text or "",
                question_points=getattr(q, 'points', 1) or 1,
                selected_option_id=None,
                selected_option_text=None,
                correct_option_id=correct_opt.id if correct_opt else None,
                correct_option_text=(correct_opt.text or correct_opt.option_text) if correct_opt else None,
                is_correct=False,
                points_awarded=0,
            ))

    return AttemptDetailOut(
        id=attempt.id,
        exam_id=attempt.exam_id,
        exam_title=attempt.exam.title if attempt.exam else "",
        student_id=attempt.student_id,
        student_name=attempt.student.name if attempt.student else "",
        started_at=attempt.started_at,
        submitted_at=attempt.submitted_at or attempt.finished_at,
        expires_at=attempt.expires_at,
        status=attempt.status,
        score=attempt.score or 0,
        total_score=attempt.total_score or attempt.total_questions or 0,
        percentage=attempt.percentage or 0.0,
        completion_time_seconds=attempt.completion_time_seconds or attempt.completion_seconds or 0,
        ranking=attempt.ranking or attempt.final_rank,
        answers=answers_detail,
    )


@router.get("/exams/{exam_id}/leaderboard", response_model=List[LeaderboardEntryOut])
async def get_leaderboard(
    exam_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    service = RankingService(db)
    return await service.get_leaderboard(exam_id)


@router.get("/exams/{exam_id}/results/export")
async def export_results_csv(
    exam_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    query = (
        select(ExamAttempt)
        .where(ExamAttempt.exam_id == exam_id)
        .options(selectinload(ExamAttempt.student))
        .order_by(ExamAttempt.score.desc(), ExamAttempt.completion_time_seconds.asc())
    )
    result = await db.execute(query)
    attempts = list(result.scalars().all())

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["الاسم", "الدرجة", "الدرجة الكلية", "النسبة", "الوقت (ثانية)", "الترتيب", "الحالة", "تاريخ المحاولة"])

    for att in attempts:
        writer.writerow([
            att.student.name if att.student else "",
            att.score or 0,
            att.total_score or 0,
            att.percentage or 0,
            att.completion_time_seconds or att.completion_seconds or 0,
            att.ranking or att.final_rank or "",
            att.status,
            (att.submitted_at or att.finished_at or att.started_at).isoformat() if (att.submitted_at or att.finished_at or att.started_at) else "",
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f"attachment; filename=exam_{exam_id}_results.csv"},
    )


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
        average_score_percentage=round(avg_score or 0, 1),
        highest_score_percentage=round(max_score or 0, 1),
    )


@router.get("/dashboard/recent-attempts", response_model=List[AttemptResultOut])
async def get_recent_attempts(
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    query = (
        select(ExamAttempt)
        .options(selectinload(ExamAttempt.student), selectinload(ExamAttempt.exam))
        .order_by(ExamAttempt.started_at.desc())
        .limit(limit)
    )
    result = await db.execute(query)
    attempts = list(result.scalars().all())

    results = []
    for a in attempts:
        results.append(AttemptResultOut(
            id=a.id,
            exam_id=a.exam_id,
            exam_title=a.exam.title if a.exam else "",
            student_id=a.student_id,
            student_name=a.student.name if a.student else "",
            started_at=a.started_at,
            submitted_at=a.submitted_at or a.finished_at,
            finished_at=a.finished_at or a.submitted_at,
            expires_at=a.expires_at,
            status=a.status,
            score=a.score or 0,
            total_score=a.total_score or a.total_questions or 0,
            total_questions=a.total_questions or 0,
            correct_answers=a.correct_answers or 0,
            wrong_answers=a.wrong_answers or 0,
            percentage=a.percentage or 0.0,
            completion_time_seconds=a.completion_time_seconds or a.completion_seconds or 0,
            completion_seconds=a.completion_seconds or a.completion_time_seconds or 0,
            ranking=a.ranking or a.final_rank,
            final_rank=a.final_rank or a.ranking,
        ))
    return results


# Spec-compliant aliases: /api/admin/results and /api/admin/results/{attempt_id}
router.add_api_route(
    "/admin/results",
    list_results,
    methods=["GET"],
    response_model=List[AttemptResultOut],
    include_in_schema=False,
)
router.add_api_route(
    "/admin/results/{attempt_id}",
    get_result_detail,
    methods=["GET"],
    response_model=AttemptDetailOut,
    include_in_schema=False,
)
