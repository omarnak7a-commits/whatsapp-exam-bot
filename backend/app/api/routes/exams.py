from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.db.session import get_db
from app.schemas.exam import ExamCreate, ExamUpdate, ExamOut, ExamDetailOut
from app.schemas.question import QuestionOut, OptionOut
from app.services.exam_service import ExamService
from app.api.dependencies import get_current_admin
from app.models.admin import Admin
from app.models.exam import Exam
from app.models.question import Question

router = APIRouter(prefix="/exams", tags=["Exams"])


@router.get("", response_model=List[ExamOut])
async def list_exams(
    status: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    service = ExamService(db)
    return await service.list_exams(status_filter=status)


@router.post("", response_model=ExamOut, status_code=status.HTTP_201_CREATED)
async def create_exam(
    data: ExamCreate,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    service = ExamService(db)
    exam = await service.create_exam(data)
    # Build response manually to match ExamOut
    q_count = 0
    return ExamOut(
        id=exam.id,
        title=exam.title,
        description=exam.description,
        public_slug=exam.public_slug,
        duration_minutes=exam.duration_minutes,
        duration_seconds=exam.duration_seconds,
        status=exam.status,
        created_at=exam.created_at,
        updated_at=exam.updated_at,
        published_at=exam.published_at,
        closed_at=exam.closed_at,
        total_questions_count=q_count,
        total_attempts_count=0,
    )


@router.get("/{exam_id}", response_model=ExamDetailOut)
async def get_exam(
    exam_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    service = ExamService(db)
    exam = await service.get_exam(exam_id, include_questions=True)

    # Convert questions
    questions_out = []
    for q in sorted(exam.questions, key=lambda x: x.order_index):
        opts = []
        for o in sorted(q.options, key=lambda x: x.order_index):
            opts.append(OptionOut(
                id=o.id,
                question_id=o.question_id,
                text=o.text or o.option_text or "",
                is_correct=o.is_correct,
                order_index=o.order_index,
            ))
        questions_out.append(QuestionOut(
            id=q.id,
            exam_id=q.exam_id,
            text=q.text or q.question_text or "",
            order_index=q.order_index,
            points=getattr(q, 'points', 1) or 1,
            created_at=q.created_at,
            options=opts,
        ))

    q_count = len(questions_out)
    # Attempts count
    from app.repositories.exam_repository import ExamRepository
    repo = ExamRepository(db)
    a_count = await repo.get_attempts_count(exam.id)

    return ExamDetailOut(
        id=exam.id,
        title=exam.title,
        description=exam.description,
        public_slug=exam.public_slug,
        duration_minutes=exam.duration_minutes,
        duration_seconds=exam.duration_seconds,
        status=exam.status,
        created_at=exam.created_at,
        updated_at=exam.updated_at,
        published_at=exam.published_at,
        closed_at=exam.closed_at,
        total_questions_count=q_count,
        total_attempts_count=a_count,
        questions=questions_out,
    )


@router.patch("/{exam_id}", response_model=ExamOut)
async def patch_exam(
    exam_id: int,
    data: ExamUpdate,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    service = ExamService(db)
    exam = await service.update_exam(exam_id, data)
    q_count = await service.repo.get_questions_count(exam.id)
    a_count = await service.repo.get_attempts_count(exam.id)
    return ExamOut(
        id=exam.id,
        title=exam.title,
        description=exam.description,
        public_slug=exam.public_slug,
        duration_minutes=exam.duration_minutes,
        duration_seconds=exam.duration_seconds,
        status=exam.status,
        created_at=exam.created_at,
        updated_at=exam.updated_at,
        published_at=exam.published_at,
        closed_at=exam.closed_at,
        total_questions_count=q_count,
        total_attempts_count=a_count,
    )


@router.put("/{exam_id}", response_model=ExamOut)
async def update_exam(
    exam_id: int,
    data: ExamUpdate,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    return await patch_exam(exam_id, data, db, current_admin)


@router.delete("/{exam_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_exam(
    exam_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    service = ExamService(db)
    await service.delete_exam(exam_id)


@router.post("/{exam_id}/publish", response_model=ExamOut)
async def publish_exam(
    exam_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    service = ExamService(db)
    exam = await service.publish_exam(exam_id)
    q_count = await service.repo.get_questions_count(exam.id)
    a_count = await service.repo.get_attempts_count(exam.id)
    return ExamOut(
        id=exam.id,
        title=exam.title,
        description=exam.description,
        public_slug=exam.public_slug,
        duration_minutes=exam.duration_minutes,
        duration_seconds=exam.duration_seconds,
        status=exam.status,
        created_at=exam.created_at,
        updated_at=exam.updated_at,
        published_at=exam.published_at,
        closed_at=exam.closed_at,
        total_questions_count=q_count,
        total_attempts_count=a_count,
    )


@router.post("/{exam_id}/close", response_model=ExamOut)
async def close_exam(
    exam_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    service = ExamService(db)
    exam = await service.close_exam(exam_id)
    q_count = await service.repo.get_questions_count(exam.id)
    a_count = await service.repo.get_attempts_count(exam.id)
    return ExamOut(
        id=exam.id,
        title=exam.title,
        description=exam.description,
        public_slug=exam.public_slug,
        duration_minutes=exam.duration_minutes,
        duration_seconds=exam.duration_seconds,
        status=exam.status,
        created_at=exam.created_at,
        updated_at=exam.updated_at,
        published_at=exam.published_at,
        closed_at=exam.closed_at,
        total_questions_count=q_count,
        total_attempts_count=a_count,
    )


@router.post("/{exam_id}/duplicate", response_model=ExamOut)
async def duplicate_exam(
    exam_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    service = ExamService(db)
    exam = await service.duplicate_exam(exam_id)
    q_count = await service.repo.get_questions_count(exam.id)
    return ExamOut(
        id=exam.id,
        title=exam.title,
        description=exam.description,
        public_slug=exam.public_slug,
        duration_minutes=exam.duration_minutes,
        duration_seconds=exam.duration_seconds,
        status=exam.status,
        created_at=exam.created_at,
        updated_at=exam.updated_at,
        published_at=exam.published_at,
        closed_at=exam.closed_at,
        total_questions_count=q_count,
        total_attempts_count=0,
    )
