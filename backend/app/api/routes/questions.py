from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.schemas.question import QuestionCreate, QuestionUpdate, QuestionOut
from app.services.question_service import QuestionService
from app.api.dependencies import get_current_admin
from app.models.admin import Admin

router = APIRouter(tags=["Questions"])


@router.get("/exams/{exam_id}/questions", response_model=List[QuestionOut])
async def list_questions(
    exam_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    service = QuestionService(db)
    return await service.get_questions_by_exam(exam_id)


@router.post("/exams/{exam_id}/questions", response_model=QuestionOut, status_code=status.HTTP_201_CREATED)
async def add_question(
    exam_id: int,
    data: QuestionCreate,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    service = QuestionService(db)
    return await service.add_question(exam_id, data)


@router.put("/questions/{question_id}", response_model=QuestionOut)
async def update_question(
    question_id: int,
    data: QuestionUpdate,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    service = QuestionService(db)
    return await service.update_question(question_id, data)


@router.delete("/questions/{question_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_question(
    question_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    service = QuestionService(db)
    await service.delete_question(question_id)
