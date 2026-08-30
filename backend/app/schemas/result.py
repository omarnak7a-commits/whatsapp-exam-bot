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
    started_at: datetime
    submitted_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None
    expires_at: datetime
    status: AttemptStatus
    score: int
    total_score: int
    total_questions: int
    correct_answers: int
    wrong_answers: int
    percentage: float
    completion_time_seconds: int
    completion_seconds: int
    ranking: Optional[int] = None
    final_rank: Optional[int] = None


class LeaderboardEntryOut(BaseModel):
    rank: int
    student_name: str
    student_id: int
    score: int
    total_score: int
    percentage: float
    completion_time_seconds: int
    submitted_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None


class PublicLeaderboardEntryOut(BaseModel):
    rank: int
    student_name: str
    score: int
    total_score: int
    percentage: float
    completion_time_seconds: int


class AdminDashboardStats(BaseModel):
    total_exams: int
    published_exams: int
    total_students: int
    total_completed_attempts: int
    average_score_percentage: float
    highest_score_percentage: float


class AttemptAnswerDetail(BaseModel):
    question_id: int
    question_text: str
    question_points: int
    selected_option_id: Optional[int] = None
    selected_option_text: Optional[str] = None
    correct_option_id: Optional[int] = None
    correct_option_text: Optional[str] = None
    is_correct: bool
    points_awarded: int


class AttemptDetailOut(BaseModel):
    id: int
    exam_id: int
    exam_title: str
    student_id: int
    student_name: str
    started_at: datetime
    submitted_at: Optional[datetime] = None
    expires_at: datetime
    status: AttemptStatus
    score: int
    total_score: int
    percentage: float
    completion_time_seconds: int
    ranking: Optional[int] = None
    answers: List[AttemptAnswerDetail] = []
