"""Auto submit when the student leaves the exam page before submitting.

Rule: any exit from the exam page before pressing Submit finalizes the attempt
with the answers saved so far, using the same scoring path as a normal submit.
The backend is the source of truth, so these tests exercise the server
behaviour that backs each browser scenario.
"""
import pytest
from httpx import AsyncClient
from sqlalchemy import select

from app.models.exam_attempt import ExamAttempt, AttemptStatus
from app.services.public_attempt_service import PublicAttemptService


CONFLICT_MESSAGE = (
    "لقد دخلت هذا الامتحان من قبل، وتم تسجيل محاولتك. لا يُسمح بإعادة الامتحان."
)


async def _make_exam(client: AsyncClient, headers: dict, n_questions: int = 2):
    res = await client.post(
        "/api/exams",
        json={"title": "امتحان الخروج التلقائي", "duration_minutes": 30},
        headers=headers,
    )
    exam_id = res.json()["id"]
    for i in range(n_questions):
        await client.post(
            f"/api/exams/{exam_id}/questions",
            json={
                "text": f"سؤال {i + 1}",
                "points": 1,
                "order_index": i,
                "options": [
                    {"text": "صح", "is_correct": True, "order_index": 0},
                    {"text": "غلط", "is_correct": False, "order_index": 1},
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


async def _answer_first(client: AsyncClient, attempt_id: int, correct: bool = True):
    """Answer the first question; option 0 is the correct one."""
    bundle = await client.get(f"/api/public/attempts/{attempt_id}")
    q = bundle.json()["questions"][0]
    opt = q["options"][0 if correct else 1]
    return await client.post(
        f"/api/public/attempts/{attempt_id}/answers",
        json={"question_id": q["id"], "option_id": opt["id"]},
    )


@pytest.mark.asyncio
async def test_1_new_student_starts(client: AsyncClient, admin_auth_token: str):
    """Test 1: a new student starts the exam."""
    headers = {"Authorization": f"Bearer {admin_auth_token}"}
    _, slug = await _make_exam(client, headers)

    res = await _start(client, slug, "Omar")
    assert res.status_code == 200
    assert res.json()["status"] == AttemptStatus.IN_PROGRESS.value


@pytest.mark.asyncio
async def test_2_normal_submit_then_second_attempt_rejected(
    client: AsyncClient, admin_auth_token: str
):
    """Test 2: Submit -> COMPLETED + result, and a second attempt is refused."""
    headers = {"Authorization": f"Bearer {admin_auth_token}"}
    _, slug = await _make_exam(client, headers)

    attempt_id = (await _start(client, slug, "Omar")).json()["id"]
    await _answer_first(client, attempt_id, correct=True)

    submitted = await client.post(f"/api/public/attempts/{attempt_id}/submit")
    assert submitted.status_code == 200
    assert submitted.json()["status"] == AttemptStatus.COMPLETED.value

    result = await client.get(f"/api/public/attempts/{attempt_id}/result")
    assert result.status_code == 200
    assert result.json()["score"] == 1

    again = await _start(client, slug, "Omar")
    assert again.status_code == 409


@pytest.mark.asyncio
async def test_3_auto_submit_on_exit_scores_saved_answers(
    client: AsyncClient, admin_auth_token: str
):
    """Test 3: leaving (Back / close) auto-submits and scores what was saved."""
    headers = {"Authorization": f"Bearer {admin_auth_token}"}
    _, slug = await _make_exam(client, headers, n_questions=2)

    attempt_id = (await _start(client, slug, "Omar")).json()["id"]
    await _answer_first(client, attempt_id, correct=True)

    # The exam page unloads and fires the auto-submit beacon.
    auto = await client.post(f"/api/public/attempts/{attempt_id}/auto-submit")
    assert auto.status_code == 200
    assert auto.json()["status"] == AttemptStatus.COMPLETED.value

    # Scored exactly like a normal submit: 1 of 2 answered and correct.
    result = (await client.get(f"/api/public/attempts/{attempt_id}/result")).json()
    assert result["score"] == 1
    assert result["correct_answers"] == 1
    assert result["unanswered"] == 1
    assert result["completion_time_seconds"] >= 0

    # And the student cannot come back in.
    assert (await _start(client, slug, "Omar")).status_code == 409


@pytest.mark.asyncio
async def test_auto_submit_is_idempotent(client: AsyncClient, admin_auth_token: str):
    """Beacons can be delivered more than once; repeats must not error."""
    headers = {"Authorization": f"Bearer {admin_auth_token}"}
    _, slug = await _make_exam(client, headers)

    attempt_id = (await _start(client, slug, "Omar")).json()["id"]
    await _answer_first(client, attempt_id, correct=True)

    first = await client.post(f"/api/public/attempts/{attempt_id}/auto-submit")
    score = first.json()["score"]
    for _ in range(3):
        again = await client.post(f"/api/public/attempts/{attempt_id}/auto-submit")
        assert again.status_code == 200
        assert again.json()["score"] == score


@pytest.mark.asyncio
async def test_4_refresh_reloads_page_and_auto_submits(
    client: AsyncClient, admin_auth_token: str
):
    """Test 4: refreshing re-requests the exam page -> auto submit, no resume."""
    headers = {"Authorization": f"Bearer {admin_auth_token}"}
    _, slug = await _make_exam(client, headers)

    attempt_id = (await _start(client, slug, "Omar")).json()["id"]

    # First page load: the exam is served normally.
    first_load = await client.get(f"/api/public/attempts/{attempt_id}")
    assert first_load.json()["attempt"]["status"] == AttemptStatus.IN_PROGRESS.value

    # Refresh = second delivery of the exam page -> attempt is finalized.
    second_load = await client.get(f"/api/public/attempts/{attempt_id}")
    assert second_load.json()["attempt"]["status"] == AttemptStatus.COMPLETED.value

    # The student cannot continue the exam.
    third_load = await client.get(f"/api/public/attempts/{attempt_id}")
    assert third_load.json()["attempt"]["status"] == AttemptStatus.COMPLETED.value
    assert (await _start(client, slug, "Omar")).status_code == 409


@pytest.mark.asyncio
async def test_5_closed_tab_is_swept_when_heartbeat_goes_stale(
    client: AsyncClient, admin_auth_token: str, db_session
):
    """Test 5: no unload event at all (killed tab) - the server sweep catches it."""
    headers = {"Authorization": f"Bearer {admin_auth_token}"}
    exam_id, slug = await _make_exam(client, headers)

    attempt_id = (await _start(client, slug, "Omar")).json()["id"]
    await _answer_first(client, attempt_id, correct=True)

    # Simulate a page that stopped sending heartbeats long ago.
    from datetime import datetime, timedelta, timezone

    attempt = (
        await db_session.execute(select(ExamAttempt).where(ExamAttempt.id == attempt_id))
    ).scalars().first()
    attempt.last_seen_at = datetime.now(timezone.utc) - timedelta(minutes=5)
    await db_session.commit()

    swept = await PublicAttemptService(db_session).sweep_abandoned_attempts(exam_id)
    await db_session.commit()
    assert swept == 1

    result = (await client.get(f"/api/public/attempts/{attempt_id}/result")).json()
    assert result["status"] == AttemptStatus.COMPLETED.value
    assert result["score"] == 1


@pytest.mark.asyncio
async def test_heartbeat_keeps_a_live_page_alive(
    client: AsyncClient, admin_auth_token: str, db_session
):
    """A page that keeps reporting must never be auto-submitted."""
    headers = {"Authorization": f"Bearer {admin_auth_token}"}
    exam_id, slug = await _make_exam(client, headers)

    attempt_id = (await _start(client, slug, "Omar")).json()["id"]
    beat = await client.post(f"/api/public/attempts/{attempt_id}/heartbeat")
    assert beat.status_code == 200
    assert beat.json()["status"] == AttemptStatus.IN_PROGRESS.value

    swept = await PublicAttemptService(db_session).sweep_abandoned_attempts(exam_id)
    assert swept == 0


@pytest.mark.asyncio
async def test_6_reopening_the_link_is_rejected(client: AsyncClient, admin_auth_token: str):
    """Test 6: opening /exam/:slug again returns 409 with the exact message."""
    headers = {"Authorization": f"Bearer {admin_auth_token}"}
    _, slug = await _make_exam(client, headers)

    attempt_id = (await _start(client, slug, "Omar")).json()["id"]
    await client.post(f"/api/public/attempts/{attempt_id}/auto-submit")

    res = await _start(client, slug, "Omar")
    assert res.status_code == 409
    assert res.json()["detail"] == CONFLICT_MESSAGE


@pytest.mark.asyncio
async def test_7_same_name_different_case_after_auto_submit(
    client: AsyncClient, admin_auth_token: str
):
    """Test 7: 'omar' after 'Omar' is the same student."""
    headers = {"Authorization": f"Bearer {admin_auth_token}"}
    _, slug = await _make_exam(client, headers)

    attempt_id = (await _start(client, slug, "Omar")).json()["id"]
    await client.post(f"/api/public/attempts/{attempt_id}/auto-submit")

    for variant in ("omar", "OMAR", "  Omar  "):
        res = await _start(client, slug, variant)
        assert res.status_code == 409, variant


@pytest.mark.asyncio
async def test_8_other_student_still_gets_one_attempt(
    client: AsyncClient, admin_auth_token: str
):
    """Test 8: Ahmed gets his own single attempt."""
    headers = {"Authorization": f"Bearer {admin_auth_token}"}
    _, slug = await _make_exam(client, headers)

    omar_attempt = (await _start(client, slug, "Omar")).json()["id"]
    await client.post(f"/api/public/attempts/{omar_attempt}/auto-submit")

    ahmed = await _start(client, slug, "Ahmed")
    assert ahmed.status_code == 200

    # ... and only one.
    await client.post(f"/api/public/attempts/{ahmed.json()['id']}/auto-submit")
    assert (await _start(client, slug, "Ahmed")).status_code == 409


@pytest.mark.asyncio
async def test_12_expired_attempt_keeps_expired_status(
    client: AsyncClient, admin_auth_token: str, db_session
):
    """Test 12: the timer path is unchanged - timed-out attempts stay EXPIRED."""
    headers = {"Authorization": f"Bearer {admin_auth_token}"}
    _, slug = await _make_exam(client, headers)

    attempt_id = (await _start(client, slug, "Omar")).json()["id"]
    await _answer_first(client, attempt_id, correct=True)

    from datetime import datetime, timedelta, timezone

    attempt = (
        await db_session.execute(select(ExamAttempt).where(ExamAttempt.id == attempt_id))
    ).scalars().first()
    attempt.expires_at = datetime.now(timezone.utc) - timedelta(seconds=1)
    await db_session.commit()

    auto = await client.post(f"/api/public/attempts/{attempt_id}/auto-submit")
    assert auto.json()["status"] == AttemptStatus.EXPIRED.value

    # Scored despite expiring, and still no retake.
    result = (await client.get(f"/api/public/attempts/{attempt_id}/result")).json()
    assert result["score"] == 1
    assert (await _start(client, slug, "Omar")).status_code == 409
