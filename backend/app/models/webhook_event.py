from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime
from app.db.session import Base


class WebhookEvent(Base):
    __tablename__ = "webhook_events"

    id = Column(Integer, primary_key=True, index=True)
    message_id = Column(String(255), unique=True, index=True, nullable=False)
    processed_at = Column(DateTime, default=datetime.utcnow, nullable=False)
