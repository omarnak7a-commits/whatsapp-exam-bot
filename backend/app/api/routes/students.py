from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.schemas.student import StudentOut
from app.services.student_service import StudentService
from app.api.dependencies import get_current_admin
from app.models.admin import Admin

router = APIRouter(prefix="/students", tags=["Students"])


@router.get("", response_model=List[StudentOut])
async def list_students(
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    service = StudentService(db)
    return await service.list_students()


@router.get("/{student_id}", response_model=StudentOut)
async def get_student(
    student_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    service = StudentService(db)
    student = await service.repo.get_by_id(student_id)
    if not student:
        raise HTTPException(status_code=404, detail="الطالب غير موجود")
    return StudentOut.model_validate(student)
