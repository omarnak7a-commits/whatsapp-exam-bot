from datetime import datetime
import enum
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime
from sqlalchemy.orm import relationship
from app.db.session import Base


class ExamStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    PUBLISHED = "PUBLISHED"
    CLOSED = "CLOSED"


class Exam(Base):
    __tablename__ = "exams"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    duration_seconds = Column(Integer, nullable=False, default=1200)  # 20 minutes default
    status = Column(String(20), default=ExamStatus.DRAFT.value, nullable=False)
    number_of_questions = Column(Integer, nullable=False, default=10)
    randomize_questions = Column(Boolean, default=True, nullable=False)
    randomize_options = Column(Boolean, default=True, nullable=False)
    one_attempt_only = Column(Boolean, default=True, nullable=False)
    show_correct_answer_immediately = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    published_at = Column(DateTime, nullable=True)
    closed_at = Column(DateTime, nullable=True)

    questions = relationship("Question", back_populates="exam", cascade="all, delete-orphan", order_by="Question.order_index")
    attempts = relationship("ExamAttempt", back_populates="exam", cascade="all, delete-orphan")
