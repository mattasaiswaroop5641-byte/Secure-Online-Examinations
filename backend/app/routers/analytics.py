from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Dict, Any, List

from app.mongodb import get_database
from app.schemas.auth import UserResponse
from app.utils.security import require_role

router = APIRouter(prefix="/analytics", tags=["Analytics & Reporting"])

@router.get("/dashboard")
async def get_dashboard_metrics(
    current_user: UserResponse = Depends(require_role(["admin", "examiner"])),
    db: AsyncIOMotorDatabase = Depends(get_database)
) -> Dict[str, Any]:
    """Retrieve high-level KPIs and distribution metrics for executive admin dashboard from MongoDB."""
    total_students = await db["users"].count_documents({"role": "student"})
    total_exams = await db["exams"].count_documents({})
    active_exams = await db["exams"].count_documents({"status": "active"})
    
    attempts_cursor = db["attempts"].find({})
    attempts = []
    async for a in attempts_cursor:
        attempts.append(a)

    total_attempts = len(attempts)
    completed_attempts = [a for a in attempts if a.get("status") in ["submitted", "timed_out"]]
    
    avg_score = 0.0
    if completed_attempts:
        avg_score = round(sum(float(a.get("percentage", 0.0)) for a in completed_attempts) / len(completed_attempts), 1)

    suspicious_attempts = [a for a in attempts if float(a.get("proctoring_score", 100.0)) < 70.0 or int(a.get("violation_count", 0)) >= 3]
    total_violations = await db["proctoring_incidents"].count_documents({})

    # Violation types breakdown using MongoDB aggregation
    pipeline = [
        {"$group": {"_id": "$event_type", "count": {"$sum": 1}}}
    ]
    violation_counts = await db["proctoring_incidents"].aggregate(pipeline).to_list(length=100)
    violation_types_data = {v["_id"]: v["count"] for v in violation_counts if v.get("_id")}

    # Recent attempts
    recent_attempts_cursor = db["attempts"].find({}).sort("id", -1).limit(8)
    recent_attempts = []
    async for att in recent_attempts_cursor:
        exam = await db["exams"].find_one({"id": att["exam_id"]})
        student = await db["users"].find_one({"id": att["student_id"]})
        if exam and student:
            recent_attempts.append({
                "id": att["id"],
                "student_name": student.get("name", "Student"),
                "student_email": student.get("email", ""),
                "student_code": student.get("student_id"),
                "exam_title": exam.get("title", "Exam"),
                "status": att.get("status", "submitted"),
                "score": float(att.get("score", 0.0)),
                "total_possible_marks": float(att.get("total_possible_marks", 100.0)),
                "percentage": float(att.get("percentage", 0.0)),
                "proctoring_score": float(att.get("proctoring_score", 100.0)),
                "violation_count": int(att.get("violation_count", 0)),
                "start_time": att.get("start_time"),
                "submitted_at": att.get("submitted_at")
            })

    return {
        "kpis": {
            "total_students": total_students,
            "total_exams": total_exams,
            "active_exams": active_exams,
            "total_attempts": total_attempts,
            "completed_attempts": len(completed_attempts),
            "average_score": avg_score,
            "suspicious_attempts": len(suspicious_attempts),
            "total_violations": total_violations
        },
        "violation_breakdown": violation_types_data,
        "recent_attempts": recent_attempts
    }
