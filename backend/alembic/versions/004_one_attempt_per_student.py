"""One attempt per student per exam

Adds a unique constraint on exam_attempts(exam_id, student_id) so the database
itself guarantees a student can only ever have a single attempt per exam.

Existing duplicate attempts are preserved (never deleted): the FIRST attempt of
each (exam_id, student_id) group keeps its student, while each extra attempt is
re-pointed to a newly created student row carrying the SAME name. No result,
score or ranking row is lost, and the application-level check matches on the
normalized student NAME, so those archived duplicates still block a retake.

Revision ID: 004_one_attempt
Revises: 003_exam_settings
Create Date: 2026-09-01 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '004_one_attempt'
down_revision: Union[str, None] = '003_exam_settings'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

CONSTRAINT_NAME = 'uq_exam_attempts_exam_student'


def _dedupe_existing_attempts(bind) -> None:
    """Re-home duplicate attempts onto cloned student rows (non-destructive)."""
    duplicates = bind.execute(
        sa.text(
            """
            SELECT exam_id, student_id
            FROM exam_attempts
            GROUP BY exam_id, student_id
            HAVING COUNT(*) > 1
            """
        )
    ).fetchall()

    for exam_id, student_id in duplicates:
        # Oldest attempt first - it keeps the original student_id.
        rows = bind.execute(
            sa.text(
                """
                SELECT id FROM exam_attempts
                WHERE exam_id = :exam_id AND student_id = :student_id
                ORDER BY started_at ASC, id ASC
                """
            ),
            {"exam_id": exam_id, "student_id": student_id},
        ).fetchall()

        student = bind.execute(
            sa.text("SELECT name, whatsapp_number FROM students WHERE id = :sid"),
            {"sid": student_id},
        ).first()
        if student is None:
            continue
        name = student[0]
        whatsapp_number = student[1]

        for (attempt_id,) in rows[1:]:
            insert_sql = sa.text(
                "INSERT INTO students (name, whatsapp_number, is_active) "
                "VALUES (:name, :wa, :active)"
            )
            if bind.dialect.name == 'postgresql':
                new_student_id = bind.execute(
                    sa.text(str(insert_sql) + " RETURNING id"),
                    {"name": name, "wa": whatsapp_number, "active": True},
                ).scalar()
            else:
                result = bind.execute(
                    insert_sql,
                    {"name": name, "wa": whatsapp_number, "active": True},
                )
                new_student_id = result.lastrowid

            bind.execute(
                sa.text(
                    "UPDATE exam_attempts SET student_id = :new_sid WHERE id = :aid"
                ),
                {"new_sid": new_student_id, "aid": attempt_id},
            )


NAME_CONSTRAINT_NAME = 'uq_exam_attempts_exam_name'


def _add_student_name_key(bind) -> None:
    """Add + backfill the normalized student-name key column."""
    insp = sa.inspect(bind)
    cols = {c['name'] for c in insp.get_columns('exam_attempts')}
    if 'student_name_key' not in cols:
        op.add_column(
            'exam_attempts',
            sa.Column('student_name_key', sa.String(length=255), nullable=True),
        )

    # Backfill only the FIRST attempt of each (exam, normalized name) group, so
    # any archived duplicate keeps a NULL key and the unique index can be built
    # without deleting a single row (NULLs do not collide in a UNIQUE index).
    bind.execute(
        sa.text(
            """
            UPDATE exam_attempts SET student_name_key = (
                SELECT LOWER(TRIM(s.name)) FROM students s
                WHERE s.id = exam_attempts.student_id
            )
            WHERE student_name_key IS NULL
              AND id IN (
                SELECT MIN(a.id) FROM exam_attempts a
                JOIN students st ON st.id = a.student_id
                GROUP BY a.exam_id, LOWER(TRIM(st.name))
              )
            """
        )
    )


def upgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)

    existing = {c.get('name') for c in insp.get_unique_constraints('exam_attempts')}
    existing |= {i.get('name') for i in insp.get_indexes('exam_attempts')}

    _add_student_name_key(bind)

    if NAME_CONSTRAINT_NAME not in existing:
        op.create_index(
            NAME_CONSTRAINT_NAME,
            'exam_attempts',
            ['exam_id', 'student_name_key'],
            unique=True,
        )

    if CONSTRAINT_NAME in existing:
        return

    _dedupe_existing_attempts(bind)

    if bind.dialect.name == 'sqlite':
        # SQLite cannot ADD CONSTRAINT; a unique index is equivalent here and
        # raises the same IntegrityError the service layer converts to 409.
        op.create_index(
            CONSTRAINT_NAME, 'exam_attempts', ['exam_id', 'student_id'], unique=True
        )
    else:
        op.create_unique_constraint(
            CONSTRAINT_NAME, 'exam_attempts', ['exam_id', 'student_id']
        )


def downgrade() -> None:
    bind = op.get_bind()
    op.drop_index(NAME_CONSTRAINT_NAME, table_name='exam_attempts')
    op.drop_column('exam_attempts', 'student_name_key')
    if bind.dialect.name == 'sqlite':
        op.drop_index(CONSTRAINT_NAME, table_name='exam_attempts')
    else:
        op.drop_constraint(CONSTRAINT_NAME, 'exam_attempts', type_='unique')
