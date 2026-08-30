"""Regression tests for the serverless schema bootstrap (app.main SCHEMA_FIXES).

These reproduce the production "Create Exam" failure (حدث خطأ، حاول مرة أخرى):

The live Vercel PostgreSQL was created by the legacy WhatsApp-bot schema
(alembic 001 only - Vercel serverless never runs lifespan hooks or alembic),
so it is missing the web-era columns (`exams.public_slug`, `duration_minutes`,
`instant_feedback_enabled`, ...). The runtime bootstrap must heal it on the
first request. It could not, because:

1. `exam_attempts.submitted_at` was declared with type "DATETIME", which does
   not exist in PostgreSQL -> the ALTER fails.
2. All fixes ran in ONE transaction, so that failure aborted/rolled back every
   other fix - including the missing `exams` columns.
3. Every exam INSERT then failed with UndefinedColumnError -> 500.

Test 1 guards the DDL types against PostgreSQL; Test 2 proves a legacy DB is
fully healed and an exam can be inserted; Test 3 proves a single failing fix
no longer aborts the others.
"""
import sqlalchemy as sa
from httpx import AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

import app.main as app_main
from app.db.session import Base
from app.main import SCHEMA_FIXES, _ensure_schema_on_conn
import app.models  # noqa: F401 - register every model on Base.metadata

# Base types accepted by PostgreSQL DDL (parameterised forms like VARCHAR(n)
# are normalised to their base name before the check).
POSTGRES_TYPES = {
    "VARCHAR", "INTEGER", "BIGINT", "SMALLINT", "BOOLEAN", "TEXT",
    "TIMESTAMPTZ", "TIMESTAMP", "DATE", "FLOAT", "DOUBLE PRECISION", "NUMERIC",
}


def _normalize(col_type: str) -> str:
    return col_type.split("(")[0].strip().upper()


def test_schema_fixes_use_postgresql_valid_types():
    """Guard: every type used by SCHEMA_FIXES must be valid PostgreSQL DDL.

    (The original bug used "DATETIME" here - valid on SQLite, invalid on PG,
    which silently rolled back the whole production schema repair.)
    """
    for table, columns in SCHEMA_FIXES.items():
        for column, col_type, _default in columns:
            assert _normalize(col_type) in POSTGRES_TYPES, (
                f"{table}.{column}: type {col_type!r} is not valid PostgreSQL DDL"
            )


