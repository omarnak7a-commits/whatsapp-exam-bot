"""The leaderboard is per-exam: ONE EXAM -> ONE LEADERBOARD.

An attempt on exam A must never appear in exam B's ranking, on either the admin
endpoint (/exams/{exam_id}/leaderboard) or the public one
(/public/exams/{slug}/leaderboard).
"""
import pytest
from httpx import AsyncClient


async def _make_exam(client: AsyncClient, headers: dict, title: str):
    """Published exam with 10 single-point questions, so score == percentage/10."""
    res = await client.post(
        "/api/exams", json={"title": title, "duration_minutes": 30}, headers=headers
    )
    exam_id = res.json()["id"]
    for i in range(10):
        await client.post(
            f"/api/exams/{exam_id}/questions",
            json={
                "text": f"{title} - سؤال {i + 1}",
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


async def _sit_exam(client: AsyncClient, slug: str, name: str, correct_count: int):
    """Take the exam answering `correct_count` questions correctly, then submit."""
    started = await client.post(
        f"/api/public/exams/{slug}/attempts", json={"student_name": name}
    )
    assert started.status_code == 200, started.text
    attempt_id = started.json()["id"]

    bundle = (await client.get(f"/api/public/attempts/{attempt_id}")).json()
    for idx, q in enumerate(bundle["questions"]):
        # options[0] is the correct one; answer wrongly once the quota is used up.
        opt = q["options"][0] if idx < correct_count else q["options"][1]
        await client.post(
            f"/api/public/attempts/{attempt_id}/answers",
            json={"question_id": q["id"], "option_id": opt["id"]},
        )
    await client.post(f"/api/public/attempts/{attempt_id}/submit")
    return attempt_id


@pytest.mark.asyncio
async def test_admin_leaderboard_is_scoped_to_the_selected_exam(
    client: AsyncClient, admin_auth_token: str
):
    headers = {"Authorization": f"Bearer {admin_auth_token}"}

    exam_a, slug_a = await _make_exam(client, headers, "امتحان الرياضيات")
    exam_b, slug_b = await _make_exam(client, headers, "امتحان العلوم")

    # Exam A: Omar 90%, Ahmed 80%
    await _sit_exam(client, slug_a, "Omar", 9)
    await _sit_exam(client, slug_a, "Ahmed", 8)
    # Exam B: Mohamed 95% (of 10 questions -> 10), Omar 70%
    await _sit_exam(client, slug_b, "Mohamed", 10)
    await _sit_exam(client, slug_b, "Omar", 7)

    board_a = (await client.get(f"/api/exams/{exam_a}/leaderboard", headers=headers)).json()
    board_b = (await client.get(f"/api/exams/{exam_b}/leaderboard", headers=headers)).json()

    # Exam A: only its own two students, ranked by score.
    assert [e["student_name"] for e in board_a] == ["Omar", "Ahmed"]
    assert [e["percentage"] for e in board_a] == [90.0, 80.0]
    assert [e["rank"] for e in board_a] == [1, 2]
    assert "Mohamed" not in [e["student_name"] for e in board_a]

    # Exam B: Mohamed first; Omar appears with his exam-B score (70), never 90.
    assert [e["student_name"] for e in board_b] == ["Mohamed", "Omar"]
    assert [e["percentage"] for e in board_b] == [100.0, 70.0]
    omar_b = next(e for e in board_b if e["student_name"] == "Omar")
    assert omar_b["percentage"] == 70.0, "Omar's exam-A score leaked into exam B"

    # No cross-contamination in either direction.
    assert len(board_a) == 2 and len(board_b) == 2


@pytest.mark.asyncio
async def test_public_leaderboard_is_scoped_to_the_slug_in_the_url(
    client: AsyncClient, admin_auth_token: str
):
    headers = {"Authorization": f"Bearer {admin_auth_token}"}

    _, slug_a = await _make_exam(client, headers, "امتحان اللغة العربية")
    _, slug_b = await _make_exam(client, headers, "امتحان الإنجليزي")

    await _sit_exam(client, slug_a, "Sara", 9)
    await _sit_exam(client, slug_b, "Khaled", 6)

    public_a = (await client.get(f"/api/public/exams/{slug_a}/leaderboard")).json()
    public_b = (await client.get(f"/api/public/exams/{slug_b}/leaderboard")).json()

    assert [e["student_name"] for e in public_a] == ["Sara"]
    assert [e["student_name"] for e in public_b] == ["Khaled"]


@pytest.mark.asyncio
async def test_tie_is_broken_by_completion_time(client: AsyncClient, admin_auth_token: str):
    """Equal scores keep the existing tie-break: faster completion ranks higher."""
    headers = {"Authorization": f"Bearer {admin_auth_token}"}
    exam_id, slug = await _make_exam(client, headers, "امتحان التعادل")

    await _sit_exam(client, slug, "First", 8)
    await _sit_exam(client, slug, "Second", 8)

    board = (await client.get(f"/api/exams/{exam_id}/leaderboard", headers=headers)).json()
    assert len(board) == 2
    assert board[0]["percentage"] == board[1]["percentage"] == 80.0
    # Same score -> the quicker attempt is ranked first.
    assert board[0]["completion_time_seconds"] <= board[1]["completion_time_seconds"]
    assert [e["rank"] for e in board] == [1, 2]


@pytest.mark.asyncio
async def test_leaderboard_of_an_exam_without_attempts_is_empty(
    client: AsyncClient, admin_auth_token: str
):
    """A fresh exam must not inherit any other exam's ranking."""
    headers = {"Authorization": f"Bearer {admin_auth_token}"}
    _, slug_a = await _make_exam(client, headers, "امتحان به نتائج")
    empty_id, _ = await _make_exam(client, headers, "امتحان بلا نتائج")

    await _sit_exam(client, slug_a, "Omar", 10)

    board = (await client.get(f"/api/exams/{empty_id}/leaderboard", headers=headers)).json()
    assert board == []
