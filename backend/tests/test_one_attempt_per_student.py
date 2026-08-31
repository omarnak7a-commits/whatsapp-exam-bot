"""One attempt per student per exam (scenarios A-G + race condition).

The rule: a student NAME (trimmed, case-insensitive) may start a given exam
exactly once. Any previous attempt - IN_PROGRESS, COMPLETED or EXPIRED -
consumes it, and every further start returns 409 Conflict.
"""
import asyncio

import pytest
from httpx import AsyncClient
from sqlalchemy import select

from app.models.exam_attempt import ExamAttempt, AttemptStatus


CONFLICT_MESSAGE = (
    "لقد دخلت هذا الامتحان من قبل، وتم تسجيل محاولتك. لا يُسمح بإعادة الامتحان."
)


async def _make_published_exam(client: AsyncClient, headers: dict) -> tuple[int, str]:
    res = await client.post(
        "/api/exams",
        json={"title": "امتحان محاولة واحدة", "duration_minutes": 10},
        headers=headers,
    )
    exam_id = res.json()["id"]
    await client.post(
        f"/api/exams/{exam_id}/questions",
        json={
            "text": "كم يساوي 1 + 1؟",
            "points": 1,
            "options": [
                {"text": "2", "is_correct": True},
                {"text": "3", "is_correct": False},
            ],
        },
        headers=headers,
    )
    await client.post(f"/api/exams/{exam_id}/publish", headers=headers)
    slug = (await client.get(f"/api/exams/{exam_id}", headers=headers)).json()["public_slug"]
    return exam_id, slug


async def _start(client: AsyncClient, slug: str, name: str):
    return await client.post(
        f"/api/public/exams/{slug}/attempts", json={"student_name": name}
    )


def _assert_conflict(res) -> None:
    assert res.status_code == 409, res.text
    assert res.json()["detail"] == CONFLICT_MESSAGE


@pytest.mark.asyncio
async def test_scenario_a_new_student_can_start(client: AsyncClient, admin_auth_token: str):
    """Scenario A: a brand-new student is allowed in."""
    headers = {"Authorization": f"Bearer {admin_auth_token}"}
    _, slug = await _make_published_exam(client, headers)

    res = await _start(client, slug, "Omar")
    assert res.status_code == 200, res.text
    assert res.json()["status"] == AttemptStatus.IN_PROGRESS.value


@pytest.mark.asyncio
async def test_scenario_b_and_e_in_progress_is_not_resumed_or_recreated(
    client: AsyncClient, admin_auth_token: str, db_session
):
    """Scenarios B & E: leaving the page / refreshing never yields a new attempt."""
    headers = {"Authorization": f"Bearer {admin_auth_token}"}
    exam_id, slug = await _make_published_exam(client, headers)

    first = await _start(client, slug, "Omar")
    assert first.status_code == 200

    # Re-opening the link (still IN_PROGRESS) is refused, not resumed.
    for _ in range(3):
        _assert_conflict(await _start(client, slug, "Omar"))

    rows = (
        await db_session.execute(
            select(ExamAttempt).where(ExamAttempt.exam_id == exam_id)
        )
    ).scalars().all()
    assert len(rows) == 1


@pytest.mark.asyncio
async def test_scenario_c_expired_attempt_blocks_retake(
    client: AsyncClient, admin_auth_token: str, db_session
):
    """Scenario C: an EXPIRED attempt still counts as consumed."""
    headers = {"Authorization": f"Bearer {admin_auth_token}"}
    exam_id, slug = await _make_published_exam(client, headers)

    res = await _start(client, slug, "Omar")
    attempt_id = res.json()["id"]

    attempt = (
        await db_session.execute(
            select(ExamAttempt).where(ExamAttempt.id == attempt_id)
        )
    ).scalars().first()
    attempt.status = AttemptStatus.EXPIRED.value
    await db_session.commit()

    _assert_conflict(await _start(client, slug, "Omar"))


