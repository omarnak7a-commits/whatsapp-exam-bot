"""
Idempotent database seeding.

- ensure_admin_seeded(): creates the default admin (env-driven) if it does not
  exist yet. This is safe to call on every application startup and even from the
  login endpoint — it is a no-op when the admin already exists and handles
  concurrent cold starts gracefully.
- seed_data(): full dev seed (default admin + a sample published exam).
  Intended for local / CLI usage (python app/seed.py).
"""
import asyncio
import os
import secrets
import string
import sys
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

# Allow running as `python app/seed.py` from backend/ (and as `python seed.py`).
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.db.session import AsyncSessionLocal, engine, Base  # noqa: E402
from app.models.admin import Admin  # noqa: E402
from app.models.exam import Exam, ExamStatus  # noqa: E402
from app.models.question import Question  # noqa: E402
from app.models.option import Option  # noqa: E402
from app.core.security import get_password_hash  # noqa: E402
from app.core.logging import logger  # noqa: E402

DEFAULT_ADMIN_EMAIL = "admin@exam.com"
DEFAULT_ADMIN_PASSWORD = "admin123"
DEFAULT_ADMIN_NAME = "مدير النظام"


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _random_suffix(length: int = 4) -> str:
    alphabet = string.ascii_lowercase + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))


def _admin_credentials() -> tuple[str, str, str]:
    email = os.getenv("ADMIN_EMAIL", DEFAULT_ADMIN_EMAIL).strip().lower()
    password = os.getenv("ADMIN_PASSWORD", DEFAULT_ADMIN_PASSWORD)
    name = os.getenv("ADMIN_NAME", DEFAULT_ADMIN_NAME) or DEFAULT_ADMIN_NAME
    return email, password, name


async def ensure_admin_in_session(session) -> Admin:
    """Create the default admin inside an existing session (no-op if present).

    Uses the caller's session, so dependency overrides (tests, per-request
    sessions) are respected. Commits when the admin is created.
    """
    email, password, name = _admin_credentials()

    result = await session.execute(select(Admin).where(Admin.email == email))
    existing = result.scalars().first()
    if existing:
        return existing

    admin = Admin(
        name=name,
        email=email,
        password_hash=get_password_hash(password),
        role="ADMIN",
        is_active=True,
    )
    session.add(admin)
    try:
        await session.flush()
        await session.commit()
        await session.refresh(admin)
    except IntegrityError:
        # Another process (e.g. parallel serverless cold start) created it first.
        await session.rollback()
        result = await session.execute(select(Admin).where(Admin.email == email))
        existing = result.scalars().first()
        if existing:
            return existing
        raise

    logger.info("Auto-seeded default admin: %s", email)
    return admin


async def ensure_admin_seeded() -> Admin:
    """Idempotently ensure the default admin exists (own DB session)."""
    async with AsyncSessionLocal() as session:
        return await ensure_admin_in_session(session)


async def seed_data() -> None:
    """Full seed: default admin + sample published exam (dev/CLI helper)."""
    logger.info("Creating database tables if not exist...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as session:
        # 1. Seed Admin from env or default
        await ensure_admin_in_session(session)

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
