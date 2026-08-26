from datetime import datetime, timezone
from sqlalchemy import String, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base

class ProcessedWebhook(Base):
    __tablename__="processed_webhooks"
    id: Mapped[int]=mapped_column(primary_key=True)
    message_id: Mapped[str]=mapped_column(String(255), unique=True, index=True)
    processed_at: Mapped[datetime]=mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
