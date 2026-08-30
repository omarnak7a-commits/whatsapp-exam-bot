"""Regression test for the production "student cannot start exam" 500.

The live Vercel PostgreSQL was created by the legacy WhatsApp-bot schema.
Two gaps block Start Exam after the earlier column heal:

1. `students.whatsapp_number` is NOT NULL (the bot always set it) while the
   web flow creates students by NAME ONLY -> first anonymous student INSERT
   fails with NotNullViolation -> 500 «حدث خطأ، حاول مرة أخرى».
2. `exam_attempts` has no `question_order_json` / `option_order_json` (the bot
   kept order in attempt_questions/attempt_options) -> attempt INSERT fails
   with UndefinedColumn.

The runtime bootstrap must heal BOTH on the first /api request, and then the
whole attempt flow (student name -> create attempt -> questions -> answers)
must work.

This test runs against a real PostgreSQL only. In environments without one it
is skipped; the SQLite suite (test_schema_bootstrap.py) still covers the
column-add path.
"""
import os
import pytest

pytest.importorskip("psycopg")

DSN = os.environ.get("PGLITE_TEST_DSN") or os.environ.get("TEST_PG_DSN") or ""
requires_real_pg = pytest.mark.skipif(not DSN, reason="set PGLITE_TEST_DSN/TEST_PG_DSN to a real PostgreSQL URL")

LEGACY_DDL = """
DROP TABLE IF EXISTS attempt_options CASCADE;
DROP TABLE IF EXISTS attempt_questions CASCADE;
DROP TABLE IF EXISTS attempt_answers CASCADE;
DROP TABLE IF EXISTS exam_attempts CASCADE;
DROP TABLE IF EXISTS options CASCADE;
DROP TABLE IF EXISTS questions CASCADE;
DROP TABLE IF EXISTS exams CASCADE;
DROP TABLE IF EXISTS students CASCADE;
DROP TABLE IF EXISTS admins CASCADE;

CREATE TABLE admins (
  id SERIAL PRIMARY KEY, name VARCHAR(255) NOT NULL, email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL, role VARCHAR(50) NOT NULL DEFAULT 'ADMIN',
  is_active BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL);
CREATE TABLE students (
  id SERIAL PRIMARY KEY, name VARCHAR(255) NOT NULL,
  whatsapp_number VARCHAR(50) NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL);
CREATE TABLE exams (
  id SERIAL PRIMARY KEY, title VARCHAR(255) NOT NULL, description TEXT,
  duration_seconds INTEGER NOT NULL DEFAULT 1200, status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
  number_of_questions INTEGER NOT NULL DEFAULT 10,
  randomize_questions BOOLEAN NOT NULL DEFAULT FALSE,
  randomize_options BOOLEAN NOT NULL DEFAULT FALSE,
  one_attempt_only BOOLEAN NOT NULL DEFAULT FALSE,
  show_correct_answer_immediately BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL,
  published_at TIMESTAMPTZ, closed_at TIMESTAMPTZ);
CREATE TABLE questions (
  id SERIAL PRIMARY KEY, exam_id INTEGER NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL, order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL);
CREATE TABLE options (
  id SERIAL PRIMARY KEY, question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  option_text VARCHAR(500) NOT NULL, is_correct BOOLEAN NOT NULL DEFAULT FALSE,
  order_index INTEGER NOT NULL DEFAULT 0);
CREATE TABLE exam_attempts (
  id SERIAL PRIMARY KEY, exam_id INTEGER NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL, finished_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL, status VARCHAR(20) NOT NULL DEFAULT 'IN_PROGRESS',
  score INTEGER NOT NULL DEFAULT 0, total_questions INTEGER NOT NULL DEFAULT 0,
  correct_answers INTEGER NOT NULL DEFAULT 0, wrong_answers INTEGER NOT NULL DEFAULT 0,
  percentage FLOAT NOT NULL DEFAULT 0, completion_seconds INTEGER,
  final_rank INTEGER);
CREATE TABLE attempt_answers (
  id SERIAL PRIMARY KEY,
  attempt_id INTEGER NOT NULL REFERENCES exam_attempts(id) ON DELETE CASCADE,
  question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  selected_option_id INTEGER NOT NULL REFERENCES options(id) ON DELETE CASCADE,
  is_correct BOOLEAN NOT NULL DEFAULT FALSE, answered_at TIMESTAMPTZ NOT NULL);
"""


@requires_real_pg
@pytest.mark.asyncio
async def test_bootstrap_heals_legacy_attempt_schema():
    import psycopg
    from sqlalchemy import text
    from sqlalchemy.ext.asyncio import create_async_engine

    import app.main as app_main
    from app.db.session import Base
    from app.models.student import Student
    from app.models.exam_attempt import ExamAttempt

    # --- 1. Seed the legacy WhatsApp-bot schema on real PostgreSQL ---
    with psycopg.connect(DSN.replace("postgresql+psycopg://", "postgresql://").replace("postgresql+asyncpg://", "postgresql://")) as conn:
        conn.execute(LEGACY_DDL)
        conn.commit()

    engine = create_async_engine(DSN)
    try:
        # --- 2. Run the exact serverless cold-start bootstrap ---
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
            await app_main._apply_schema_fixes(conn)

        # --- 3. Assert both production gaps are healed ---
        async with engine.connect() as conn:
            cols = {
                str(r[0]): str(r[1])
                for r in (await conn.execute(text(
                    "SELECT column_name, is_nullable FROM information_schema.columns "
                    "WHERE table_name='students'"))).fetchall()
            }
            assert cols["whatsapp_number"] == "YES", (
                "students.whatsapp_number is still NOT NULL; anonymous web students "
                "cannot be created"
            )
            ea_cols = {
                str(r[0])
                for r in (await conn.execute(text(
                    "SELECT column_name FROM information_schema.columns "
                    "WHERE table_name='exam_attempts'"))).fetchall()
            }
            assert {"question_order_json", "option_order_json"} <= ea_cols, (
                f"exam_attempts still missing order columns: {ea_cols}"
            )

        # --- 4. Assert the exact flow that failed in production now works ---
        from datetime import datetime, timezone
        from sqlalchemy import select

        async with engine.begin() as conn:
            # anonymous student (no whatsapp_number) - was NotNullViolation
            res = await conn.execute(
                text("INSERT INTO students (name, is_active, created_at, updated_at) "
                     "VALUES ('أحمد محمد', TRUE, now(), now()) RETURNING id")
            )
            student_id = res.scalar_one()
            res = await conn.execute(
                text("INSERT INTO exams (title, duration_seconds, status, number_of_questions, "
                     "created_at, updated_at) VALUES ('امتحان', 1800, 'PUBLISHED', 2, now(), now()) "
                     "RETURNING id")
            )
            exam_id = res.scalar_one()
            # attempt INSERT with all web-flow fields - was UndefinedColumn
            await conn.execute(
                text(
                    "INSERT INTO exam_attempts (exam_id, student_id, started_at, expires_at, status, "
                    "score, total_score, percentage, total_questions, correct_answers, wrong_answers, "
                    "completion_time_seconds, completion_seconds, question_order_json, option_order_json) "
                    "VALUES (:exam_id, :student_id, :started_at, :expires_at, 'IN_PROGRESS', 0, 0, 0, 2, "
                    "0, 0, 0, 0, '[]', '{}')"
                ),
                {
                    "exam_id": exam_id,
                    "student_id": student_id,
                    "started_at": datetime.now(timezone.utc),
                    "expires_at": datetime.now(timezone.utc),
                },
            )
    finally:
        await engine.dispose()
