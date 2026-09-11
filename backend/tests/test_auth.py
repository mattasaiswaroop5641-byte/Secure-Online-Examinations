import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

def test_login_admin():
    response = client.post(
        "/api/auth/login",
        json={"email": "admin@example.com", "password": "Admin@123"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["role"] == "admin"

def test_login_student():
    response = client.post(
        "/api/auth/login",
        json={"email": "student@example.com", "password": "Student@123"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["role"] == "student"

def test_invalid_login():
    response = client.post(
        "/api/auth/login",
        json={"email": "student@example.com", "password": "WrongPassword!"}
    )
    assert response.status_code == 401

import uuid

def test_register_new_student():
    uid = uuid.uuid4().hex[:6]
    email = f"newstudent_{uid}@example.com"
    response = client.post(
        "/api/auth/register",
        json={
            "name": "Jane Tester",
            "email": email,
            "student_id": f"TEST-REG-{uid}",
            "password": "Password123!",
            "role": "student"
        }
    )
    assert response.status_code == 201
    assert response.json()["email"] == email

    # Login with new account
    login_resp = client.post(
        "/api/auth/login",
        json={"email": email, "password": "Password123!"}
    )
    assert login_resp.status_code == 200
