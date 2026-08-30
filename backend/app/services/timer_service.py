from datetime import datetime, timedelta, timezone


def _utcnow():
    return datetime.now(timezone.utc)


class TimerService:
    @staticmethod
    def calculate_expiration(started_at: datetime, duration_seconds: int) -> datetime:
        if started_at.tzinfo is None:
            started_at = started_at.replace(tzinfo=timezone.utc)
        return started_at + timedelta(seconds=duration_seconds)

    @staticmethod
    def calculate_remaining_seconds(expires_at: datetime, current_time: datetime = None) -> int:
        if current_time is None:
            current_time = _utcnow()
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if current_time.tzinfo is None:
            current_time = current_time.replace(tzinfo=timezone.utc)
        delta = (expires_at - current_time).total_seconds()
        return max(0, int(delta))

    @staticmethod
    def is_expired(expires_at: datetime, current_time: datetime = None) -> bool:
        return TimerService.calculate_remaining_seconds(expires_at, current_time) <= 0

    @staticmethod
    def calculate_completion_seconds(started_at: datetime, submitted_at: datetime) -> int:
        if started_at.tzinfo is None:
            started_at = started_at.replace(tzinfo=timezone.utc)
        if submitted_at.tzinfo is None:
            submitted_at = submitted_at.replace(tzinfo=timezone.utc)
        diff = (submitted_at - started_at).total_seconds()
        return max(1, int(diff))
