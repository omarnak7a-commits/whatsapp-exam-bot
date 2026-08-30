from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.orm import relationship
from app.db.session import Base


def _utcnow():
    return datetime.now(timezone.utc)


class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)

    # Legacy WhatsApp field - now nullable and not unique to allow web-only flow
    whatsapp_number = Column(String(50), nullable=True, index=True)

    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow, nullable=False)

    attempts = relationship("ExamAttempt", back_populates="student", cascade="all, delete-orphan")
