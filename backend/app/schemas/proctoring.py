from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime

class ProctoringEventCreate(BaseModel):
    attempt_id: int
    event_type: str  # NO_FACE_DETECTED, MULTIPLE_FACES_DETECTED, FACE_OUT_OF_FRAME, LOOKING_AWAY, TAB_SWITCH, FULLSCREEN_EXIT, CAMERA_DISCONNECTED
    severity: str = "MEDIUM"  # LOW, MEDIUM, HIGH, CRITICAL
    duration_seconds: Optional[float] = 0.0
    description: Optional[str] = None
    screenshot_base64: Optional[str] = None  # Base64 data if evidence snapshot is captured
    timestamp: Optional[datetime] = None

class ProctoringEventResponse(BaseModel):
    id: int
    attempt_id: int
    student_id: int
    student_name: Optional[str] = None
    event_type: str
    severity: str
    timestamp: datetime
    duration_seconds: float
    description: Optional[str] = None
    screenshot_path: Optional[str] = None
    resolved: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ProctoringSummaryResponse(BaseModel):
    attempt_id: int
    student_id: int
    student_name: str
    exam_title: str
    proctoring_score: float
    proctoring_status: str  # Normal, Warning, Suspicious
    total_violations: int
    violations_by_type: Dict[str, int]
    violations_by_severity: Dict[str, int]
    events: List[ProctoringEventResponse]

class FrameVerificationRequest(BaseModel):
    image_base64: str

class FrameVerificationResponse(BaseModel):
    face_count: int
    status: str  # OK, NO_FACE, MULTIPLE_FACES, LOOKING_AWAY, OUT_OF_FRAME, ERROR
    confidence: float
    message: str
    is_centered: Optional[bool] = True
    looking_direction: Optional[str] = "CENTER"
    bounding_boxes: Optional[List[Dict[str, int]]] = None
