from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict
from app.models.exam import ExamStatus
from app.schemas.question import QuestionOut


class ExamBase(BaseModel):
    title: str
    description: Optional[str] = None
    duration_minutes: int = 20
    # Legacy support
    duration_seconds: Optional[int] = None
    instant_feedback_enabled: bool = False
    show_correct_answers: bool = True
    leaderboard_enabled: bool = True


class ExamCreate(ExamBase):
    pass


class ExamUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    duration_minutes: Optional[int] = None
    duration_seconds: Optional[int] = None
    status: Optional[ExamStatus] = None
    instant_feedback_enabled: Optional[bool] = None
    show_correct_answers: Optional[bool] = None
    leaderboard_enabled: Optional[bool] = None


class ExamOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: Optional[str] = None
    public_slug: Optional[str] = None
    duration_minutes: int
    duration_seconds: int
    status: ExamStatus
    instant_feedback_enabled: bool = False
    show_correct_answers: bool = True
    leaderboard_enabled: bool = True
    created_at: datetime
    updated_at: datetime
    published_at: Optional[datetime] = None
    closed_at: Optional[datetime] = None
    total_questions_count: Optional[int] = 0
    total_attempts_count: Optional[int] = 0


class ExamDetailOut(ExamOut):
    questions: List[QuestionOut] = []


class PublicExamOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: Optional[str] = None
    public_slug: str
    duration_minutes: int
    status: ExamStatus
    questions_count: int
    total_points: int
