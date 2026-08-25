from typing import List
from app.models.exam import Exam
from app.models.question import Question
from app.models.option import Option
from app.models.exam_attempt import ExamAttempt


class WhatsAppFormatter:
    @staticmethod
    def format_exam_intro(exam: Exam) -> str:
        duration_mins = max(1, exam.duration_seconds // 60)
        body = (
            f"📚 *{exam.title}*\n\n"
            f"{exam.description or ''}\n\n"
            f"⏱️ *الوقت المتاح:* {duration_mins} دقيقة\n"
            f"❓ *عدد الأسئلة:* {exam.number_of_questions} أسئلة\n\n"
            f"اضغط على الزر أدناه لبدء الامتحان الآن 👇"
        )
        return body

    @staticmethod
    def format_question_message(
        exam_title: str,
        question: Question,
        options: List[Option],
        current_index: int,
        total_questions: int,
        attempt_id: int,
    ) -> dict:
        """
        Returns structured dict for sending interactive message (buttons if <= 3 options, list if >= 4).
        """
        header = f"📚 {exam_title}"
        body = f"*السؤال {current_index} من {total_questions}*\n\n{question.question_text}"

        rows_or_buttons = []
        for idx, opt in enumerate(options, start=1):
            callback_id = f"ans:{attempt_id}:{question.id}:{opt.id}"
            # Option text formatted nicely
            title_text = opt.option_text
            rows_or_buttons.append({"id": callback_id, "title": title_text})

        is_buttons = len(options) <= 3

        return {
            "header": header,
            "body": body,
            "items": rows_or_buttons,
            "is_buttons": is_buttons,
        }

    @staticmethod
    def format_immediate_feedback(is_correct: bool, correct_option_text: str, selected_option_text: str = "") -> str:
        if is_correct:
            return f"✅ *إجابة صحيحة!*\n\nالإجابة: {correct_option_text}"
        else:
            return (
                f"❌ *إجابة خاطئة!*\n\n"
                f"إجابتك: {selected_option_text}\n"
                f"الإجابة الصحيحة: {correct_option_text}"
            )

    @staticmethod
    def format_final_results(attempt: ExamAttempt, exam_title: str) -> str:
        duration_mins = attempt.completion_seconds // 60
        duration_secs = attempt.completion_seconds % 60
        time_str = f"{duration_mins} دقيقة و{duration_secs} ثانية" if duration_mins > 0 else f"{duration_secs} ثانية"

        rank_str = f"🏅 *ترتيبك:* #{attempt.final_rank}" if attempt.final_rank else ""

        if attempt.status == "EXPIRED":
            status_header = "⏰ *انتهى وقت الامتحان!*\nتم إغلاق المحاولة تلقائيًا.\n\n"
        else:
            status_header = "🎉 *ألف مبروك! انتهى الامتحان*\n\n"

        msg = (
            f"{status_header}"
            f"📚 *{exam_title}*\n\n"
            f"✅ *الأسئلة الصحيحة:* {attempt.correct_answers}\n"
            f"❌ *الأسئلة الخاطئة:* {attempt.wrong_answers}\n\n"
            f"🏆 *الدرجة النهائية:* {attempt.correct_answers} / {attempt.total_questions}\n"
            f"📊 *النسبة المئوية:* {round(attempt.percentage, 1)}%\n\n"
            f"⏱️ *الوقت المستغرق:* {time_str}\n"
            f"{rank_str}"
        )
        return msg.strip()

    @staticmethod
    def format_no_active_exam() -> str:
        return "لا يوجد امتحان نشط حاليًا. سنحيطكم علمًا عند إتاحة امتحانات جديدة!"

    @staticmethod
    def format_already_completed() -> str:
        return "لقد أكملت هذا الامتحان بالفعل.\nلا يمكن إعادة المحاولة وفقًا لشروط الامتحان."

    @staticmethod
    def format_unknown_command() -> str:
        return "من فضلك اختر إجابتك من الأزرار أو القائمة الظاهرة أمامك."
