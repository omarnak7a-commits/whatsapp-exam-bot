from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, select
from fastapi import HTTPException, status
from app.repositories.question_repository import QuestionRepository
from app.repositories.exam_repository import ExamRepository
from app.schemas.question import QuestionCreate, QuestionUpdate
from app.models.question import Question
from app.models.option import Option


class QuestionService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = QuestionRepository(db)
        self.exam_repo = ExamRepository(db)

    async def add_question(self, exam_id: int, data: QuestionCreate) -> Question:
        exam = await self.exam_repo.get_by_id(exam_id)
        if not exam:
            raise HTTPException(status_code=404, detail="الامتحان غير موجود")

        if not data.options or len(data.options) < 2:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="يجب إضافة خيارين على الأقل لكل سؤال",
            )

        correct_count = sum(1 for opt in data.options if opt.is_correct)
        if correct_count != 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="يجب تحديد إجابة صحيحة واحدة فقط",
            )

        # Determine order_index
        max_order_result = await self.db.execute(
            select(func.max(Question.order_index)).where(Question.exam_id == exam_id)
        )
        max_order = max_order_result.scalar() or 0
        order_idx = data.order_index if data.order_index != 0 else max_order + 1

        question = Question(
            exam_id=exam_id,
            text=data.text,
            question_text=data.text,
            order_index=order_idx,
            points=data.points or 1,
        )
        question = await self.repo.create(question)

        for idx, opt_data in enumerate(data.options):
            opt = Option(
                question_id=question.id,
                text=opt_data.text,
                option_text=opt_data.text,
                is_correct=opt_data.is_correct,
                order_index=opt_data.order_index if opt_data.order_index else idx,
            )
            self.db.add(opt)
        await self.db.flush()
        return await self.repo.get_by_id(question.id)

    async def get_questions_by_exam(self, exam_id: int) -> List[Question]:
        return await self.repo.get_by_exam_id(exam_id)

    async def update_question(self, question_id: int, data: QuestionUpdate) -> Question:
        question = await self.repo.get_by_id(question_id)
        if not question:
            raise HTTPException(status_code=404, detail="السؤال غير موجود")

        if data.text is not None:
            question.text = data.text
            question.question_text = data.text
        if data.order_index is not None:
            question.order_index = data.order_index
        if data.points is not None:
            question.points = data.points

        if data.options is not None:
            if len(data.options) < 2:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="يجب إضافة خيارين على الأقل",
                )
            correct_count = sum(1 for opt in data.options if opt.is_correct)
            if correct_count != 1:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="يجب تحديد إجابة صحيحة واحدة فقط",
                )
            await self.repo.delete_options_by_question_id(question_id)
            for idx, opt_data in enumerate(data.options):
                opt = Option(
                    question_id=question.id,
                    text=opt_data.text,
                    option_text=opt_data.text,
                    is_correct=opt_data.is_correct,
                    order_index=opt_data.order_index if opt_data.order_index else idx,
                )
                self.db.add(opt)

        await self.repo.update(question)
        return await self.repo.get_by_id(question_id)

    async def delete_question(self, question_id: int) -> None:
        question = await self.repo.get_by_id(question_id)
        if not question:
            raise HTTPException(status_code=404, detail="السؤال غير موجود")
        await self.repo.delete(question)

    async def reorder_questions(self, exam_id: int, ordered_ids: List[int]) -> List[Question]:
        questions = await self.repo.get_by_exam_id(exam_id)
        q_map = {q.id: q for q in questions}
        for idx, q_id in enumerate(ordered_ids):
            if q_id in q_map:
                q_map[q_id].order_index = idx
        await self.db.flush()
        return await self.repo.get_by_exam_id(exam_id)

    async def duplicate_question(self, question_id: int) -> Question:
        question = await self.repo.get_by_id(question_id)
        if not question:
            raise HTTPException(status_code=404, detail="السؤال غير موجود")

        new_q = Question(
            exam_id=question.exam_id,
            text=question.text or question.question_text,
            question_text=question.text or question.question_text,
            order_index=question.order_index + 1,
            points=question.points,
        )
        self.db.add(new_q)
        await self.db.flush()

        for opt in question.options:
            new_opt = Option(
                question_id=new_q.id,
                text=opt.text or opt.option_text,
                option_text=opt.text or opt.option_text,
                is_correct=opt.is_correct,
                order_index=opt.order_index,
            )
            self.db.add(new_opt)
        await self.db.flush()
        return await self.repo.get_by_id(new_q.id)
