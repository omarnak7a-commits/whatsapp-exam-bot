from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict
from app.models.exam_attempt import AttemptStatus


class AttemptResultOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    exam_id: int
    exam_title: str
    student_id: int
    student_name: str
    student_whatsapp: str
    started_at: datetime
    finished_at: Optional[datetime] = None
    expires_at: datetime
    status: AttemptStatus
    score: float
    total_questions: int
    correct_answers: int
    wrong_answers: int
    percentage: float
    completion_seconds: int
    final_rank: Optional[int] = None


class LeaderboardEntryOut(BaseModel):
    rank: int
    student_name: str
    whatsapp_number: str
    score: float
    total_questions: int
    percentage: float
    completion_seconds: int
    finished_at: datetime


class AdminDashboardStats(BaseModel):
    total_exams: int
    published_exams: int
    total_students: int
    total_completed_attempts: int
    average_score_percentage: float
    highest_score_percentage: float
