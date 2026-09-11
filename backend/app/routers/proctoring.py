from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List, Dict

from app.mongodb import get_database, get_next_sequence
from app.schemas.auth import UserResponse
from app.schemas.proctoring import (
    ProctoringEventCreate, ProctoringEventResponse, ProctoringSummaryResponse,
    FrameVerificationRequest, FrameVerificationResponse
)
from app.services.cv_verifier import verify_frame_base64, save_evidence_snapshot
from app.services.grading_service import calculate_proctoring_score
from app.utils.security import get_current_user, require_role

router = APIRouter(prefix="/proctoring", tags=["Continuous Proctoring"])

@router.post("/events", response_model=ProctoringEventResponse, status_code=status.HTTP_201_CREATED)
async def log_proctoring_event(
    payload: ProctoringEventCreate,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Ingests continuous proctoring violation events in real time.
    Optionally saves screenshot evidence frames annotated with computer vision bounding boxes.
    """
    attempt = await db["attempts"].find_one({"id": payload.attempt_id})
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")

    if attempt["student_id"] != current_user.id and current_user.role not in ["admin"]:
        raise HTTPException(status_code=403, detail="Forbidden")

    now = datetime.now(timezone.utc)
    event_time = payload.timestamp or now
    if hasattr(event_time, "tzinfo") and event_time.tzinfo is None:
        event_time = event_time.replace(tzinfo=timezone.utc)

    screenshot_path = None
    if payload.screenshot_base64:
        screenshot_path = save_evidence_snapshot(
            image_base64=payload.screenshot_base64,
            attempt_id=attempt["id"],
            event_type=payload.event_type,
            severity=payload.severity,
            event_time=event_time
        )

    new_event_id = await get_next_sequence("proctoring_event_id", db)

    event_doc = {
        "id": new_event_id,
        "attempt_id": attempt["id"],
        "student_id": attempt["student_id"],
        "event_type": payload.event_type,
        "severity": payload.severity.upper(),
        "timestamp": event_time,
        "duration_seconds": payload.duration_seconds or 0.0,
        "description": payload.description or f"Suspicious event detected: {payload.event_type}",
        "screenshot_path": screenshot_path,
        "resolved": False,
        "created_at": now
    }
    await db["proctoring_incidents"].insert_one(event_doc)


    # Recalculate attempt integrity score
    cursor = db["proctoring_incidents"].find({"attempt_id": attempt["id"]})
    all_events = []
    async for ev in cursor:
        all_events.append(ev)
        
    proc_info = calculate_proctoring_score(all_events)
    await db["attempts"].update_one(
        {"id": attempt["id"]},
        {"$set": {
            "proctoring_score": proc_info["score"],
            "violation_count": proc_info["violations_count"]
        }}
    )

    student = await db["users"].find_one({"id": attempt["student_id"]})

    return ProctoringEventResponse(
        id=event_doc["id"],
        attempt_id=event_doc["attempt_id"],
        student_id=event_doc["student_id"],
        student_name=student.get("name") if student else None,
        event_type=event_doc["event_type"],
        severity=event_doc["severity"],
        timestamp=event_doc["timestamp"],
        duration_seconds=event_doc["duration_seconds"],
        description=event_doc["description"],
        screenshot_path=event_doc["screenshot_path"],
        resolved=event_doc["resolved"],
        created_at=event_doc["created_at"]
    )

@router.get("/{attempt_id}", response_model=ProctoringSummaryResponse)
async def get_proctoring_summary(
    attempt_id: int,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Retrieve proctoring audit log, event timeline, and forensic stats for an attempt."""
    attempt = await db["attempts"].find_one({"id": attempt_id})
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")

    if current_user.role == "student" and attempt["student_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden")

    exam = await db["exams"].find_one({"id": attempt["exam_id"]})
    student = await db["users"].find_one({"id": attempt["student_id"]})

    cursor = db["proctoring_incidents"].find({"attempt_id": attempt_id}).sort("timestamp", 1)
    events = []
    by_type: Dict[str, int] = {}
    by_sev: Dict[str, int] = {}
    event_responses = []

    async for ev in cursor:
        events.append(ev)
        by_type[ev["event_type"]] = by_type.get(ev["event_type"], 0) + 1
        by_sev[ev["severity"]] = by_sev.get(ev["severity"], 0) + 1
        event_responses.append(
            ProctoringEventResponse(
                id=ev["id"],
                attempt_id=ev["attempt_id"],
                student_id=ev["student_id"],
                student_name=student.get("name") if student else None,
                event_type=ev["event_type"],
                severity=ev["severity"],
                timestamp=ev["timestamp"],
                duration_seconds=float(ev.get("duration_seconds", 0.0)),
                description=ev.get("description"),
                screenshot_path=ev.get("screenshot_path"),
                resolved=ev.get("resolved", False),
                created_at=ev.get("created_at", datetime.now(timezone.utc))
            )
        )

    score_info = calculate_proctoring_score(events)

    return ProctoringSummaryResponse(
        attempt_id=attempt["id"],
        student_id=student["id"] if student else 0,
        student_name=student.get("name", "Unknown") if student else "Unknown",
        exam_title=exam.get("title", "Unknown") if exam else "Unknown",
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
    current_user: UserResponse = Depends(get_current_user)
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
        is_centered=result.get("is_centered", True),
        looking_direction=result.get("looking_direction", "CENTER"),
        bounding_boxes=result.get("bounding_boxes", [])
    )

@router.put("/events/{event_id}/resolve")
async def resolve_proctoring_event(
    event_id: int,
    current_user: UserResponse = Depends(require_role(["admin", "examiner"])),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Admin / Examiner mark an incident as reviewed/resolved."""
    res = await db["proctoring_incidents"].update_one({"id": event_id}, {"$set": {"resolved": True}})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Event not found")
    return {"status": "resolved", "event_id": event_id}

@router.delete("/events/{event_id}")
async def delete_proctoring_event(
    event_id: int,
    current_user: UserResponse = Depends(require_role(["admin", "examiner"])),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Admin / Examiner delete an individual proctoring incident."""
    event = await db["proctoring_incidents"].find_one({"id": event_id})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    attempt_id = event.get("attempt_id")
    await db["proctoring_incidents"].delete_one({"id": event_id})

    # Recalculate attempt integrity score
    if attempt_id:
        cursor = db["proctoring_incidents"].find({"attempt_id": attempt_id})
        all_events = []
        async for ev in cursor:
            all_events.append(ev)
        
        proc_info = calculate_proctoring_score(all_events)
        await db["attempts"].update_one(
            {"id": attempt_id},
            {"$set": {
                "proctoring_score": proc_info["score"],
                "violation_count": proc_info["violations_count"]
            }}
        )

    return {"status": "deleted", "event_id": event_id}

@router.delete("/events")
async def clear_proctoring_events(
    attempt_id: int = None,
    current_user: UserResponse = Depends(require_role(["admin", "examiner"])),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Admin / Examiner delete all incidents or incidents for a specific attempt."""
    query = {}
    if attempt_id is not None:
        query["attempt_id"] = attempt_id
        affected_attempt_ids = [attempt_id]
    else:
        affected_attempt_ids = await db["proctoring_incidents"].distinct("attempt_id")

    res = await db["proctoring_incidents"].delete_many(query)

    # Recalculate attempt integrity score for affected attempts
    for att_id in affected_attempt_ids:
        cursor = db["proctoring_incidents"].find({"attempt_id": att_id})
        all_events = []
        async for ev in cursor:
            all_events.append(ev)
        
        proc_info = calculate_proctoring_score(all_events)
        await db["attempts"].update_one(
            {"id": att_id},
            {"$set": {
                "proctoring_score": proc_info["score"],
                "violation_count": proc_info["violations_count"]
            }}
        )

    return {"status": "cleared", "deleted_count": res.deleted_count}

