from datetime import datetime
import enum
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.db.session import Base


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
    started_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    finished_at = Column(DateTime, nullable=True)
    expires_at = Column(DateTime, nullable=False)
    status = Column(String(20), default=AttemptStatus.IN_PROGRESS.value, nullable=False)
    score = Column(Float, default=0.0, nullable=False)
    total_questions = Column(Integer, default=0, nullable=False)
    correct_answers = Column(Integer, default=0, nullable=False)
    wrong_answers = Column(Integer, default=0, nullable=False)
    percentage = Column(Float, default=0.0, nullable=False)
    completion_seconds = Column(Integer, default=0, nullable=False)
    final_rank = Column(Integer, nullable=True)
    
    # Store persistent question sequence and option sequence per question as JSON string
    question_order_json = Column(Text, nullable=True)
    option_order_json = Column(Text, nullable=True)

    exam = relationship("Exam", back_populates="attempts")
    student = relationship("Student", back_populates="attempts")
    answers = relationship("AttemptAnswer", back_populates="attempt", cascade="all, delete-orphan")
