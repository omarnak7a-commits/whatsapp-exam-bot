from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.attempt_repository import AttemptRepository
from app.schemas.result import LeaderboardEntryOut


class RankingService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = AttemptRepository(db)

    async def update_exam_rankings(self, exam_id: int) -> None:
        attempts = await self.repo.get_completed_attempts_for_exam(exam_id)
        for idx, att in enumerate(attempts, start=1):
            if att.final_rank != idx:
                att.final_rank = idx
                await self.repo.update(att)

    async def get_leaderboard(self, exam_id: int) -> List[LeaderboardEntryOut]:
        await self.update_exam_rankings(exam_id)
        attempts = await self.repo.get_completed_attempts_for_exam(exam_id)
        leaderboard = []
        for idx, att in enumerate(attempts, start=1):
            leaderboard.append(
                LeaderboardEntryOut(
                    rank=idx,
                    student_name=att.student.name if att.student else "طالب",
                    whatsapp_number=att.student.whatsapp_number if att.student else "",
                    score=att.score,
                    total_questions=att.total_questions,
                    percentage=round(att.percentage, 1),
                    completion_seconds=att.completion_seconds,
                    finished_at=att.finished_at,
                )
            )
        return leaderboard
