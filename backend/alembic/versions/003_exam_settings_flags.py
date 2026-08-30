"""Exam behaviour settings (instant feedback / show correct / leaderboard)

Revision ID: 003_exam_settings
Revises: 002_jebt_kam
Create Date: 2026-08-30 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '003_exam_settings'
down_revision: Union[str, None] = '002_jebt_kam'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    existing = {c['name'] for c in insp.get_columns('exams')}

    if 'instant_feedback_enabled' not in existing:
        op.add_column(
            'exams',
            sa.Column('instant_feedback_enabled', sa.Boolean(), nullable=False, server_default=sa.false()),
        )
    if 'show_correct_answers' not in existing:
        op.add_column(
            'exams',
            sa.Column('show_correct_answers', sa.Boolean(), nullable=False, server_default=sa.true()),
        )
    if 'leaderboard_enabled' not in existing:
        op.add_column(
            'exams',
            sa.Column('leaderboard_enabled', sa.Boolean(), nullable=False, server_default=sa.true()),
        )

    q_cols = {c['name'] for c in insp.get_columns('questions')}
    if 'question_type' not in q_cols:
        op.add_column(
            'questions',
            sa.Column('question_type', sa.String(length=20), nullable=False, server_default='multiple_choice'),
        )


def downgrade() -> None:
    op.drop_column('exams', 'leaderboard_enabled')
    op.drop_column('exams', 'show_correct_answers')
    op.drop_column('exams', 'instant_feedback_enabled')
