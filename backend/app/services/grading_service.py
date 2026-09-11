from datetime import datetime
from typing import Dict, Any, List
from sqlalchemy.orm import Session

from app.models.attempt import ExamAttempt, StudentAnswer
from app.models.exam import Exam
from app.models.question import Question, QuestionOption, ExamQuestion
from app.models.proctoring import ProctoringEvent

SEVERITY_DEDUCTIONS = {
    "CRITICAL": 15.0,
    "HIGH": 10.0,
    "MEDIUM": 4.0,
    "LOW": 1.5
}

def calculate_proctoring_score(events: List[ProctoringEvent]) -> Dict[str, Any]:
    """Calculates integrity trust score (0-100) and status from proctoring events."""
    base_score = 100.0
    deductions = 0.0
    
    for ev in events:
        deductions += SEVERITY_DEDUCTIONS.get(ev.severity, 3.0)
        
    final_score = max(0.0, min(100.0, round(base_score - deductions, 1)))
    
    if final_score >= 85.0:
        status = "Normal"
    elif final_score >= 65.0:
        status = "Warning"
    else:
        status = "Suspicious"
        
    return {
        "score": final_score,
        "status": status,
        "violations_count": len(events)
    }

def evaluate_attempt(attempt_id: int, db: Session) -> ExamAttempt:
    """
    Evaluates an exam attempt server-side:
    - Calculates marks for each answer taking into account negative marking
    - Updates marks_awarded and is_correct flags
    - Calculates overall score, percentage, and pass/fail
    - Recalculates proctoring trust score
    """
    attempt = db.query(ExamAttempt).filter(ExamAttempt.id == attempt_id).first()
    if not attempt:
        raise ValueError("Attempt not found")
        
    exam = db.query(Exam).filter(Exam.id == attempt.exam_id).first()
    if not exam:
        raise ValueError("Exam not found")

    # Fetch all questions linked to this exam
    exam_questions = (
        db.query(ExamQuestion)
        .filter(ExamQuestion.exam_id == exam.id)
        .order_by(ExamQuestion.order_index)
        .all()
    )
    question_ids = [eq.question_id for eq in exam_questions]
    questions = db.query(Question).filter(Question.id.in_(question_ids)).all() if question_ids else []
    question_map = {q.id: q for q in questions}

    # Fetch existing student answers
    student_answers = (
        db.query(StudentAnswer)
        .filter(StudentAnswer.attempt_id == attempt.id)
        .all()
    )
    answer_map = {a.question_id: a for a in student_answers}

    total_score = 0.0
    total_possible = 0.0

    for q in questions:
        q_marks = q.marks or 1.0
        total_possible += q_marks

        # Correct option for question
        correct_option = (
            db.query(QuestionOption)
            .filter(QuestionOption.question_id == q.id, QuestionOption.is_correct == True)
            .first()
        )
        correct_option_id = correct_option.id if correct_option else None

        ans = answer_map.get(q.id)
        if ans and ans.selected_option_id is not None:
            if correct_option_id and ans.selected_option_id == correct_option_id:
                ans.is_correct = True
                ans.marks_awarded = q_marks
                total_score += q_marks
            else:
                ans.is_correct = False
                # Apply negative marking if configured
                penalty = 0.0
                if exam.negative_marking:
                    penalty = q.negative_marks if q.negative_marks > 0 else exam.negative_mark_value
                ans.marks_awarded = -abs(penalty)
                total_score -= abs(penalty)
        elif ans:
            ans.is_correct = False
            ans.marks_awarded = 0.0

    # Ensure score doesn't go below 0
    total_score = max(0.0, round(total_score, 2))
    total_possible = max(1.0, round(total_possible, 2))
    percentage = round((total_score / total_possible) * 100.0, 2)
    is_passed = total_score >= exam.passing_marks

    # Update attempt record
    attempt.score = total_score
    attempt.total_possible_marks = total_possible
    attempt.percentage = percentage
    attempt.is_passed = is_passed

    # Evaluate proctoring score
    events = (
        db.query(ProctoringEvent)
        .filter(ProctoringEvent.attempt_id == attempt.id)
        .all()
    )
    proc_summary = calculate_proctoring_score(events)
    attempt.proctoring_score = proc_summary["score"]
    attempt.violation_count = proc_summary["violations_count"]

    if attempt.status == "in_progress":
        attempt.status = "submitted"
    if not attempt.submitted_at:
        attempt.submitted_at = datetime.utcnow()

    # Time spent
    if attempt.start_time:
        delta = (attempt.submitted_at - attempt.start_time).total_seconds()
        attempt.time_spent_seconds = int(max(0, delta))

    db.commit()
    db.refresh(attempt)
    return attempt
