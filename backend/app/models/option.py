from sqlalchemy import Column, Integer, String, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.db.session import Base


class Option(Base):
    __tablename__ = "options"

    id = Column(Integer, primary_key=True, index=True)
    question_id = Column(Integer, ForeignKey("questions.id", ondelete="CASCADE"), nullable=False, index=True)

    # New canonical field
    text = Column(String(1000), nullable=True)
    # Legacy
    option_text = Column(String(1000), nullable=True)

    is_correct = Column(Boolean, default=False, nullable=False)
    order_index = Column(Integer, default=0, nullable=False)

    question = relationship("Question", back_populates="options")

    @property
    def display_text(self):
        return self.text or self.option_text or ""
