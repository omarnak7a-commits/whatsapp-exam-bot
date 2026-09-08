"""Auto submit on exit: exam page load tracking + heartbeat

Adds two columns to exam_attempts:
  * load_count    - how many times the exam page was delivered for the attempt.
                    The page is served once; a second delivery means the student
                    left and the attempt is auto-submitted.
  * last_seen_at  - last heartbeat from the exam page. When it goes stale the
                    server sweeps the attempt and auto-submits it.

Existing rows are backfilled conservatively (load_count = 1 for in-progress
attempts, last_seen_at = started_at) so no historical attempt is auto-submitted
retroactively by mistake and no data is lost.

Revision ID: 005_auto_submit
Revises: 004_one_attempt
Create Date: 2026-09-01 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '005_auto_submit'
down_revision: Union[str, None] = '004_one_attempt'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    cols = {c['name'] for c in insp.get_columns('exam_attempts')}

    if 'load_count' not in cols:
        op.add_column(
            'exam_attempts',
            sa.Column('load_count', sa.Integer(), nullable=False, server_default='0'),
        )
    if 'last_seen_at' not in cols:
        op.add_column(
            'exam_attempts',
            sa.Column('last_seen_at', sa.DateTime(timezone=True), nullable=True),
        )

    # Backfill: treat already-running attempts as having been loaded once and
    # seen at their start time, so the normal rules apply from here on.
    bind.execute(
        sa.text(
            "UPDATE exam_attempts SET last_seen_at = started_at "
            "WHERE last_seen_at IS NULL"
        )
    )
    bind.execute(
        sa.text(
            "UPDATE exam_attempts SET load_count = 1 "
            "WHERE load_count = 0 AND status = 'IN_PROGRESS'"
        )
    )


def downgrade() -> None:
    op.drop_column('exam_attempts', 'last_seen_at')
    op.drop_column('exam_attempts', 'load_count')
