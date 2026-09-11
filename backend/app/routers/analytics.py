from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Dict, Any, List

from app.database import get_db
from app.models.user import User
from app.models.exam import Exam
from app.models.attempt import ExamAttempt
from app.models.proctoring import ProctoringEvent
from app.utils.security import require_role

router = APIRouter(prefix="/analytics", tags=["Analytics & Reporting"])

@router.get("/dashboard")
def get_dashboard_metrics(
    current_user: User = Depends(require_role(["admin", "examiner"])),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Retrieve high-level KPIs and distribution metrics for executive admin dashboard."""
    total_students = db.query(User).filter(User.role == "student").count()
    total_exams = db.query(Exam).count()
    active_exams = db.query(Exam).filter(Exam.status == "active").count()
    
    attempts = db.query(ExamAttempt).all()
    total_attempts = len(attempts)
    completed_attempts = [a for a in attempts if a.status in ["submitted", "timed_out"]]
    
    avg_score = 0.0
    if completed_attempts:
        avg_score = round(sum(a.percentage for a in completed_attempts) / len(completed_attempts), 1)

    suspicious_attempts = [a for a in attempts if a.proctoring_score < 70.0 or a.violation_count >= 3]
    total_violations = db.query(ProctoringEvent).count()

    # Violation types breakdown
    violation_counts = (
        db.query(ProctoringEvent.event_type, func.count(ProctoringEvent.id))
        .group_by(ProctoringEvent.event_type)
        .all()
    )
    violation_types_data = {v[0]: v[1] for v in violation_counts}

    # Recent attempts
    recent_attempts_query = db.query(ExamAttempt).order_by(ExamAttempt.id.desc()).limit(8).all()
    recent_attempts = []
    for att in recent_attempts_query:
        exam = db.query(Exam).filter(Exam.id == att.exam_id).first()
        student = db.query(User).filter(User.id == att.student_id).first()
        if exam and student:
            recent_attempts.append({
                "id": att.id,
                "student_name": student.name,
                "student_email": student.email,
                "student_code": student.student_id,
                "exam_title": exam.title,
                "status": att.status,
                "score": att.score,
                "total_possible_marks": att.total_possible_marks,
                "percentage": att.percentage,
                "proctoring_score": att.proctoring_score,
                "violation_count": att.violation_count,
                "start_time": att.start_time,
                "submitted_at": att.submitted_at
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
