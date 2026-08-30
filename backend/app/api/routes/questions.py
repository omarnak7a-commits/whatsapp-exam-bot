from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from app.db.session import get_db
from app.schemas.question import QuestionCreate, QuestionUpdate, QuestionOut, OptionOut
from app.services.question_service import QuestionService
from app.api.dependencies import get_current_admin
from app.models.admin import Admin

router = APIRouter(tags=["Questions"])


class ReorderRequest(BaseModel):
    ordered_ids: List[int]


@router.get("/exams/{exam_id}/questions", response_model=List[QuestionOut])
async def list_questions(
    exam_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    service = QuestionService(db)
    questions = await service.get_questions_by_exam(exam_id)
    result = []
    for q in sorted(questions, key=lambda x: x.order_index):
        opts = []
        for o in sorted(q.options, key=lambda x: x.order_index):
            opts.append(OptionOut(
                id=o.id,
                question_id=o.question_id,
                text=o.text or o.option_text or "",
                is_correct=o.is_correct,
                order_index=o.order_index,
            ))
        result.append(QuestionOut(
            id=q.id,
            exam_id=q.exam_id,
            text=q.text or q.question_text or "",
            order_index=q.order_index,
            points=getattr(q, 'points', 1) or 1,
            question_type=getattr(q, 'question_type', 'multiple_choice') or 'multiple_choice',
            created_at=q.created_at,
            options=opts,
        ))
    return result


@router.post("/exams/{exam_id}/questions", response_model=QuestionOut, status_code=status.HTTP_201_CREATED)
async def add_question(
    exam_id: int,
    data: QuestionCreate,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    service = QuestionService(db)
    q = await service.add_question(exam_id, data)
    opts = []
    for o in sorted(q.options, key=lambda x: x.order_index):
        opts.append(OptionOut(
            id=o.id,
            question_id=o.question_id,
            text=o.text or o.option_text or "",
            is_correct=o.is_correct,
            order_index=o.order_index,
        ))
    return QuestionOut(
        id=q.id,
        exam_id=q.exam_id,
        text=q.text or q.question_text or "",
        order_index=q.order_index,
        points=getattr(q, 'points', 1) or 1,
        question_type=getattr(q, 'question_type', 'multiple_choice') or 'multiple_choice',
        created_at=q.created_at,
        options=opts,
    )


@router.patch("/questions/{question_id}", response_model=QuestionOut)
async def patch_question(
    question_id: int,
    data: QuestionUpdate,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    service = QuestionService(db)
    q = await service.update_question(question_id, data)
    opts = []
    for o in sorted(q.options, key=lambda x: x.order_index):
        opts.append(OptionOut(
            id=o.id,
            question_id=o.question_id,
            text=o.text or o.option_text or "",
            is_correct=o.is_correct,
            order_index=o.order_index,
        ))
    return QuestionOut(
        id=q.id,
        exam_id=q.exam_id,
        text=q.text or q.question_text or "",
        order_index=q.order_index,
        points=getattr(q, 'points', 1) or 1,
        question_type=getattr(q, 'question_type', 'multiple_choice') or 'multiple_choice',
        created_at=q.created_at,
        options=opts,
    )


@router.put("/questions/{question_id}", response_model=QuestionOut)
async def update_question(
    question_id: int,
    data: QuestionUpdate,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    return await patch_question(question_id, data, db, current_admin)


@router.delete("/questions/{question_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_question(
    question_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    service = QuestionService(db)
    await service.delete_question(question_id)


@router.post("/exams/{exam_id}/questions/reorder", response_model=List[QuestionOut])
async def reorder_questions(
    exam_id: int,
    data: ReorderRequest,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    service = QuestionService(db)
    questions = await service.reorder_questions(exam_id, data.ordered_ids)
    result = []
    for q in sorted(questions, key=lambda x: x.order_index):
        opts = []
        for o in sorted(q.options, key=lambda x: x.order_index):
            opts.append(OptionOut(
                id=o.id,
                question_id=o.question_id,
                text=o.text or o.option_text or "",
                is_correct=o.is_correct,
                order_index=o.order_index,
            ))
        result.append(QuestionOut(
            id=q.id,
            exam_id=q.exam_id,
            text=q.text or q.question_text or "",
            order_index=q.order_index,
            points=getattr(q, 'points', 1) or 1,
            question_type=getattr(q, 'question_type', 'multiple_choice') or 'multiple_choice',
            created_at=q.created_at,
            options=opts,
        ))
    return result


@router.post("/questions/{question_id}/duplicate", response_model=QuestionOut)
async def duplicate_question(
    question_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    service = QuestionService(db)
    q = await service.duplicate_question(question_id)
    opts = []
    for o in sorted(q.options, key=lambda x: x.order_index):
        opts.append(OptionOut(
            id=o.id,
            question_id=o.question_id,
            text=o.text or o.option_text or "",
            is_correct=o.is_correct,
            order_index=o.order_index,
        ))
    return QuestionOut(
        id=q.id,
        exam_id=q.exam_id,
        text=q.text or q.question_text or "",
        order_index=q.order_index,
        points=getattr(q, 'points', 1) or 1,
        question_type=getattr(q, 'question_type', 'multiple_choice') or 'multiple_choice',
        created_at=q.created_at,
        options=opts,
    )
