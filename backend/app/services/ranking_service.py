from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload
from app.models.exam_attempt import ExamAttempt, AttemptStatus
from app.schemas.result import LeaderboardEntryOut


class RankingService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def update_exam_rankings(self, exam_id: int) -> None:
        # Get all completed attempts ordered by ranking rules:
        # 1. Higher score first
        # 2. Lower completion time
        # 3. Earlier submitted_at
        query = (
            select(ExamAttempt)
            .where(
                and_(
                    ExamAttempt.exam_id == exam_id,
                    ExamAttempt.status == AttemptStatus.COMPLETED.value,
                )
            )
            .order_by(
                ExamAttempt.score.desc(),
                ExamAttempt.completion_time_seconds.asc(),
                ExamAttempt.submitted_at.asc(),
                ExamAttempt.finished_at.asc(),
            )
        )
        result = await self.db.execute(query)
        attempts = list(result.scalars().all())

        for idx, att in enumerate(attempts, start=1):
            # Update both new and legacy fields
            if att.ranking != idx or att.final_rank != idx:
                att.ranking = idx
                att.final_rank = idx

        await self.db.flush()

    async def get_leaderboard(self, exam_id: int) -> List[LeaderboardEntryOut]:
        await self.update_exam_rankings(exam_id)
        query = (
            select(ExamAttempt)
            .where(
                and_(
                    ExamAttempt.exam_id == exam_id,
                    ExamAttempt.status == AttemptStatus.COMPLETED.value,
                )
            )
            .options(selectinload(ExamAttempt.student))
            .order_by(
                ExamAttempt.ranking.asc(),
            )
        )
        result = await self.db.execute(query)
        attempts = list(result.scalars().all())

        leaderboard = []
        for att in attempts:
            # Effective values
            score = att.score or 0
            total_score = att.total_score or att.total_questions or 0
            completion = att.completion_time_seconds or att.completion_seconds or 0
            submitted = att.submitted_at or att.finished_at

            leaderboard.append(
                LeaderboardEntryOut(
                    rank=att.ranking or att.final_rank or 0,
                    student_name=att.student.name if att.student else "طالب",
                    student_id=att.student_id,
                    score=score,
                    total_score=total_score,
                    percentage=round(att.percentage or 0, 1),
                    completion_time_seconds=completion,
                    submitted_at=submitted,
                    finished_at=submitted,
                )
            )
        return leaderboard

    async def get_attempt_rank(self, attempt_id: int) -> int:
        from app.repositories.attempt_repository import AttemptRepository
        repo = AttemptRepository(self.db)
        attempt = await repo.get_by_id(attempt_id)
        if not attempt:
            return 0
        await self.update_exam_rankings(attempt.exam_id)
        # Refresh
        attempt = await repo.get_by_id(attempt_id)
        return attempt.ranking or attempt.final_rank or 0
