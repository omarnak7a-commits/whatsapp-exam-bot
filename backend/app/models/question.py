from datetime import datetime, timezone
from sqlalchemy import Column, Integer, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.db.session import Base


def _utcnow():
    return datetime.now(timezone.utc)


class Question(Base):
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, index=True)
    exam_id = Column(Integer, ForeignKey("exams.id", ondelete="CASCADE"), nullable=False, index=True)

    # New canonical field
    text = Column(Text, nullable=True)
    # Legacy field kept for backward compatibility
    question_text = Column(Text, nullable=True)

    order_index = Column(Integer, default=0, nullable=False)
    points = Column(Integer, default=1, nullable=False)

    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow, nullable=False)

    exam = relationship("Exam", back_populates="questions")
    options = relationship("Option", back_populates="question", cascade="all, delete-orphan", order_by="Option.order_index")
    answers = relationship("AttemptAnswer", back_populates="question", cascade="all, delete-orphan")

    @property
    def display_text(self):
        return self.text or self.question_text or ""
