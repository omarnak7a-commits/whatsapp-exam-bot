from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict
from app.models.exam import ExamStatus
from app.schemas.question import QuestionOut


class ExamBase(BaseModel):
    title: str
    description: Optional[str] = None
    duration_seconds: int = 1200
    number_of_questions: int = 10
    randomize_questions: bool = True
    randomize_options: bool = True
    one_attempt_only: bool = True
    show_correct_answer_immediately: bool = True


class ExamCreate(ExamBase):
    pass


class ExamUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    duration_seconds: Optional[int] = None
    number_of_questions: Optional[int] = None
    randomize_questions: Optional[bool] = None
    randomize_options: Optional[bool] = None
    one_attempt_only: Optional[bool] = None
    show_correct_answer_immediately: Optional[bool] = None


class ExamOut(ExamBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    status: ExamStatus
    created_at: datetime
    updated_at: datetime
    published_at: Optional[datetime] = None
    closed_at: Optional[datetime] = None
    total_questions_count: Optional[int] = 0
    total_attempts_count: Optional[int] = 0


class ExamDetailOut(ExamOut):
    questions: List[QuestionOut] = []
