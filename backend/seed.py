import asyncio
import os
import secrets
import string
from datetime import datetime, timezone
from sqlalchemy import select
from app.db.session import AsyncSessionLocal, engine, Base
from app.models.admin import Admin
from app.models.exam import Exam, ExamStatus
from app.models.question import Question
from app.models.option import Option
from app.core.security import get_password_hash


def _utcnow():
    return datetime.now(timezone.utc)


def _random_suffix(length: int = 4) -> str:
    alphabet = string.ascii_lowercase + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(length))


async def seed_data():
    print("Creating database tables if not exist...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as session:
        # 1. Seed Admin from env or default
        admin_email = os.getenv("ADMIN_EMAIL", "admin@exam.com")
        admin_password = os.getenv("ADMIN_PASSWORD", "admin123")
        admin_name = os.getenv("ADMIN_NAME", "مدير النظام")

        result = await session.execute(select(Admin).where(Admin.email == admin_email))
        existing_admin = result.scalars().first()

        if not existing_admin:
            print(f"Seeding default admin user: {admin_email}")
            admin = Admin(
                name=admin_name,
                email=admin_email,
                password_hash=get_password_hash(admin_password),
                role="ADMIN",
                is_active=True,
            )
            session.add(admin)
            await session.commit()
        else:
            print(f"Admin already exists: {admin_email}")

        # 2. Seed Sample Published Exam for جبت كام؟
        result = await session.execute(
            select(Exam).where(Exam.title == "امتحان الرياضيات والذكاء العام")
        )
        existing_exam = result.scalars().first()

        if not existing_exam:
            print("Seeding sample exam: امتحان الرياضيات والذكاء العام")
            exam = Exam(
                title="امتحان الرياضيات والذكاء العام",
                description="امتحان تجريبي من 10 أسئلة لقياس القدرات الحسابية والذهنية. جاهز تعرف جبت كام؟ 👀",
                public_slug=f"math-general-{_random_suffix(4)}",
                duration_minutes=15,
                duration_seconds=900,
                status=ExamStatus.PUBLISHED.value,
                number_of_questions=10,
                randomize_questions=False,
                randomize_options=False,
                published_at=_utcnow(),
            )
            session.add(exam)
            await session.flush()

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

            for q_idx, q_data in enumerate(sample_questions, start=0):
                q = Question(
                    exam_id=exam.id,
                    text=q_data["text"],
                    question_text=q_data["text"],
                    order_index=q_idx,
                    points=1,
                )
                session.add(q)
                await session.flush()

                for o_idx, (opt_text, is_corr) in enumerate(q_data["options"]):
                    opt = Option(
                        question_id=q.id,
                        text=opt_text,
                        option_text=opt_text,
                        is_correct=is_corr,
                        order_index=o_idx,
                    )
                    session.add(opt)

            await session.commit()
            print(f"Sample exam seeded with slug: {exam.public_slug}")
        else:
            print("Sample exam already exists.")


if __name__ == "__main__":
    asyncio.run(seed_data())