async def test_bootstrap_heals_legacy_schema_and_exam_insert_works(client: AsyncClient):
    """A legacy (alembic-001 era) database is healed, then Create Exam works."""
    legacy_engine = create_async_engine("sqlite+aiosqlite:///:memory:")

    legacy_ddl = {
        # Columns that existed BEFORE the web-platform migrations (001 era).
        "exams": """
            CREATE TABLE exams (
                id INTEGER PRIMARY KEY, title VARCHAR(255) NOT NULL, description TEXT,
                duration_seconds INTEGER NOT NULL DEFAULT 1200,
                status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
                number_of_questions INTEGER NOT NULL DEFAULT 10,
                randomize_questions BOOLEAN NOT NULL DEFAULT 1,
                randomize_options BOOLEAN NOT NULL DEFAULT 1,
                one_attempt_only BOOLEAN NOT NULL DEFAULT 1,
                show_correct_answer_immediately BOOLEAN NOT NULL DEFAULT 1,
                created_at DATETIME NOT NULL, updated_at DATETIME NOT NULL,
                published_at DATETIME, closed_at DATETIME)
        """,
        "questions": """
            CREATE TABLE questions (
                id INTEGER PRIMARY KEY,
                exam_id INTEGER NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
                question_text TEXT NOT NULL, order_index INTEGER NOT NULL DEFAULT 0,
                created_at DATETIME NOT NULL, updated_at DATETIME NOT NULL)
        """,
        "options": """
            CREATE TABLE options (
                id INTEGER PRIMARY KEY,
                question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
                option_text VARCHAR(500) NOT NULL,
                is_correct BOOLEAN NOT NULL DEFAULT 0,
                order_index INTEGER NOT NULL DEFAULT 0)
        """,
        "exam_attempts": """
            CREATE TABLE exam_attempts (
                id INTEGER PRIMARY KEY,
                exam_id INTEGER NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
                student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
                started_at DATETIME NOT NULL, finished_at DATETIME,
                expires_at DATETIME NOT NULL, status VARCHAR(20) NOT NULL,
                score FLOAT NOT NULL DEFAULT 0, total_questions INTEGER NOT NULL DEFAULT 0,
                correct_answers INTEGER NOT NULL DEFAULT 0,
                wrong_answers INTEGER NOT NULL DEFAULT 0,
                percentage FLOAT NOT NULL DEFAULT 0,
                completion_seconds INTEGER NOT NULL DEFAULT 0, final_rank INTEGER,
                question_order_json TEXT, option_order_json TEXT)
        """,
        "attempt_answers": """
            CREATE TABLE attempt_answers (
                id INTEGER PRIMARY KEY,
                attempt_id INTEGER NOT NULL REFERENCES exam_attempts(id) ON DELETE CASCADE,
                question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
                selected_option_id INTEGER NOT NULL,
                is_correct BOOLEAN NOT NULL DEFAULT 0, answered_at DATETIME NOT NULL)
        """,
    }

    # admins/students are complete in the legacy schema; create them from the ORM.
    legacy_tables = {"admins", "students"}

    async with legacy_engine.begin() as conn:
        await conn.run_sync(
            lambda sync_conn: Base.metadata.create_all(
                sync_conn, tables=[Base.metadata.tables[t] for t in legacy_tables]
            )
        )
        for ddl in legacy_ddl.values():
            await conn.execute(text(ddl))

        # --- Act: run the exact bootstrap used on serverless cold start ---
        await _ensure_schema_on_conn(conn)

        # --- Assert 1: every ORM column now exists on the healed tables ---
        for table in legacy_ddl:
            expected = {c.name for c in Base.metadata.tables[table].columns}
            rows = await conn.execute(text(f"PRAGMA table_info({table})"))
            actual = {str(row[1]) for row in rows.fetchall()}
            missing = expected - actual
            assert not missing, f"{table} still missing columns after bootstrap: {missing}"

        # --- Assert 2: the exact Create Exam INSERT now succeeds ---
        from app.models.exam import Exam

        await conn.execute(
            sa.insert(Exam).values(
                title="امتحان بعد الإصلاح",
                public_slug="healed-exam-1",
                duration_minutes=25,
                duration_seconds=1500,
                status="DRAFT",
                number_of_questions=0,
                instant_feedback_enabled=True,
                show_correct_answers=True,
                leaderboard_enabled=True,
            )
        )
    await legacy_engine.dispose()


async def test_one_failing_fix_does_not_rollback_the_others(client: AsyncClient):
    """A single invalid fix is skipped; every other fix is still applied."""
    eng = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with eng.begin() as conn:
        await conn.execute(
            text(
                "CREATE TABLE exams (id INTEGER PRIMARY KEY, "
                "public_slug VARCHAR(100), title VARCHAR(255))"
            )
        )
        # Force a guaranteed failure: adding a column that already exists on a
        # non-PostgreSQL dialect raises "duplicate column name".
        fixes_backup = dict(app_main.SCHEMA_FIXES)
        app_main.SCHEMA_FIXES = {
            "exams": [
                ("public_slug", "VARCHAR(100)", None),  # exists -> will fail
                ("duration_minutes", "INTEGER", "20"),  # must still be applied
            ]
        }
        try:
            await app_main._apply_schema_fixes(conn)
        finally:
            app_main.SCHEMA_FIXES = fixes_backup

        rows = await conn.execute(text("PRAGMA table_info(exams)"))
        cols = {str(r[1]) for r in rows.fetchall()}
        assert "public_slug" in cols  # pre-existing, untouched
        assert "duration_minutes" in cols  # applied despite the failed fix
    await eng.dispose()
