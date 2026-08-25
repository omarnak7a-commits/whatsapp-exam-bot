from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class StudentBase(BaseModel):
    name: str
    whatsapp_number: str


class StudentCreate(StudentBase):
    pass


class StudentOut(StudentBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    is_active: bool
    created_at: datetime
    total_attempts: Optional[int] = 0
    average_score: Optional[float] = 0.0
    best_score: Optional[float] = 0.0
