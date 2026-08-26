from datetime import datetime, timezone
from sqlalchemy import Integer, DateTime, ForeignKey, String, Boolean, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base

class ExamAttempt(Base):
    __tablename__="exam_attempts"
    id: Mapped[int]=mapped_column(primary_key=True)
    exam_id: Mapped[int]=mapped_column(ForeignKey("exams.id"), index=True)
    student_id: Mapped[int]=mapped_column(ForeignKey("students.id"), index=True)
    started_at: Mapped[datetime]=mapped_column(DateTime(timezone=True))
    finished_at: Mapped[datetime|None]=mapped_column(DateTime(timezone=True), nullable=True)
    expires_at: Mapped[datetime]=mapped_column(DateTime(timezone=True), index=True)
    status: Mapped[str]=mapped_column(String(20), default="IN_PROGRESS", index=True)
    score: Mapped[int]=mapped_column(Integer, default=0)
    total_questions: Mapped[int]=mapped_column(Integer, default=0)
    correct_answers: Mapped[int]=mapped_column(Integer, default=0)
    wrong_answers: Mapped[int]=mapped_column(Integer, default=0)
    percentage: Mapped[float]=mapped_column(default=0)
    completion_seconds: Mapped[int|None]=mapped_column(Integer, nullable=True)
    final_rank: Mapped[int|None]=mapped_column(Integer, nullable=True)

class AttemptQuestion(Base):
    __tablename__="attempt_questions"
    id: Mapped[int]=mapped_column(primary_key=True)
    attempt_id: Mapped[int]=mapped_column(ForeignKey("exam_attempts.id", ondelete="CASCADE"), index=True)
    question_id: Mapped[int]=mapped_column(ForeignKey("questions.id"), index=True)
    position: Mapped[int]=mapped_column(Integer)
    __table_args__=(UniqueConstraint("attempt_id","question_id",name="uq_attempt_question"), UniqueConstraint("attempt_id","position",name="uq_attempt_position"))

class AttemptOption(Base):
    __tablename__="attempt_options"
    id: Mapped[int]=mapped_column(primary_key=True)
    attempt_id: Mapped[int]=mapped_column(ForeignKey("exam_attempts.id", ondelete="CASCADE"), index=True)
    question_id: Mapped[int]=mapped_column(ForeignKey("questions.id"), index=True)
    option_id: Mapped[int]=mapped_column(ForeignKey("options.id"))
    position: Mapped[int]=mapped_column(Integer)
    __table_args__=(UniqueConstraint("attempt_id","question_id","option_id",name="uq_attempt_option"), UniqueConstraint("attempt_id","question_id","position",name="uq_attempt_option_position"))

class AttemptAnswer(Base):
    __tablename__="attempt_answers"
    id: Mapped[int]=mapped_column(primary_key=True)
    attempt_id: Mapped[int]=mapped_column(ForeignKey("exam_attempts.id", ondelete="CASCADE"), index=True)
    question_id: Mapped[int]=mapped_column(ForeignKey("questions.id"), index=True)
    selected_option_id: Mapped[int]=mapped_column(ForeignKey("options.id"))
    is_correct: Mapped[bool]=mapped_column(Boolean)
    answered_at: Mapped[datetime]=mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    __table_args__=(UniqueConstraint("attempt_id","question_id",name="uq_attempt_answer"),)