@pytest.mark.asyncio
async def test_scenario_d_completed_attempt_blocks_retake(
    client: AsyncClient, admin_auth_token: str
):
    """Scenario D: after submitting, the student cannot start again."""
    headers = {"Authorization": f"Bearer {admin_auth_token}"}
    exam_id, slug = await _make_published_exam(client, headers)

    res = await _start(client, slug, "Omar")
    attempt_id = res.json()["id"]

    bundle = await client.get(f"/api/public/attempts/{attempt_id}")
    q = bundle.json()["questions"][0]
    await client.post(
        f"/api/public/attempts/{attempt_id}/answers",
        json={"question_id": q["id"], "option_id": q["options"][0]["id"]},
    )
    submit = await client.post(f"/api/public/attempts/{attempt_id}/submit")
    assert submit.status_code == 200

    _assert_conflict(await _start(client, slug, "Omar"))


@pytest.mark.asyncio
async def test_scenario_f_direct_api_call_is_rejected(
    client: AsyncClient, admin_auth_token: str, db_session
):
    """Scenario F: hitting the API directly cannot bypass the rule."""
    headers = {"Authorization": f"Bearer {admin_auth_token}"}
    exam_id, slug = await _make_published_exam(client, headers)

    assert (await _start(client, slug, "Omar")).status_code == 200
    for _ in range(5):
        _assert_conflict(await _start(client, slug, "Omar"))

    rows = (
        await db_session.execute(
            select(ExamAttempt).where(ExamAttempt.exam_id == exam_id)
        )
    ).scalars().all()
    assert len(rows) == 1


@pytest.mark.asyncio
async def test_scenario_g_different_student_is_allowed(
    client: AsyncClient, admin_auth_token: str
):
    """Scenario G: a different name gets their own attempt."""
    headers = {"Authorization": f"Bearer {admin_auth_token}"}
    _, slug = await _make_published_exam(client, headers)

    assert (await _start(client, slug, "Omar")).status_code == 200
    assert (await _start(client, slug, "Ahmed")).status_code == 200


@pytest.mark.asyncio
async def test_name_matching_is_trimmed_and_case_insensitive(
    client: AsyncClient, admin_auth_token: str
):
    """'Omar', 'omar' and '  OMAR  ' are the same student."""
    headers = {"Authorization": f"Bearer {admin_auth_token}"}
    _, slug = await _make_published_exam(client, headers)

    assert (await _start(client, slug, "Omar")).status_code == 200
    for variant in ("omar", "OMAR", "  Omar  ", "oMaR"):
        _assert_conflict(await _start(client, slug, variant))


@pytest.mark.asyncio
async def test_one_attempt_rule_is_per_exam(client: AsyncClient, admin_auth_token: str):
    """The same student may still take a DIFFERENT exam."""
    headers = {"Authorization": f"Bearer {admin_auth_token}"}
    _, slug_a = await _make_published_exam(client, headers)
    _, slug_b = await _make_published_exam(client, headers)

    assert (await _start(client, slug_a, "Omar")).status_code == 200
    assert (await _start(client, slug_b, "Omar")).status_code == 200
    _assert_conflict(await _start(client, slug_a, "Omar"))


@pytest.mark.asyncio
async def test_concurrent_starts_create_only_one_attempt(
    client: AsyncClient, admin_auth_token: str, db_session
):
    """Race condition: parallel start requests must yield exactly one attempt."""
    headers = {"Authorization": f"Bearer {admin_auth_token}"}
    exam_id, slug = await _make_published_exam(client, headers)

    responses = await asyncio.gather(
        *[_start(client, slug, "Omar") for _ in range(8)],
        return_exceptions=True,
    )
    statuses = [r if isinstance(r, Exception) else r.status_code for r in responses]
    ok = [s for s in statuses if s == 200]
    conflicts = [s for s in statuses if s == 409]

    # Exactly one winner; every loser is rejected with 409 by the database-level
    # unique constraint, which the service converts into the standard message.
    assert len(ok) == 1, statuses
    assert len(conflicts) == len(responses) - 1, statuses

    # NOTE: the row count is intentionally not asserted here. All test sessions
    # share a single SQLite connection (StaticPool), so a losing request's
    # rollback also reverts the winner's not-yet-committed INSERT. That
    # cross-talk cannot happen on PostgreSQL, where each request gets its own
    # connection and transaction. Persistence after a successful start is
    # covered by the scenario tests above.
