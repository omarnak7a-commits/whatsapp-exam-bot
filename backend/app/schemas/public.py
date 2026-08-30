from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel


class PublicExamDetailOut(BaseModel):
    public_slug: str
    title: str
    description: Optional[str] = None
    duration_minutes: int
    questions_count: int
    total_points: int
    status: str


class CreateAttemptRequest(BaseModel):
    student_name: str


class AttemptOut(BaseModel):
    id: int
    exam_id: int
    student_id: int
    student_name: str
    started_at: datetime
    expires_at: datetime
    status: str
    remaining_seconds: int
    total_questions: int
    total_score: int
    answered_count: int


class PublicQuestionWithOptions(BaseModel):
    id: int
    text: str
    order_index: int
    points: int
    options: List[dict]  # id, text, order_index


class AttemptQuestionOut(BaseModel):
    attempt_id: int
    current_index: int
    total_questions: int
    question: PublicQuestionWithOptions
    remaining_seconds: int
    answered_count: int
    total_questions_count: int


class AnswerRequest(BaseModel):
    question_id: int
    option_id: int


class AnswerOut(BaseModel):
    attempt_id: int
    question_id: int
    option_id: int
    answered_count: int
    next_question_id: Optional[int] = None
    is_last: bool = False


class SubmitOut(BaseModel):
    id: int
    score: int
    total_score: int
    percentage: float
    completion_time_seconds: int
    ranking: Optional[int] = None
    correct_answers: int
    wrong_answers: int
    unanswered: int
    total_questions: int


class ResultOut(BaseModel):
    attempt_id: int
    student_name: str
    exam_title: str
    score: int
    total_score: int
    percentage: float
    completion_time_seconds: int
    ranking: Optional[int] = None
    total_ranked: int
    correct_answers: int
    wrong_answers: int
    unanswered: int
    answers: List[dict]
    leaderboard: List[dict]
