from datetime import datetime, timezone
from sqlalchemy import Column, Integer, Boolean, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.db.session import Base


def _utcnow():
    return datetime.now(timezone.utc)


class AttemptAnswer(Base):
    __tablename__ = "attempt_answers"

    id = Column(Integer, primary_key=True, index=True)
    attempt_id = Column(Integer, ForeignKey("exam_attempts.id", ondelete="CASCADE"), nullable=False, index=True)
    question_id = Column(Integer, ForeignKey("questions.id", ondelete="CASCADE"), nullable=False, index=True)

    # New canonical
    option_id = Column(Integer, ForeignKey("options.id", ondelete="CASCADE"), nullable=True)
    # Legacy
    selected_option_id = Column(Integer, ForeignKey("options.id", ondelete="CASCADE"), nullable=True)

    is_correct = Column(Boolean, default=False, nullable=False)
    points_awarded = Column(Integer, default=0, nullable=False)
    answered_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)

    __table_args__ = (
        UniqueConstraint("attempt_id", "question_id", name="uq_attempt_question"),
    )

    attempt = relationship("ExamAttempt", back_populates="answers")
    question = relationship("Question", back_populates="answers")

    @property
    def effective_option_id(self):
        return self.option_id or self.selected_option_id
