from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from sqlalchemy.orm import selectinload
from app.models.question import Question
from app.models.option import Option


class QuestionRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, question_id: int) -> Optional[Question]:
        query = (
            select(Question)
            .where(Question.id == question_id)
            .options(selectinload(Question.options))
        )
        result = await self.db.execute(query)
        return result.scalars().first()

    async def get_by_exam_id(self, exam_id: int) -> List[Question]:
        query = (
            select(Question)
            .where(Question.exam_id == exam_id)
            .order_by(Question.order_index.asc())
            .options(selectinload(Question.options))
        )
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def create(self, question: Question) -> Question:
        self.db.add(question)
        await self.db.flush()
        await self.db.refresh(question)
        return question

    async def update(self, question: Question) -> Question:
        await self.db.flush()
        await self.db.refresh(question)
        return question

    async def delete(self, question: Question) -> None:
        await self.db.delete(question)
        await self.db.flush()

    async def delete_options_by_question_id(self, question_id: int) -> None:
        await self.db.execute(delete(Option).where(Option.question_id == question_id))
        await self.db.flush()
