from datetime import datetime, timezone
import enum
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime
from sqlalchemy.orm import relationship
from app.db.session import Base


def _utcnow():
    return datetime.now(timezone.utc)


class ExamStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    PUBLISHED = "PUBLISHED"
    CLOSED = "CLOSED"


class Exam(Base):
    __tablename__ = "exams"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)

    # New public slug for web flow
    public_slug = Column(String(100), unique=True, index=True, nullable=True)

    # New duration in minutes (primary), keep seconds for backward compat
    duration_minutes = Column(Integer, nullable=False, default=20)
    duration_seconds = Column(Integer, nullable=False, default=1200)

    status = Column(String(20), default=ExamStatus.DRAFT.value, nullable=False, index=True)
    # Legacy fields kept for compatibility but not used in new flow
    number_of_questions = Column(Integer, nullable=False, default=10)
    randomize_questions = Column(Boolean, default=False, nullable=False)
    randomize_options = Column(Boolean, default=False, nullable=False)
    one_attempt_only = Column(Boolean, default=False, nullable=False)
    show_correct_answer_immediately = Column(Boolean, default=False, nullable=False)

    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow, nullable=False)
    published_at = Column(DateTime(timezone=True), nullable=True)
    closed_at = Column(DateTime(timezone=True), nullable=True)

    questions = relationship("Question", back_populates="exam", cascade="all, delete-orphan", order_by="Question.order_index")
    attempts = relationship("ExamAttempt", back_populates="exam", cascade="all, delete-orphan")
