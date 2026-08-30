from datetime import datetime, timezone
import enum
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.db.session import Base


def _utcnow():
    return datetime.now(timezone.utc)


class AttemptStatus(str, enum.Enum):
    NOT_STARTED = "NOT_STARTED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    EXPIRED = "EXPIRED"
    CANCELLED = "CANCELLED"


class ExamAttempt(Base):
    __tablename__ = "exam_attempts"

    id = Column(Integer, primary_key=True, index=True)
    exam_id = Column(Integer, ForeignKey("exams.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)

    started_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)
    # New canonical
    submitted_at = Column(DateTime(timezone=True), nullable=True)
    # Legacy
    finished_at = Column(DateTime(timezone=True), nullable=True)

    expires_at = Column(DateTime(timezone=True), nullable=False, index=True)
    status = Column(String(20), default=AttemptStatus.IN_PROGRESS.value, nullable=False, index=True)

    # Scoring - new canonical fields
    score = Column(Integer, default=0, nullable=False)
    total_score = Column(Integer, default=0, nullable=False)
    percentage = Column(Float, default=0.0, nullable=False)

    # Legacy counters kept for compatibility
    total_questions = Column(Integer, default=0, nullable=False)
    correct_answers = Column(Integer, default=0, nullable=False)
    wrong_answers = Column(Integer, default=0, nullable=False)

    # Time - new canonical
    completion_time_seconds = Column(Integer, default=0, nullable=False)
    # Legacy
    completion_seconds = Column(Integer, default=0, nullable=False)

    # Ranking - new canonical
    ranking = Column(Integer, nullable=True, index=True)
    # Legacy
    final_rank = Column(Integer, nullable=True)

    # Persisted order for randomization (optional)
    question_order_json = Column(Text, nullable=True)
    option_order_json = Column(Text, nullable=True)

    exam = relationship("Exam", back_populates="attempts")
    student = relationship("Student", back_populates="attempts")
    answers = relationship("AttemptAnswer", back_populates="attempt", cascade="all, delete-orphan")

    @property
    def effective_submitted_at(self):
        return self.submitted_at or self.finished_at

    @property
    def effective_completion_seconds(self):
        return self.completion_time_seconds or self.completion_seconds or 0

    @property
    def effective_ranking(self):
        return self.ranking or self.final_rank
