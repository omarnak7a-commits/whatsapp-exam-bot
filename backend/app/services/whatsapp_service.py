from typing import Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.webhook_event import WebhookEvent
from app.services.student_service import StudentService
from app.services.exam_service import ExamService
from app.services.attempt_service import AttemptService
from app.integrations.whatsapp.client import WhatsAppClient
from app.integrations.whatsapp.formatter import WhatsAppFormatter
from app.integrations.whatsapp.webhook import WebhookParser
from app.repositories.exam_repository import ExamRepository
from app.repositories.question_repository import QuestionRepository
from app.core.exceptions import (
    ExamExpiredException,
    AlreadyAnsweredException,
    AttemptAlreadyCompletedException,
    OneAttemptOnlyException,
)
from app.core.logging import logger


class WhatsAppService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.client = WhatsAppClient()
        self.student_service = StudentService(db)
        self.exam_service = ExamService(db)
        self.attempt_service = AttemptService(db)
        self.exam_repo = ExamRepository(db)
        self.question_repo = QuestionRepository(db)

    async def is_message_processed(self, message_id: str) -> bool:
        if not message_id:
            return False
        result = await self.db.execute(
            select(WebhookEvent).where(WebhookEvent.message_id == message_id)
        )
        return result.scalars().first() is not None

    async def mark_message_processed(self, message_id: str) -> None:
        if not message_id:
            return
        event = WebhookEvent(message_id=message_id)
        self.db.add(event)
        await self.db.flush()

    async def handle_webhook_event(self, payload: Dict[str, Any]) -> None:
        data = WebhookParser.parse_incoming_message(payload)
        if not data:
            return

        message_id = data["message_id"]
        sender_phone = data["sender_phone"]
        sender_name = data["sender_name"]
        callback_id = data["callback_id"]
        text_body = data["text"].strip()

        # Deduplication / Idempotency Check
        if await self.is_message_processed(message_id):
            logger.info(f"Duplicate WhatsApp webhook message ignored: {message_id}")
            return

        await self.mark_message_processed(message_id)

        # 1. Get or Create Student
        student = await self.student_service.get_or_create_student(sender_phone, sender_name)

        # 2. Check Callback ID or Text
        if callback_id.startswith("start_exam:"):
            exam_id = int(callback_id.split(":")[1])
            await self._start_exam_and_send_q1(student.id, exam_id, sender_phone)
            return

        if callback_id.startswith("ans:"):
            parts = callback_id.split(":")
            if len(parts) == 4:
                attempt_id = int(parts[1])
                question_id = int(parts[2])
                option_id = int(parts[3])
                await self._handle_answer_selection(student.id, attempt_id, question_id, option_id, sender_phone)
                return

        # 3. Handling Text Messages or Default Interaction
        active_exam = await self.exam_repo.get_published_active()
        if not active_exam:
            await self.client.send_text_message(sender_phone, WhatsAppFormatter.format_no_active_exam())
            return

        # Check if student already has active attempt for active_exam
        attempt, q, opts, idx, total = await self.attempt_service.get_current_question(
            attempt_id=0  # get_current_question by student will check active
        ) if False else (None, None, None, 0, 0)

        # Retrieve active attempt directly
        active_attempt = await self.attempt_service.repo.get_active_attempt(student.id, active_exam.id)
        if active_attempt:
            # Resend current question
            await self._send_question_to_student(active_attempt.id, sender_phone)
        else:
            # Offer exam start card
            intro_text = WhatsAppFormatter.format_exam_intro(active_exam)
            start_btn = [{"id": f"start_exam:{active_exam.id}", "title": "بدء الامتحان 🚀"}]
            await self.client.send_interactive_buttons(
                recipient=sender_phone,
                body_text=intro_text,
                buttons=start_btn,
                header_text=f"📚 {active_exam.title}",
            )

    async def _start_exam_and_send_q1(self, student_id: int, exam_id: int, recipient: str) -> None:
        try:
            attempt = await self.attempt_service.start_attempt(student_id, exam_id)
            await self._send_question_to_student(attempt.id, recipient)
        except OneAttemptOnlyException:
            await self.client.send_text_message(recipient, WhatsAppFormatter.format_already_completed())
        except Exception as e:
            logger.error(f"Error starting exam: {e}")
            await self.client.send_text_message(recipient, f"حدث خطأ أثناء بدء الامتحان: {e}")

    async def _send_question_to_student(self, attempt_id: int, recipient: str) -> None:
        attempt, question, options, current_index, total_questions = (
            await self.attempt_service.get_current_question(attempt_id)
        )

        if attempt.status in ("COMPLETED", "EXPIRED") or not question:
            # Send Final Results
            exam = await self.exam_repo.get_by_id(attempt.exam_id)
            res_msg = WhatsAppFormatter.format_final_results(attempt, exam.title if exam else "الامتحان")
            await self.client.send_text_message(recipient, res_msg)
            return

        exam = await self.exam_repo.get_by_id(attempt.exam_id)
        exam_title = exam.title if exam else "الامتحان"

        ui_data = WhatsAppFormatter.format_question_message(
            exam_title=exam_title,
            question=question,
            options=options,
            current_index=current_index,
            total_questions=total_questions,
            attempt_id=attempt.id,
        )

        if ui_data["is_buttons"]:
            await self.client.send_interactive_buttons(
                recipient=recipient,
                body_text=ui_data["body"],
                buttons=ui_data["items"],
                header_text=ui_data["header"],
            )
        else:
            await self.client.send_interactive_list(
                recipient=recipient,
                body_text=ui_data["body"],
                button_label="اختر الإجابة",
                title=ui_data["header"],
                rows=ui_data["items"],
            )

    async def _handle_answer_selection(
        self, student_id: int, attempt_id: int, question_id: int, option_id: int, recipient: str
    ) -> None:
        try:
            is_correct, is_finished, correct_opt = await self.attempt_service.record_answer(
                attempt_id=attempt_id,
                question_id=question_id,
                option_id=option_id,
            )

            attempt = await self.attempt_service.repo.get_by_id(attempt_id)
            exam = await self.exam_repo.get_by_id(attempt.exam_id)

            # Check if show_correct_answer_immediately is enabled
            if exam and exam.show_correct_answer_immediately:
                question = await self.question_repo.get_by_id(question_id)
                selected_opt = next((o for o in question.options if o.id == option_id), None)
                feedback_msg = WhatsAppFormatter.format_immediate_feedback(
                    is_correct=is_correct,
                    correct_option_text=correct_opt.option_text if correct_opt else "",
                    selected_option_text=selected_opt.option_text if selected_opt else "",
                )
                await self.client.send_text_message(recipient, feedback_msg)

            if is_finished:
                # Reload finished attempt with rankings
                completed_attempt = await self.attempt_service.repo.get_by_id(attempt_id)
                res_msg = WhatsAppFormatter.format_final_results(
                    completed_attempt, exam.title if exam else "الامتحان"
                )
                await self.client.send_text_message(recipient, res_msg)
            else:
                # Send Next Question
                await self._send_question_to_student(attempt_id, recipient)

        except AlreadyAnsweredException:
            logger.info("Ignoring duplicate answer submission for same question")
        except ExamExpiredException:
            attempt = await self.attempt_service.repo.get_by_id(attempt_id)
            exam = await self.exam_repo.get_by_id(attempt.exam_id) if attempt else None
            res_msg = WhatsAppFormatter.format_final_results(
                attempt, exam.title if exam else "الامتحان"
            )
            await self.client.send_text_message(recipient, res_msg)
        except Exception as e:
            logger.error(f"Error recording answer: {e}")
            await self.client.send_text_message(recipient, "حدث خطأ أثناء حفظ الإجابة. يرجى المحاولة مرة أخرى.")
