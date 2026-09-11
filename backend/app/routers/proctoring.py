from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict

from app.database import get_db
from app.models.user import User
from app.models.attempt import ExamAttempt
from app.models.exam import Exam
from app.models.proctoring import ProctoringEvent
from app.schemas.proctoring import (
    ProctoringEventCreate, ProctoringEventResponse, ProctoringSummaryResponse,
    FrameVerificationRequest, FrameVerificationResponse
)
from app.services.cv_verifier import verify_frame_base64, save_evidence_snapshot
from app.services.grading_service import calculate_proctoring_score
from app.utils.security import get_current_user, require_role

router = APIRouter(prefix="/proctoring", tags=["Continuous Proctoring"])

@router.post("/events", response_model=ProctoringEventResponse, status_code=status.HTTP_201_CREATED)
def log_proctoring_event(
    payload: ProctoringEventCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Ingests continuous proctoring violation events in real time.
    Optionally saves screenshot evidence frames annotated with computer vision bounding boxes.
    """
    attempt = db.query(ExamAttempt).filter(ExamAttempt.id == payload.attempt_id).first()
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")

    if attempt.student_id != current_user.id and current_user.role not in ["admin"]:
        raise HTTPException(status_code=403, detail="Forbidden")

    screenshot_path = None
    if payload.screenshot_base64:
        screenshot_path = save_evidence_snapshot(
            image_base64=payload.screenshot_base64,
            attempt_id=attempt.id,
            event_type=payload.event_type,
            severity=payload.severity
        )

    event = ProctoringEvent(
        attempt_id=attempt.id,
        student_id=attempt.student_id,
        event_type=payload.event_type,
        severity=payload.severity.upper(),
        timestamp=payload.timestamp or datetime.utcnow(),
        duration_seconds=payload.duration_seconds or 0.0,
        description=payload.description or f"Suspicious event detected: {payload.event_type}",
        screenshot_path=screenshot_path,
        resolved=False
    )
    db.add(event)
    db.commit()
    db.refresh(event)

    # Recalculate attempt integrity score
    all_events = db.query(ProctoringEvent).filter(ProctoringEvent.attempt_id == attempt.id).all()
    proc_info = calculate_proctoring_score(all_events)
    attempt.proctoring_score = proc_info["score"]
    attempt.violation_count = proc_info["violations_count"]
    db.commit()

    student = db.query(User).filter(User.id == attempt.student_id).first()

    return ProctoringEventResponse(
        id=event.id,
        attempt_id=event.attempt_id,
        student_id=event.student_id,
        student_name=student.name if student else None,
        event_type=event.event_type,
        severity=event.severity,
        timestamp=event.timestamp,
        duration_seconds=event.duration_seconds,
        description=event.description,
        screenshot_path=event.screenshot_path,
        resolved=event.resolved,
        created_at=event.created_at
    )

@router.get("/{attempt_id}", response_model=ProctoringSummaryResponse)
def get_proctoring_summary(
    attempt_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve proctoring audit log, event timeline, and forensic stats for an attempt."""
    attempt = db.query(ExamAttempt).filter(ExamAttempt.id == attempt_id).first()
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")

    if current_user.role == "student" and attempt.student_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden")

    exam = db.query(Exam).filter(Exam.id == attempt.exam_id).first()
    student = db.query(User).filter(User.id == attempt.student_id).first()
    events = db.query(ProctoringEvent).filter(ProctoringEvent.attempt_id == attempt_id).order_by(ProctoringEvent.timestamp.asc()).all()

    by_type: Dict[str, int] = {}
    by_sev: Dict[str, int] = {}
    event_responses = []

    for ev in events:
        by_type[ev.event_type] = by_type.get(ev.event_type, 0) + 1
        by_sev[ev.severity] = by_sev.get(ev.severity, 0) + 1
        event_responses.append(
            ProctoringEventResponse(
                id=ev.id,
                attempt_id=ev.attempt_id,
                student_id=ev.student_id,
                student_name=student.name if student else None,
                event_type=ev.event_type,
                severity=ev.severity,
                timestamp=ev.timestamp,
                duration_seconds=ev.duration_seconds,
                description=ev.description,
                screenshot_path=ev.screenshot_path,
                resolved=ev.resolved,
                created_at=ev.created_at
            )
        )

    score_info = calculate_proctoring_score(events)

    return ProctoringSummaryResponse(
        attempt_id=attempt.id,
        student_id=student.id if student else 0,
        student_name=student.name if student else "Unknown",
        exam_title=exam.title if exam else "Unknown",
        proctoring_score=score_info["score"],
        proctoring_status=score_info["status"],
        total_violations=len(events),
        violations_by_type=by_type,
        violations_by_severity=by_sev,
        events=event_responses
    )

@router.post("/verify-frame", response_model=FrameVerificationResponse)
def verify_frame(
    payload: FrameVerificationRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Direct server-side OpenCV computer vision verification endpoint.
    Processes uploaded webcam frame and returns detected faces, bounding boxes, and status.
    """
    result = verify_frame_base64(payload.image_base64)
    return FrameVerificationResponse(
        face_count=result["face_count"],
        status=result["status"],
        confidence=result["confidence"],
        message=result["message"],
        bounding_boxes=result["bounding_boxes"]
    )

@router.put("/events/{event_id}/resolve")
def resolve_proctoring_event(
    event_id: int,
    current_user: User = Depends(require_role(["admin", "examiner"])),
    db: Session = Depends(get_db)
):
    """Admin / Examiner mark an incident as reviewed/resolved."""
    event = db.query(ProctoringEvent).filter(ProctoringEvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    event.resolved = True
    db.commit()
    return {"status": "resolved", "event_id": event_id}
