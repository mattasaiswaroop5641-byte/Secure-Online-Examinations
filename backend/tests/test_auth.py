import pytest
import uuid
import pyotp

def test_health_check(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

def test_login_admin(client):
    response = client.post(
        "/api/auth/login",
        json={"email": "mattasaiswaroop5641@gmail.com", "password": "Mgsai@1025"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["role"] == "admin"


def test_login_student(client):
    response = client.post(
        "/api/auth/login",
        json={"email": "student@example.com", "password": "Student@123"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["role"] == "student"

def test_invalid_login(client):
    response = client.post(
        "/api/auth/login",
        json={"email": "student@example.com", "password": "WrongPassword!"}
    )
    assert response.status_code == 401

def test_register_new_student(client):
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

def test_google_authenticator_2fa_flow(client):
    admin_email = "mattasaiswaroop5641@gmail.com"
    admin_pass = "Mgsai@1025"

    # 1. Login as Admin
    login_res = client.post(
        "/api/auth/login",
        json={"email": admin_email, "password": admin_pass}
    )
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Setup 2FA
    setup_res = client.post("/api/auth/2fa/setup", headers=headers)
    assert setup_res.status_code == 200
    setup_data = setup_res.json()
    assert "secret" in setup_data
    assert "qr_code" in setup_data
    assert setup_data["qr_code"].startswith("data:image/png;base64,")
    secret = setup_data["secret"]

    # 3. Generate valid TOTP code
    totp = pyotp.TOTP(secret)
    valid_code = totp.now()

    # 4. Enable 2FA
    enable_res = client.post("/api/auth/2fa/enable", headers=headers, json={"code": valid_code})
    assert enable_res.status_code == 200
    assert enable_res.json()["status"] == "success"

    # 5. Check 2FA status
    status_res = client.get("/api/auth/2fa/status", headers=headers)
    assert status_res.status_code == 200
    assert status_res.json()["is_2fa_enabled"] is True

    # 6. Attempt login without OTP code -> Should trigger 2FA challenge
    chal_res = client.post("/api/auth/login", json={"email": admin_email, "password": admin_pass})
    assert chal_res.status_code == 200
    assert chal_res.json().get("requires_2fa") is True

    # 7. Attempt login with wrong OTP code -> Should return 401
    wrong_otp_res = client.post(
        "/api/auth/login",
        json={"email": admin_email, "password": admin_pass, "otp_code": "000000"}
    )
    assert wrong_otp_res.status_code == 401

    # 8. Attempt login with correct OTP code -> Should succeed with access token
    correct_otp = totp.now()
    succ_res = client.post(
        "/api/auth/login",
        json={"email": admin_email, "password": admin_pass, "otp_code": correct_otp}
    )
    assert succ_res.status_code == 200
    assert "access_token" in succ_res.json()

    # 9. Disable 2FA
    disable_res = client.post("/api/auth/2fa/disable", headers=headers, json={"code": totp.now()})
    assert disable_res.status_code == 200

