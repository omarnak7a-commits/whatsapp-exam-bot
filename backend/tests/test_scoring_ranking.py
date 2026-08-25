import pytest
from sqlalchemy.ext.asyncio import AsyncSession
from app.services.exam_service import ExamService
from app.services.question_service import QuestionService
from app.services.student_service import StudentService
from app.services.attempt_service import AttemptService
from app.services.ranking_service import RankingService
from app.schemas.exam import ExamCreate
from app.schemas.question import QuestionCreate, OptionCreate


@pytest.mark.asyncio
async def test_leaderboard_scoring_and_tie_breaker(db_session: AsyncSession):
    exam_service = ExamService(db_session)
    q_service = QuestionService(db_session)
    student_service = StudentService(db_session)
    attempt_service = AttemptService(db_session)
    ranking_service = RankingService(db_session)

    exam = await exam_service.create_exam(
        ExamCreate(
            title="امتحان الفيزياء",
            duration_seconds=600,
            number_of_questions=1,
            one_attempt_only=False,
        )
    )
    q1 = await q_service.add_question(
        exam.id,
        QuestionCreate(
            question_text="ما هي وحدة سرعة الضوء؟",
            options=[
                OptionCreate(option_text="متر/ثانية", is_correct=True),
                OptionCreate(option_text="كيلوغرام", is_correct=False),
            ],
        ),
    )
    await exam_service.publish_exam(exam.id)
    corr_opt = next(o for o in q1.options if o.is_correct)

    # Student 1: Score 1/1, takes 20s
    s1 = await student_service.get_or_create_student("201111111111", "الطالب الأول")
    att1 = await attempt_service.start_attempt(s1.id, exam.id)
    await attempt_service.record_answer(att1.id, q1.id, corr_opt.id)
    att1 = await attempt_service.repo.get_by_id(att1.id)
    att1.completion_seconds = 20
    await attempt_service.repo.update(att1)

    # Student 2: Score 1/1, takes 10s (Faster -> Should rank #1)
    s2 = await student_service.get_or_create_student("202222222222", "الطالب الثاني")
    att2 = await attempt_service.start_attempt(s2.id, exam.id)
    await attempt_service.record_answer(att2.id, q1.id, corr_opt.id)
    att2 = await attempt_service.repo.get_by_id(att2.id)
    att2.completion_seconds = 10
    await attempt_service.repo.update(att2)

    leaderboard = await ranking_service.get_leaderboard(exam.id)
    assert len(leaderboard) == 2
    assert leaderboard[0].student_name == "الطالب الثاني"
    assert leaderboard[0].rank == 1
    assert leaderboard[1].student_name == "الطالب الأول"
    assert leaderboard[1].rank == 2
