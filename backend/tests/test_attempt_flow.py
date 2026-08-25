import pytest
from sqlalchemy.ext.asyncio import AsyncSession
from app.services.exam_service import ExamService
from app.services.question_service import QuestionService
from app.services.student_service import StudentService
from app.services.attempt_service import AttemptService
from app.schemas.exam import ExamCreate
from app.schemas.question import QuestionCreate, OptionCreate
from app.core.exceptions import OneAttemptOnlyException, AlreadyAnsweredException


@pytest.mark.asyncio
async def test_student_attempt_lifecycle(db_session: AsyncSession):
    exam_service = ExamService(db_session)
    q_service = QuestionService(db_session)
    student_service = StudentService(db_session)
    attempt_service = AttemptService(db_session)

    # 1. Create Exam and Publish
    exam = await exam_service.create_exam(
        ExamCreate(
            title="اختبار الكيمياء",
            duration_seconds=600,
            number_of_questions=2,
            randomize_questions=False,
            randomize_options=False,
            one_attempt_only=True,
            show_correct_answer_immediately=True,
        )
    )

    q1 = await q_service.add_question(
        exam.id,
        QuestionCreate(
            question_text="ما هو رمز الماء؟",
            order_index=1,
            options=[
                OptionCreate(option_text="H2O", is_correct=True),
                OptionCreate(option_text="CO2", is_correct=False),
            ],
        ),
    )

    q2 = await q_service.add_question(
        exam.id,
        QuestionCreate(
            question_text="ما هو رمز غاز الأكسجين؟",
            order_index=2,
            options=[
                OptionCreate(option_text="O2", is_correct=True),
                OptionCreate(option_text="N2", is_correct=False),
            ],
        ),
    )

    await exam_service.publish_exam(exam.id)

    # 2. Get/Create Student
    student = await student_service.get_or_create_student("201099887766", "أحمد علي")
    assert student.whatsapp_number == "201099887766"

    # 3. Start Attempt
    attempt = await attempt_service.start_attempt(student.id, exam.id)
    assert attempt.status == "IN_PROGRESS"
    assert attempt.total_questions == 2

    # 4. Get Current Question 1
    att, curr_q, opts, idx, total = await attempt_service.get_current_question(attempt.id)
    assert curr_q.id == q1.id
    assert idx == 1

    # 5. Answer Question 1 correctly
    h2o_opt = next(o for o in q1.options if o.option_text == "H2O")
    is_corr, finished, corr_opt = await attempt_service.record_answer(
        attempt.id, q1.id, h2o_opt.id
    )
    assert is_corr is True
    assert finished is False

    # 6. Try duplicate answer for Q1 -> should raise exception
    with pytest.raises(AlreadyAnsweredException):
        await attempt_service.record_answer(attempt.id, q1.id, h2o_opt.id)

    # 7. Answer Question 2 correctly -> completes exam
    o2_opt = next(o for o in q2.options if o.option_text == "O2")
    is_corr2, finished2, _ = await attempt_service.record_answer(
        attempt.id, q2.id, o2_opt.id
    )
    assert is_corr2 is True
    assert finished2 is True

    # 8. Verify Completed Attempt Stats
    completed_attempt = await attempt_service.repo.get_by_id(attempt.id)
    assert completed_attempt.status == "COMPLETED"
    assert completed_attempt.score == 2.0
    assert completed_attempt.percentage == 100.0
    assert completed_attempt.final_rank == 1

    # 9. Try start another attempt with one_attempt_only=True -> should fail
    with pytest.raises(OneAttemptOnlyException):
        await attempt_service.start_attempt(student.id, exam.id)
