import pytest
import base64
import numpy as np
import cv2
import uuid

def get_fresh_student_token(client) -> str:
    uid = uuid.uuid4().hex[:6]
    email = f"proctor_test_{uid}@example.com"
    client.post(
        "/api/auth/register",
        json={"name": "Proctor Tester", "email": email, "student_id": f"PROC-{uid}", "password": "Student@123", "role": "student"}
    )
    res = client.post("/api/auth/login", json={"email": email, "password": "Student@123"})
    return res.json()["access_token"]

def make_dummy_base64_image() -> str:
    img = np.zeros((100, 100, 3), dtype=np.uint8)
    img[:] = (50, 50, 50)
    _, buffer = cv2.imencode(".jpg", img)
    return "data:image/jpeg;base64," + base64.b64encode(buffer).decode("utf-8")

def test_proctoring_event_logging(client):
    token = get_fresh_student_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    # First start an exam attempt to attach events to
    exams = client.get("/api/exams", headers=headers).json()
    assert len(exams) > 0
    exam = exams[0]
    start_resp = client.post(f"/api/attempts/exams/{exam['id']}/start", headers=headers)
    assert start_resp.status_code == 200
    attempt_id = start_resp.json()["attempt_id"]

    # Log TAB_SWITCH event
    dummy_img = make_dummy_base64_image()
    event_payload = {
        "attempt_id": attempt_id,
        "event_type": "TAB_SWITCH",
        "severity": "HIGH",
        "duration_seconds": 4.2,
        "description": "Student navigated away to another tab",
        "screenshot_base64": dummy_img
    }
    resp = client.post("/api/proctoring/events", headers=headers, json=event_payload)
    assert resp.status_code == 201
    ev_data = resp.json()
    assert ev_data["event_type"] == "TAB_SWITCH"
    assert ev_data["severity"] == "HIGH"
    assert ev_data["screenshot_path"] is not None

    # Retrieve proctoring summary for attempt
    summary_resp = client.get(f"/api/proctoring/{attempt_id}", headers=headers)
    assert summary_resp.status_code == 200
    summary = summary_resp.json()
    assert summary["total_violations"] >= 1
    assert "TAB_SWITCH" in summary["violations_by_type"]

def test_opencv_frame_verification(client):
    token = get_fresh_student_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    dummy_img = make_dummy_base64_image()
    resp = client.post(
        "/api/proctoring/verify-frame",
        headers=headers,
        json={"image_base64": dummy_img}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "face_count" in data
    assert "status" in data
