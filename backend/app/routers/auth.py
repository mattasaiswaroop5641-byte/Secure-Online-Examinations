from datetime import datetime
import io
import base64
import pyotp
import qrcode
from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List, Union

from app.mongodb import get_database, get_next_sequence
from app.schemas.auth import (
    UserCreate, UserLogin, UserResponse, Token,
    TwoFactorSetupResponse, TwoFactorVerifyRequest, TwoFactorStatusResponse
)
from app.utils.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    get_current_user,
    require_role
)

router = APIRouter(prefix="/auth", tags=["Authentication"])

def generate_totp_qr_base64(secret: str, email: str) -> str:
    """Generates a Base64 PNG QR code data URL for Google Authenticator."""
    totp = pyotp.TOTP(secret)
    provisioning_uri = totp.provisioning_uri(name=email, issuer_name="ExamShield")
    qr = qrcode.QRCode(box_size=6, border=2)
    qr.add_data(provisioning_uri)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buffered = io.BytesIO()
    img.save(buffered, format="PNG")
    img_b64 = base64.b64encode(buffered.getvalue()).decode("utf-8")
    return f"data:image/png;base64,{img_b64}"

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register_user(
    user_in: UserCreate,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Register a new student, examiner, or admin account."""
    existing_user = await db["users"].find_one({"email": user_in.email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists."
        )

    if user_in.student_id:
        existing_student = await db["users"].find_one({"student_id": user_in.student_id})
        if existing_student:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A user with this Student ID already exists."
            )

    role = user_in.role if user_in.role in ["student", "examiner", "admin"] else "student"
    new_id = await get_next_sequence("user_id", db)
    now = datetime.utcnow()

    new_user_doc = {
        "id": new_id,
        "name": user_in.name,
        "email": user_in.email,
        "student_id": user_in.student_id,
        "hashed_password": get_password_hash(user_in.password),
        "role": role,
        "avatar_url": None,
        "is_active": True,
        "is_2fa_enabled": False,
        "two_factor_secret": None,
        "created_at": now
    }
    await db["users"].insert_one(new_user_doc)
    return UserResponse(**new_user_doc)

@router.post("/login")
async def login(
    login_data: UserLogin,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Authenticate user. If 2FA is active (e.g. for Admin), requires valid 6-digit Google Authenticator code.
    """
    user_doc = await db["users"].find_one({"email": login_data.email})
    if not user_doc or not verify_password(login_data.password, user_doc.get("hashed_password", "")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password."
        )
    if not user_doc.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User account is deactivated."
        )

    is_2fa = user_doc.get("is_2fa_enabled", False)
    two_factor_secret = user_doc.get("two_factor_secret")

    # If 2FA is enabled on this account
    if is_2fa and two_factor_secret:
        if not login_data.otp_code:
            # Trigger 2FA step on frontend
            return {
                "requires_2fa": True,
                "email": user_doc["email"],
                "role": user_doc.get("role", "student"),
                "message": "Two-Factor Authentication code required."
            }
        
        # Verify the provided 6-digit OTP
        totp = pyotp.TOTP(two_factor_secret)
        if not totp.verify(login_data.otp_code.strip(), valid_window=1):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired Google Authenticator 2FA code."
            )

    user_resp = UserResponse(
        id=user_doc["id"],
        name=user_doc["name"],
        email=user_doc["email"],
        student_id=user_doc.get("student_id"),
        role=user_doc.get("role", "student"),
        avatar_url=user_doc.get("avatar_url"),
        is_active=user_doc.get("is_active", True),
        is_2fa_enabled=user_doc.get("is_2fa_enabled", False),
        created_at=user_doc.get("created_at", datetime.utcnow())
    )

    access_token = create_access_token(data={"sub": str(user_doc["id"]), "role": user_doc.get("role", "student")})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user_resp
    }

