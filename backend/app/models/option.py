from sqlalchemy import Column, Integer, String, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.db.session import Base


class Option(Base):
    __tablename__ = "options"

    id = Column(Integer, primary_key=True, index=True)
    question_id = Column(Integer, ForeignKey("questions.id", ondelete="CASCADE"), nullable=False, index=True)
    option_text = Column(String(500), nullable=False)
    is_correct = Column(Boolean, default=False, nullable=False)
    order_index = Column(Integer, default=0, nullable=False)

    question = relationship("Question", back_populates="options")
