"""Jebt Kam? Web Platform Migration

Revision ID: 002_jebt_kam
Revises: 001_initial_schema
Create Date: 2026-08-30

Transforms WhatsApp bot schema to web exam platform "جبت كام؟"
"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '002_jebt_kam'
down_revision: Union[str, None] = '001_initial_schema'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_MIG_SP = "mig_002_step"


def _isolated(fn, *args, **kwargs) -> None:
    """Run one guarded migration step inside its own SAVEPOINT.

    PostgreSQL aborts the whole transaction the moment a single statement
    fails. Without a savepoint, the first guarded step that hits a missing
    object (e.g. dropping the `students_whatsapp_number_key` constraint that
    001 never created) silently cancelled *every* later step of this migration
    (their `except: pass` only hides the InFailedSQLTransactionError) and
    crashed `alembic upgrade` at the alembic_version update - leaving legacy
    PostgreSQL databases permanently un-migrated (missing exams.public_slug,
    duration_minutes, ... -> exam creation failed in production).
    """
    bind = op.get_bind()
    is_pg = bind.dialect.name == "postgresql"
    if is_pg:
        bind.execute(sa.text(f"SAVEPOINT {_MIG_SP}"))
    try:
        fn(*args, **kwargs)
        if is_pg:
            bind.execute(sa.text(f"RELEASE SAVEPOINT {_MIG_SP}"))
    except Exception:
        if is_pg:
            bind.execute(sa.text(f"ROLLBACK TO SAVEPOINT {_MIG_SP}"))
            bind.execute(sa.text(f"RELEASE SAVEPOINT {_MIG_SP}"))
        # SQLite keeps the surrounding transaction usable after a failed
        # statement, so nothing else is needed there.


def upgrade() -> None:
    # Exams: add public_slug, duration_minutes
    _isolated(op.add_column, 'exams', sa.Column('public_slug', sa.String(length=100), nullable=True))
    _isolated(op.create_index, op.f('ix_exams_public_slug'), 'exams', ['public_slug'], unique=True)
    _isolated(op.add_column, 'exams', sa.Column('duration_minutes', sa.Integer(), nullable=True))

    # Backfill duration_minutes from duration_seconds if exists
    def _backfill_duration():
        conn = op.get_bind()
        conn.execute(sa.text("UPDATE exams SET duration_minutes = COALESCE(duration_minutes, CAST(duration_seconds/60 AS INTEGER), 20) WHERE duration_minutes IS NULL"))
    _isolated(_backfill_duration)

    # Make duration_minutes not nullable with default after backfill
    # (For postgres, alter column; for sqlite this may fail - guarded.)
    _isolated(op.alter_column, 'exams', 'duration_minutes', nullable=False, existing_type=sa.Integer())

    # Questions: add text and points
    _isolated(op.add_column, 'questions', sa.Column('text', sa.Text(), nullable=True))
    _isolated(op.add_column, 'questions', sa.Column('points', sa.Integer(), nullable=True, server_default='1'))

    def _backfill_questions():
        conn = op.get_bind()
        conn.execute(sa.text("UPDATE questions SET text = question_text WHERE text IS NULL AND question_text IS NOT NULL"))
        conn.execute(sa.text("UPDATE questions SET points = 1 WHERE points IS NULL"))
    _isolated(_backfill_questions)

    # Options: add text
    _isolated(op.add_column, 'options', sa.Column('text', sa.String(length=1000), nullable=True))

    def _backfill_options():
        conn = op.get_bind()
        conn.execute(sa.text("UPDATE options SET text = option_text WHERE text IS NULL AND option_text IS NOT NULL"))
    _isolated(_backfill_options)

    # Students: make whatsapp_number nullable, drop unique if exists
    # This is complex across DBs, so we try to make column nullable
    _isolated(op.alter_column, 'students', 'whatsapp_number', existing_type=sa.String(length=50), nullable=True)

    # For postgres, drop unique constraint if exists
    _isolated(op.drop_index, op.f('ix_students_whatsapp_number'), table_name='students')
    _isolated(op.drop_constraint, 'students_whatsapp_number_key', 'students', type_='unique')
    _isolated(op.create_index, op.f('ix_students_name'), 'students', ['name'], unique=False)

    # Exam attempts: add new canonical columns
    for col_def in [
        sa.Column('submitted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('total_score', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('completion_time_seconds', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('ranking', sa.Integer(), nullable=True),
    ]:
        _isolated(op.add_column, 'exam_attempts', col_def)

    # Backfill new columns from legacy
    def _backfill_attempts():
        conn = op.get_bind()
        conn.execute(sa.text("UPDATE exam_attempts SET submitted_at = finished_at WHERE submitted_at IS NULL"))
        conn.execute(sa.text("UPDATE exam_attempts SET total_score = COALESCE(total_questions, 0) WHERE total_score IS NULL OR total_score = 0"))
        conn.execute(sa.text("UPDATE exam_attempts SET completion_time_seconds = COALESCE(completion_seconds, 0) WHERE completion_time_seconds IS NULL OR completion_time_seconds = 0"))
        conn.execute(sa.text("UPDATE exam_attempts SET ranking = final_rank WHERE ranking IS NULL"))
    _isolated(_backfill_attempts)

    # Attempt answers: add option_id and points_awarded
    _isolated(op.add_column, 'attempt_answers', sa.Column('option_id', sa.Integer(), nullable=True))
    _isolated(op.add_column, 'attempt_answers', sa.Column('points_awarded', sa.Integer(), nullable=True, server_default='0'))

    def _backfill_answers():
        conn = op.get_bind()
        conn.execute(sa.text("UPDATE attempt_answers SET option_id = selected_option_id WHERE option_id IS NULL"))
        # Points awarded will be set on scoring
    _isolated(_backfill_answers)

    # Add foreign key for option_id if not exists (skip if sqlite)
    _isolated(op.create_foreign_key, 'fk_attempt_answers_option_id', 'attempt_answers', 'options', ['option_id'], ['id'], ondelete='CASCADE')


def downgrade() -> None:
    # We don't fully downgrade to keep it simple, but remove added columns
    for col in ['ranking', 'completion_time_seconds', 'total_score', 'submitted_at']:
        try:
            op.drop_column('exam_attempts', col)
        except Exception:
            pass
    for col in ['points_awarded', 'option_id']:
        try:
            op.drop_column('attempt_answers', col)
        except Exception:
            pass
    try:
        op.drop_column('options', 'text')
    except Exception:
        pass
    try:
        op.drop_column('questions', 'points')
    except Exception:
        pass
    try:
        op.drop_column('questions', 'text')
    except Exception:
        pass
    try:
        op.drop_column('exams', 'duration_minutes')
    except Exception:
        pass
    try:
        op.drop_index(op.f('ix_exams_public_slug'), table_name='exams')
    except Exception:
        pass
    try:
        op.drop_column('exams', 'public_slug')
    except Exception:
        pass
