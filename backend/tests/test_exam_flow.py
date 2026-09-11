import pytest
import uuid

def get_auth_token(client, email: str = "student@example.com", password: str = "Student@123") -> str:
    res = client.post("/api/auth/login", json={"email": email, "password": password})
    return res.json()["access_token"]

def get_fresh_student_token(client) -> str:
    uid = uuid.uuid4().hex[:6]
    email = f"exam_taker_{uid}@example.com"
    client.post(
        "/api/auth/register",
        json={"name": "Exam Taker", "email": email, "student_id": f"EXAM-{uid}", "password": "Student@123", "role": "student"}
    )
    res = client.post("/api/auth/login", json={"email": email, "password": "Student@123"})
    return res.json()["access_token"]

def test_list_exams(client):
    token = get_auth_token(client)
    response = client.get("/api/exams", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    exams = response.json()
    assert len(exams) >= 1
    assert "title" in exams[0]
    assert "duration_minutes" in exams[0]

def test_student_exam_attempt_flow(client):
    token = get_fresh_student_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Get available exams
    exams = client.get("/api/exams", headers=headers).json()
    assert len(exams) > 0
    exam = exams[0]

    # 2. Start exam
    start_resp = client.post(f"/api/attempts/exams/{exam['id']}/start", headers=headers)
    assert start_resp.status_code == 200
    exam_payload = start_resp.json()
    attempt_id = exam_payload["attempt_id"]
    assert "questions" in exam_payload
    assert len(exam_payload["questions"]) > 0

    first_q = exam_payload["questions"][0]
    assert "explanation" not in first_q
    assert "is_correct" not in first_q["options"][0]

    # 3. Save an answer
    ans_opt_id = first_q["options"][0]["id"]
    save_resp = client.post(
        f"/api/attempts/{attempt_id}/answer",
        headers=headers,
        json={"question_id": first_q["id"], "selected_option_id": ans_opt_id, "is_marked_for_review": False}
    )
    assert save_resp.status_code == 200

    # 4. Check time remaining
    time_resp = client.get(f"/api/attempts/{attempt_id}/time-remaining", headers=headers)
    assert time_resp.status_code == 200
    assert time_resp.json()["remaining_seconds"] > 0
    assert time_resp.json()["is_expired"] is False

    # 5. Submit exam
    sub_resp = client.post(f"/api/attempts/{attempt_id}/submit", headers=headers)
    assert sub_resp.status_code == 200
    result = sub_resp.json()
    assert result["status"] == "submitted"
    assert "score" in result
    assert "percentage" in result
    assert "proctoring_score" in result

    # 6. Check detailed result view (now includes explanations and correct answers)
    res_resp = client.get(f"/api/attempts/{attempt_id}/result", headers=headers)
    assert res_resp.status_code == 200
    detail = res_resp.json()
    assert len(detail["questions"]) == len(exam_payload["questions"])
    assert "explanation" in detail["questions"][0]
