import pytest
import uuid

def get_admin_token(client) -> str:
    uid = uuid.uuid4().hex[:6]
    email = f"examiner_kick_{uid}@example.com"
    client.post(
        "/api/auth/register",
        json={"name": "Examiner Proctor", "email": email, "password": "Examiner@123", "role": "examiner"}
    )
    res = client.post("/api/auth/login", json={"email": email, "password": "Examiner@123"})
    return res.json()["access_token"]

def get_fresh_student_token(client) -> tuple[str, int]:
    uid = uuid.uuid4().hex[:6]
    email = f"kick_victim_{uid}@example.com"
    reg = client.post(
        "/api/auth/register",
        json={"name": "Kick Victim", "email": email, "student_id": f"KICK-{uid}", "password": "Student@123", "role": "student"}
    )
    student_id = reg.json()["id"]
    res = client.post("/api/auth/login", json={"email": email, "password": "Student@123"})
    return res.json()["access_token"], student_id

def test_admin_kick_candidate_flow(client):
    admin_token = get_admin_token(client)
    student_token, student_id = get_fresh_student_token(client)

    student_headers = {"Authorization": f"Bearer {student_token}"}
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # 1. Student starts exam
    exams = client.get("/api/exams", headers=student_headers).json()
    assert len(exams) > 0
    exam = exams[0]
    start_resp = client.post(f"/api/attempts/exams/{exam['id']}/start", headers=student_headers)
    assert start_resp.status_code == 200
    attempt_id = start_resp.json()["attempt_id"]

    # 2. Non-admin student attempts to kick (should be 403 Forbidden)
    forbidden_resp = client.post(
        f"/api/attempts/{attempt_id}/kick",
        headers=student_headers,
        json={"reason": "Self kick"}
    )
    assert forbidden_resp.status_code == 403

    # 3. Admin kicks the candidate after viewing evidence
    kick_reason = "Severe academic dishonesty observed via continuous proctoring evidence: secondary individual detected."
    kick_resp = client.post(
        f"/api/attempts/{attempt_id}/kick",
        headers=admin_headers,
        json={"reason": kick_reason}
    )
    assert kick_resp.status_code == 200
    kick_data = kick_resp.json()
    assert kick_data["status"] == "terminated"
    assert kick_data["is_passed"] is False
    assert kick_data["termination_reason"] == kick_reason
    assert kick_data["terminated_by_name"] is not None

    # 4. Student checks time-remaining sync (should receive terminated status and termination_reason)
    time_resp = client.get(f"/api/attempts/{attempt_id}/time-remaining", headers=student_headers)
    assert time_resp.status_code == 200
    time_data = time_resp.json()
    assert time_data["status"] == "terminated"
    assert time_data["is_expired"] is True
    assert time_data["termination_reason"] == kick_reason

    # 5. Proctoring summary includes PROCTOR_TERMINATED incident
    proc_summary = client.get(f"/api/proctoring/{attempt_id}", headers=admin_headers).json()
    assert any(ev["event_type"] == "PROCTOR_TERMINATED" for ev in proc_summary["events"])

    # 6. Student result view reflects termination and disqualification
    result_resp = client.get(f"/api/attempts/{attempt_id}/result", headers=student_headers)
    assert result_resp.status_code == 200
    result_data = result_resp.json()
    assert result_data["status"] == "terminated"
    assert result_data["is_passed"] is False
    assert result_data["termination_reason"] == kick_reason
