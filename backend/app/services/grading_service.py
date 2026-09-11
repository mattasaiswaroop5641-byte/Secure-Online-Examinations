from datetime import datetime
from typing import Dict, Any, List
from motor.motor_asyncio import AsyncIOMotorDatabase

SEVERITY_DEDUCTIONS = {
    "CRITICAL": 15.0,
    "HIGH": 10.0,
    "MEDIUM": 4.0,
    "LOW": 1.5
}

def calculate_proctoring_score(events: List[dict]) -> Dict[str, Any]:
    """Calculates integrity trust score (0-100) and status from proctoring events."""
    base_score = 100.0
    deductions = 0.0
    
    for ev in events:
        deductions += SEVERITY_DEDUCTIONS.get(ev.get("severity", "MEDIUM"), 3.0)
        
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

async def evaluate_attempt(attempt_id: int, db: AsyncIOMotorDatabase) -> dict:
    """
    Evaluates an exam attempt server-side in MongoDB:
    - Calculates marks for each answer taking into account negative marking
    - Updates marks_awarded and is_correct flags
    - Calculates overall score, percentage, and pass/fail
    - Recalculates proctoring trust score
    """
    attempt = await db["attempts"].find_one({"id": attempt_id})
    if not attempt:
        raise ValueError("Attempt not found")
        
    exam = await db["exams"].find_one({"id": attempt["exam_id"]})
    if not exam:
        raise ValueError("Exam not found")

    question_ids = exam.get("question_ids", [])
    cursor = db["questions"].find({"id": {"$in": question_ids}})
    questions = []
    async for q in cursor:
        questions.append(q)
    
    q_map = {q["id"]: q for q in questions}

    # Fetch student answers stored in attempt document
    answers_list = attempt.get("answers", [])
    answer_map = {a["question_id"]: a for a in answers_list}

    total_score = 0.0
    total_possible = 0.0
    updated_answers = []

    for qid in question_ids:
        q = q_map.get(qid)
        if not q:
            continue

        q_marks = float(q.get("marks", 1.0))
        total_possible += q_marks

        # Find correct option id
        correct_option_id = None
        for opt in q.get("options", []):
            if opt.get("is_correct", False):
                correct_option_id = opt.get("id")
                break

        ans = answer_map.get(qid)
        if ans and ans.get("selected_option_id") is not None:
            sel_opt = ans.get("selected_option_id")
            if correct_option_id and sel_opt == correct_option_id:
                ans["is_correct"] = True
                ans["marks_awarded"] = q_marks
                total_score += q_marks
            else:
                ans["is_correct"] = False
                penalty = 0.0
                if exam.get("negative_marking", False):
                    q_neg = float(q.get("negative_marks", 0.0))
                    penalty = q_neg if q_neg > 0 else float(exam.get("negative_mark_value", 0.25))
                ans["marks_awarded"] = -abs(penalty)
                total_score -= abs(penalty)
            updated_answers.append(ans)
        elif ans:
            ans["is_correct"] = False
            ans["marks_awarded"] = 0.0
            updated_answers.append(ans)

    total_score = max(0.0, round(total_score, 2))
    total_possible = max(1.0, round(total_possible, 2))
    percentage = round((total_score / total_possible) * 100.0, 2)
    is_passed = total_score >= float(exam.get("passing_marks", 40.0))

    # Fetch proctoring incidents
    proc_cursor = db["proctoring_incidents"].find({"attempt_id": attempt_id})
    events = []
    async for ev in proc_cursor:
        events.append(ev)
    
    proc_summary = calculate_proctoring_score(events)

    now = datetime.utcnow()
    submitted_at = attempt.get("submitted_at") or now
    start_time = attempt.get("start_time") or now
    time_spent = int(max(0, (submitted_at - start_time).total_seconds()))

    update_fields = {
        "answers": updated_answers,
        "score": total_score,
        "total_possible_marks": total_possible,
        "percentage": percentage,
        "is_passed": is_passed,
        "proctoring_score": proc_summary["score"],
        "violation_count": proc_summary["violations_count"],
        "status": "submitted" if attempt.get("status") == "in_progress" else attempt.get("status", "submitted"),
        "submitted_at": submitted_at,
        "time_spent_seconds": time_spent
    }

    await db["attempts"].update_one({"id": attempt_id}, {"$set": update_fields})
    updated_attempt = await db["attempts"].find_one({"id": attempt_id})
    return updated_attempt
