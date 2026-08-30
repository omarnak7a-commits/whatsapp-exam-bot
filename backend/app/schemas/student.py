from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict


class StudentBase(BaseModel):
    name: str


class StudentCreate(StudentBase):
    pass


class StudentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    is_active: bool
    created_at: datetime
    total_attempts: Optional[int] = 0
    average_score: Optional[float] = 0.0
    best_score: Optional[float] = 0.0
    exams_participated: Optional[int] = 0
    last_attempt_at: Optional[datetime] = None


class PublicStudentCreate(BaseModel):
    name: str


class StudentAggregatedOut(BaseModel):
    id: int
    name: str
    total_attempts: int
    average_percentage: float
    best_percentage: float
    exams_count: int
    last_attempt_at: Optional[datetime] = None
