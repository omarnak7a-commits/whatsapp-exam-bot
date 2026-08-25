import asyncio
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import AsyncSessionLocal, engine, Base
from app.core.security import get_password_hash
from app.models.admin import Admin
from app.models.exam import Exam, ExamStatus
from app.models.question import Question
from app.models.option import Option
from app.repositories.admin_repository import AdminRepository


async def seed_data():
    print("Creating database tables if not exist...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as session:
        # 1. Seed Admin
        admin_repo = AdminRepository(session)
        existing_admin = await admin_repo.get_by_email("admin@exam.com")
        if not existing_admin:
            print("Seeding default admin user: admin@exam.com / admin123")
            admin = Admin(
                name="مدير النظام",
                email="admin@exam.com",
                password_hash=get_password_hash("admin123"),
                role="ADMIN",
                is_active=True,
            )
            session.add(admin)
            await session.commit()
        else:
            print("Admin already exists.")

        # 2. Seed Sample Published Exam
        result = await session.execute(
            Exam.__table__.select().where(Exam.__table__.c.title == "امتحان الرياضيات والذكاء العام")
        )
        if not result.first():
            print("Seeding sample math & general intelligence exam...")
            exam = Exam(
                title="امتحان الرياضيات والذكاء العام",
                description="امتحان تجريبي اختباري من 10 أسئلة لقياس القدرات الحسابية والذهنية.",
                duration_seconds=1200,  # 20 minutes
                status=ExamStatus.PUBLISHED.value,
                number_of_questions=10,
                randomize_questions=True,
                randomize_options=True,
                one_attempt_only=True,
                show_correct_answer_immediately=True,
                published_at=datetime.utcnow(),
            )
            session.add(exam)
            await session.flush()

            # 10 Questions with 4 options each
            sample_questions = [
                {
                    "text": "ما هي عاصمة جمهورية مصر العربية؟",
                    "options": [
                        ("القاهرة", True),
                        ("الإسكندرية", False),
                        ("الجيزة", False),
                        ("الأقصر", False),
                    ],
                },
                {
                    "text": "كم يساوي حاصل ضرب 5 × 6؟",
                    "options": [
                        ("20", False),
                        ("25", False),
                        ("30", True),
                        ("35", False),
                    ],
                },
                {
                    "text": "ما هو الجذر التربيعي للعدد 64؟",
                    "options": [
                        ("6", False),
                        ("7", False),
                        ("8", True),
                        ("9", False),
                    ],
                },
                {
                    "text": "ما هو الكوكب الملقب بالكوكب الأحمر؟",
                    "options": [
                        ("المريخ", True),
                        ("الزهرة", False),
                        ("المشتري", False),
                        ("زحل", False),
                    ],
                },
                {
                    "text": "كم عدد أضلاع الشكل السداسي المنتظم؟",
                    "options": [
                        ("5", False),
                        ("6", True),
                        ("7", False),
                        ("8", False),
                    ],
                },
                {
                    "text": "إذا كان ثمن 3 أقلام 15 جنيهًا، فكم ثمن 5 أقلام؟",
                    "options": [
                        ("20 جنيهًا", False),
                        ("25 جنيهًا", True),
                        ("30 جنيهًا", False),
                        ("35 جنيهًا", False),
                    ],
                },
                {
                    "text": "ما هو المحيط الذي يحد العالم العربي من جهة الغرب؟",
                    "options": [
                        ("المحيط الأطلسي", True),
                        ("المحيط الهندي", False),
                        ("المحيط الهادئ", False),
                        ("المحيط المتجمد الشمالي", False),
                    ],
                },
                {
                    "text": "ما هي مجموع زوايا المثلث الداخلية؟",
                    "options": [
                        ("90 درجة", False),
                        ("180 درجة", True),
                        ("270 درجة", False),
                        ("360 درجة", False),
                    ],
                },
                {
                    "text": "ما هو النسبة المئوية للكسر 3/4؟",
                    "options": [
                        ("50%", False),
                        ("60%", False),
                        ("75%", True),
                        ("80%", False),
                    ],
                },
                {
                    "text": "كم عدد الساعات في 3 أيام كاملة؟",
                    "options": [
                        ("48 ساعة", False),
                        ("60 ساعة", False),
                        ("72 ساعة", True),
                        ("90 ساعة", False),
                    ],
                },
            ]

            for q_idx, q_data in enumerate(sample_questions, start=1):
                q = Question(
                    exam_id=exam.id,
                    question_text=q_data["text"],
                    order_index=q_idx,
                )
                session.add(q)
                await session.flush()

                for o_idx, (opt_text, is_corr) in enumerate(q_data["options"], start=1):
                    opt = Option(
                        question_id=q.id,
                        option_text=opt_text,
                        is_correct=is_corr,
                        order_index=o_idx,
                    )
                    session.add(opt)

            await session.commit()
            print("Sample exam and 10 questions seeded successfully!")


if __name__ == "__main__":
    asyncio.run(seed_data())
