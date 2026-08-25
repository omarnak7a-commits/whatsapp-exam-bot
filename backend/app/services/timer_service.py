from datetime import datetime, timedelta
from app.models.exam_attempt import ExamAttempt, AttemptStatus


class TimerService:
    @staticmethod
    def calculate_expiration(started_at: datetime, duration_seconds: int) -> datetime:
        return started_at + timedelta(seconds=duration_seconds)

    @staticmethod
    def is_expired(expires_at: datetime, current_time: datetime = None) -> bool:
        if current_time is None:
            current_time = datetime.utcnow()
        return current_time > expires_at
