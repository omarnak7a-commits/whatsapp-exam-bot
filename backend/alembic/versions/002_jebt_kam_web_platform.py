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


def upgrade() -> None:
    # Exams: add public_slug, duration_minutes
    try:
        op.add_column('exams', sa.Column('public_slug', sa.String(length=100), nullable=True))
    except Exception:
        pass
    try:
        op.create_index(op.f('ix_exams_public_slug'), 'exams', ['public_slug'], unique=True)
    except Exception:
        pass
    try:
        op.add_column('exams', sa.Column('duration_minutes', sa.Integer(), nullable=True))
    except Exception:
        pass

    # Backfill duration_minutes from duration_seconds if exists
    try:
        conn = op.get_bind()
        conn.execute(sa.text("UPDATE exams SET duration_minutes = COALESCE(duration_minutes, CAST(duration_seconds/60 AS INTEGER), 20) WHERE duration_minutes IS NULL"))
    except Exception:
        pass

    # Make duration_minutes not nullable with default after backfill
    try:
        # For postgres, alter column; for sqlite this may fail, ignore
        op.alter_column('exams', 'duration_minutes', nullable=False, existing_type=sa.Integer())
    except Exception:
        pass

    # Questions: add text and points
    try:
        op.add_column('questions', sa.Column('text', sa.Text(), nullable=True))
    except Exception:
        pass
    try:
        op.add_column('questions', sa.Column('points', sa.Integer(), nullable=True, server_default='1'))
    except Exception:
        pass
    try:
        conn = op.get_bind()
        conn.execute(sa.text("UPDATE questions SET text = question_text WHERE text IS NULL AND question_text IS NOT NULL"))
        conn.execute(sa.text("UPDATE questions SET points = 1 WHERE points IS NULL"))
    except Exception:
        pass

    # Options: add text
    try:
        op.add_column('options', sa.Column('text', sa.String(length=1000), nullable=True))
    except Exception:
        pass
    try:
        conn = op.get_bind()
        conn.execute(sa.text("UPDATE options SET text = option_text WHERE text IS NULL AND option_text IS NOT NULL"))
    except Exception:
        pass

    # Students: make whatsapp_number nullable, drop unique if exists
    # This is complex across DBs, so we try to make column nullable
    try:
        op.alter_column('students', 'whatsapp_number', existing_type=sa.String(length=50), nullable=True)
    except Exception:
        pass

    # For postgres, drop unique constraint if exists
    try:
        op.drop_index(op.f('ix_students_whatsapp_number'), table_name='students')
    except Exception:
        pass
    try:
        op.drop_constraint('students_whatsapp_number_key', 'students', type_='unique')
    except Exception:
        pass
    try:
        op.create_index(op.f('ix_students_name'), 'students', ['name'], unique=False)
    except Exception:
        pass

    # Exam attempts: add new canonical columns
    for col_def in [
        sa.Column('submitted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('total_score', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('completion_time_seconds', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('ranking', sa.Integer(), nullable=True),
    ]:
        try:
            op.add_column('exam_attempts', col_def)
        except Exception:
            pass

    # Backfill new columns from legacy
    try:
        conn = op.get_bind()
        conn.execute(sa.text("UPDATE exam_attempts SET submitted_at = finished_at WHERE submitted_at IS NULL"))
        conn.execute(sa.text("UPDATE exam_attempts SET total_score = COALESCE(total_questions, 0) WHERE total_score IS NULL OR total_score = 0"))
        conn.execute(sa.text("UPDATE exam_attempts SET completion_time_seconds = COALESCE(completion_seconds, 0) WHERE completion_time_seconds IS NULL OR completion_time_seconds = 0"))
        conn.execute(sa.text("UPDATE exam_attempts SET ranking = final_rank WHERE ranking IS NULL"))
    except Exception:
        pass

    # Attempt answers: add option_id and points_awarded
    try:
        op.add_column('attempt_answers', sa.Column('option_id', sa.Integer(), nullable=True))
    except Exception:
        pass
    try:
        op.add_column('attempt_answers', sa.Column('points_awarded', sa.Integer(), nullable=True, server_default='0'))
    except Exception:
        pass
    try:
        conn = op.get_bind()
        conn.execute(sa.text("UPDATE attempt_answers SET option_id = selected_option_id WHERE option_id IS NULL"))
        # Points awarded will be set on scoring
    except Exception:
        pass

    # Add foreign key for option_id if not exists (skip if sqlite)
    try:
        op.create_foreign_key('fk_attempt_answers_option_id', 'attempt_answers', 'options', ['option_id'], ['id'], ondelete='CASCADE')
    except Exception:
        pass


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
