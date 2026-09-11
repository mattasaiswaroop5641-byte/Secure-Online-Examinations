from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional, Union
from datetime import datetime

class UserBase(BaseModel):
    name: str
    email: EmailStr
    student_id: Optional[str] = None
    role: Optional[str] = "student"

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str
    otp_code: Optional[str] = None

class UserResponse(UserBase):
    id: int
    avatar_url: Optional[str] = None
    is_active: bool
    is_2fa_enabled: bool = False
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class TwoFactorChallenge(BaseModel):
    requires_2fa: bool = True
    email: str
    message: str = "Two-Factor Authentication code required."

class TwoFactorSetupResponse(BaseModel):
    secret: str
    qr_code: str  # Base64 data URI
    otpauth_url: str

class TwoFactorVerifyRequest(BaseModel):
    code: str

class TwoFactorStatusResponse(BaseModel):
    is_2fa_enabled: bool

class TokenPayload(BaseModel):
    sub: Optional[str] = None
    role: Optional[str] = None
