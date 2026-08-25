from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.schemas.exam import ExamCreate, ExamUpdate, ExamOut, ExamDetailOut
from app.services.exam_service import ExamService
from app.api.dependencies import get_current_admin
from app.models.admin import Admin

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
    return await service.create_exam(data)


@router.get("/{exam_id}", response_model=ExamDetailOut)
async def get_exam(
    exam_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    service = ExamService(db)
    return await service.get_exam(exam_id, include_questions=True)


@router.put("/{exam_id}", response_model=ExamOut)
async def update_exam(
    exam_id: int,
    data: ExamUpdate,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    service = ExamService(db)
    return await service.update_exam(exam_id, data)


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
    return await service.publish_exam(exam_id)


@router.post("/{exam_id}/close", response_model=ExamOut)
async def close_exam(
    exam_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    service = ExamService(db)
    return await service.close_exam(exam_id)