@router.get("/me", response_model=UserResponse)
async def get_me(
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get the currently logged in user profile with 2FA status."""
    user_doc = await db["users"].find_one({"id": current_user.id})
    return UserResponse(
        id=user_doc["id"],
        name=user_doc["name"],
        email=user_doc["email"],
        student_id=user_doc.get("student_id"),
        role=user_doc.get("role", "student"),
        avatar_url=user_doc.get("avatar_url"),
        is_active=user_doc.get("is_active", True),
        is_2fa_enabled=user_doc.get("is_2fa_enabled", False),
        created_at=user_doc.get("created_at", datetime.utcnow())
    )

@router.post("/2fa/setup", response_model=TwoFactorSetupResponse)
async def setup_two_factor(
    current_user: UserResponse = Depends(require_role(["admin", "examiner"])),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Generates a new Base32 TOTP secret and a scannable QR code for Google Authenticator.
    """
    secret = pyotp.random_base32()
    totp = pyotp.TOTP(secret)
    otpauth_url = totp.provisioning_uri(name=current_user.email, issuer_name="ExamShield")
    qr_code_b64 = generate_totp_qr_base64(secret, current_user.email)

    # Store pending secret temporarily
    await db["users"].update_one(
        {"id": current_user.id},
        {"$set": {"temp_two_factor_secret": secret}}
    )

    return TwoFactorSetupResponse(
        secret=secret,
        qr_code=qr_code_b64,
        otpauth_url=otpauth_url
    )

@router.post("/2fa/enable")
async def enable_two_factor(
    payload: TwoFactorVerifyRequest,
    current_user: UserResponse = Depends(require_role(["admin", "examiner"])),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Verifies the 6-digit code from Google Authenticator and permanently enables 2FA.
    """
    user_doc = await db["users"].find_one({"id": current_user.id})
    secret = user_doc.get("temp_two_factor_secret") or user_doc.get("two_factor_secret")
    if not secret:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No 2FA setup in progress. Please request a new setup QR code."
        )

    totp = pyotp.TOTP(secret)
    if not totp.verify(payload.code.strip(), valid_window=1):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid 6-digit authentication code. Please check your Google Authenticator app and try again."
        )

    await db["users"].update_one(
        {"id": current_user.id},
        {"$set": {
            "is_2fa_enabled": True,
            "two_factor_secret": secret,
            "temp_two_factor_secret": None
        }}
    )

    return {"status": "success", "message": "Google Authenticator 2FA enabled successfully!"}

@router.post("/2fa/disable")
async def disable_two_factor(
    payload: TwoFactorVerifyRequest,
    current_user: UserResponse = Depends(require_role(["admin", "examiner"])),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Disables 2FA after verifying the current 6-digit code.
    """
    user_doc = await db["users"].find_one({"id": current_user.id})
    secret = user_doc.get("two_factor_secret")
    if not secret or not user_doc.get("is_2fa_enabled"):
        return {"status": "success", "message": "2FA is already disabled."}

    totp = pyotp.TOTP(secret)
    if not totp.verify(payload.code.strip(), valid_window=1):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid 6-digit authentication code. Verification failed."
        )

    await db["users"].update_one(
        {"id": current_user.id},
        {"$set": {
            "is_2fa_enabled": False,
            "two_factor_secret": None,
            "temp_two_factor_secret": None
        }}
    )

    return {"status": "success", "message": "2FA has been disabled successfully."}

@router.get("/2fa/status", response_model=TwoFactorStatusResponse)
async def get_two_factor_status(
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Returns whether 2FA is active for the current user."""
    user_doc = await db["users"].find_one({"id": current_user.id})
    return TwoFactorStatusResponse(
        is_2fa_enabled=user_doc.get("is_2fa_enabled", False) if user_doc else False
    )

@router.get("/students", response_model=List[UserResponse])
async def get_students(
    current_user: UserResponse = Depends(require_role(["admin", "examiner"])),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Admin / Examiner list all registered students from MongoDB."""
    cursor = db["users"].find({"role": "student"}).sort("name", 1)
    students = []
    async for doc in cursor:
        students.append(UserResponse(
            id=doc["id"],
            name=doc["name"],
            email=doc["email"],
            student_id=doc.get("student_id"),
            role=doc.get("role", "student"),
            avatar_url=doc.get("avatar_url"),
            is_active=doc.get("is_active", True),
            is_2fa_enabled=doc.get("is_2fa_enabled", False),
            created_at=doc.get("created_at", datetime.utcnow())
        ))
    return students
