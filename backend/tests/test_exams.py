import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_and_manage_exam(client: AsyncClient, admin_auth_token: str):
    headers = {"Authorization": f"Bearer {admin_auth_token}"}

    # 1. Create Exam
    exam_payload = {
        "title": "امتحان الأحياء",
        "description": "امتحان ثانوي عام",
        "duration_seconds": 900,
        "number_of_questions": 5,
        "randomize_questions": True,
        "randomize_options": True,
        "one_attempt_only": True,
        "show_correct_answer_immediately": True,
    }
    res = await client.post("/api/exams", json=exam_payload, headers=headers)
    assert res.status_code == 201
    exam_data = res.json()
    exam_id = exam_data["id"]
    assert exam_data["title"] == "امتحان الأحياء"
    assert exam_data["status"] == "DRAFT"

    # 2. Try publish without questions -> Should fail
    res_pub_fail = await client.post(f"/api/exams/{exam_id}/publish", headers=headers)
    assert res_pub_fail.status_code == 400

    # 3. Add Question with options
    q_payload = {
        "question_text": "ما هو الخلية الحية؟",
        "order_index": 1,
        "options": [
            {"option_text": "الوحدة البنائية للكائن الحي", "is_correct": True},
            {"option_text": "جزيء كيميائي صلب", "is_correct": False},
            {"option_text": "عنصر غازي", "is_correct": False},
            {"option_text": "خلية غير حية", "is_correct": False},
        ],
    }
    res_q = await client.post(f"/api/exams/{exam_id}/questions", json=q_payload, headers=headers)
    assert res_q.status_code == 201

    # 4. Now Publish -> Success
    res_pub = await client.post(f"/api/exams/{exam_id}/publish", headers=headers)
    assert res_pub.status_code == 200
    assert res_pub.json()["status"] == "PUBLISHED"

    # 5. Close Exam -> Success
    res_close = await client.post(f"/api/exams/{exam_id}/close", headers=headers)
    assert res_close.status_code == 200
    assert res_close.json()["status"] == "CLOSED"
