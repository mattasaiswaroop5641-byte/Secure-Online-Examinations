import pytest
import uuid

def test_student_cannot_access_db_actions(client):
    # Login as student
    login_resp = client.post(
        "/api/auth/login",
        json={"email": "student@example.com", "password": "Student@123"}
    )
    assert login_resp.status_code == 200
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Attempt to reset DB
    resp = client.post(
        "/api/admin/database/action",
        headers=headers,
        json={"action": "clear_attempts", "confirmation_code": "CONFIRM_DATABASE_RESET"}
    )
    assert resp.status_code == 403

def test_admin_db_action_clear_attempts(client):
    # Create fresh dynamic admin
    uid = uuid.uuid4().hex[:6]
    admin_email = f"db_admin_{uid}@example.com"
    client.post(
        "/api/auth/register",
        json={
            "name": "DB Super Admin",
            "email": admin_email,
            "student_id": f"ADM-{uid}",
            "password": "Password123!",
            "role": "admin"
        }
    )

    login_resp = client.post(
        "/api/auth/login",
        json={"email": admin_email, "password": "Password123!"}
    )
    assert login_resp.status_code == 200
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Wrong confirmation code
    resp_bad = client.post(
        "/api/admin/database/action",
        headers=headers,
        json={"action": "clear_attempts", "confirmation_code": "WRONG_CODE"}
    )
    assert resp_bad.status_code == 400

    # Correct confirmation code
    resp_ok = client.post(
        "/api/admin/database/action",
        headers=headers,
        json={"action": "clear_attempts", "confirmation_code": "CONFIRM_DATABASE_RESET"}
    )
    assert resp_ok.status_code == 200
    data = resp_ok.json()
    assert data["status"] == "success"
    assert data["action"] == "clear_attempts"

def test_silent_live_feed_push_and_watch(client):
    uid = uuid.uuid4().hex[:6]
    student_email = f"live_cand_{uid}@example.com"
    client.post(
        "/api/auth/register",
        json={
            "name": "Live Candidate",
            "email": student_email,
            "student_id": f"LIVE-{uid}",
            "password": "Password123!",
            "role": "student"
        }
    )

    student_login = client.post(
        "/api/auth/login",
        json={"email": student_email, "password": "Password123!"}
    )
    student_token = student_login.json()["access_token"]
    student_headers = {"Authorization": f"Bearer {student_token}"}

    # Get exams and start attempt
    exams_resp = client.get("/api/exams", headers=student_headers)
    assert exams_resp.status_code == 200
    exams = exams_resp.json()
    assert len(exams) > 0
    exam_id = exams[0]["id"]

    start_resp = client.post(f"/api/attempts/exams/{exam_id}/start", headers=student_headers)
    assert start_resp.status_code == 200
    attempt_id = start_resp.json()["attempt_id"]

    # Student pushes silent live frame
    push_resp = client.post(
        f"/api/proctoring/live-feed/{attempt_id}",
        headers=student_headers,
        json={
            "image_base64": "data:image/jpeg;base64,dGVzdF9mcmFtZV9kYXRh",
            "trust_score": 98,
            "violation_count": 0,
            "looking_direction": "CENTER",
            "face_count": 1
        }
    )
    assert push_resp.status_code == 200

    # Admin watches live feed
    admin_email = f"live_admin_{uid}@example.com"
    client.post(
        "/api/auth/register",
        json={
            "name": "Watch Admin",
            "email": admin_email,
            "student_id": f"ADM-{uid}",
            "password": "Password123!",
            "role": "admin"
        }
    )
    admin_login = client.post(
        "/api/auth/login",
        json={"email": admin_email, "password": "Password123!"}
    )
    admin_token = admin_login.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    watch_resp = client.get(
        f"/api/proctoring/live-feed/{attempt_id}",
        headers=admin_headers
    )
    assert watch_resp.status_code == 200
    feed_data = watch_resp.json()
    assert feed_data["attempt_id"] == attempt_id
    assert feed_data["is_live"] is True
    assert feed_data["trust_score"] == 98
    assert feed_data["looking_direction"] == "CENTER"

    # List active candidates
    active_resp = client.get(
        "/api/proctoring/live-active-candidates",
        headers=admin_headers
    )
    assert active_resp.status_code == 200
    active_list = active_resp.json()
    assert any(c["attempt_id"] == attempt_id for c in active_list)
