from datetime import datetime, timedelta
import random
from fastapi import APIRouter, Depends, HTTPException, status, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List, Optional, Dict

from app.mongodb import get_database, get_next_sequence
from app.schemas.auth import UserResponse
from app.schemas.attempt import (
    StartExamResponse, SaveAnswerRequest, TimeRemainingResponse,
    AttemptResultResponse, AttemptSummaryAdmin, QuestionAnalysisItem, AnswerState
)
from app.schemas.question import QuestionStudentResponse, OptionStudentResponse
from app.services.grading_service import evaluate_attempt, calculate_proctoring_score
from app.utils.security import get_current_user, require_role

router = APIRouter(prefix="/attempts", tags=["Attempts & Submissions"])

@router.post("/exams/{exam_id}/start", response_model=StartExamResponse)
async def start_exam_attempt(
    exam_id: int,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Starts or resumes an examination attempt in MongoDB.
    Returns student-safe question payloads (no correct answers / explanations),
    authoritative server-calculated deadline, and any previously saved answer state.
    """
    exam = await db["exams"].find_one({"id": exam_id})
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    if exam.get("status") != "active":
        raise HTTPException(status_code=400, detail=f"Exam is not currently active (status: {exam.get('status')})")

    # Check for existing attempt
    attempt = await db["attempts"].find_one(
        {"exam_id": exam["id"], "student_id": current_user.id},
        sort=[("id", -1)]
    )

    now = datetime.utcnow()
    duration_minutes = exam.get("duration_minutes", 60)

    if attempt:
        if attempt.get("status") in ["submitted", "timed_out"]:
            raise HTTPException(status_code=400, detail="You have already completed and submitted this examination.")
        
        # Check if deadline passed
        end_time = attempt.get("end_time")
        if end_time and now > end_time:
            await evaluate_attempt(attempt["id"], db)
            await db["attempts"].update_one({"id": attempt["id"]}, {"$set": {"status": "timed_out"}})
            raise HTTPException(status_code=400, detail="Examination time has expired.")
    else:
        # Create fresh attempt
        end_time = now + timedelta(minutes=duration_minutes)
        new_id = await get_next_sequence("attempt_id", db)
        attempt = {
            "id": new_id,
            "exam_id": exam["id"],
            "student_id": current_user.id,
            "start_time": now,
            "end_time": end_time,
            "submitted_at": None,
            "time_spent_seconds": 0,
            "status": "in_progress",
            "score": 0.0,
            "total_possible_marks": float(exam.get("total_marks", 100.0)),
            "percentage": 0.0,
            "is_passed": False,
            "proctoring_score": 100.0,
            "violation_count": 0,
            "answers": [],
            "created_at": now
        }
        await db["attempts"].insert_one(attempt)

    # Fetch questions
    q_ids = exam.get("question_ids", [])
    cursor = db["questions"].find({"id": {"$in": q_ids}})
    questions = []
    async for q in cursor:
        questions.append(q)
    
    q_map = {q["id"]: q for q in questions}
    ordered_questions = [q_map[qid] for qid in q_ids if qid in q_map]

    if exam.get("randomize_questions", False):
        rng = random.Random(attempt["id"])
        rng.shuffle(ordered_questions)

    student_questions = []
    for idx, q in enumerate(ordered_questions):
        raw_options = list(q.get("options", []))
        if exam.get("randomize_options", False):
            rng_opt = random.Random(attempt["id"] * 1000 + q["id"])
            rng_opt.shuffle(raw_options)

        opts = [
            OptionStudentResponse(
                id=opt.get("id", opt_idx + 1),
                option_text=opt.get("option_text", ""),
                order_index=opt_idx
            )
            for opt_idx, opt in enumerate(raw_options)
        ]

        student_questions.append(
            QuestionStudentResponse(
                id=q["id"],
                subject=q["subject"],
                text=q["text"],
                question_type=q.get("question_type", "mcq_single"),
                difficulty=q.get("difficulty", "medium"),
                marks=float(q.get("marks", 1.0)),
                negative_marks=float(q.get("negative_marks", 0.0)),
                order_index=idx + 1,
                options=opts
            )
        )

    # Existing answers
    saved_answers = attempt.get("answers", [])
    current_answers: Dict[int, AnswerState] = {
        ans["question_id"]: AnswerState(
            question_id=ans["question_id"],
            selected_option_id=ans.get("selected_option_id"),
            is_marked_for_review=ans.get("is_marked_for_review", False)
        )
        for ans in saved_answers
    }

    attempt_end = attempt.get("end_time") or (now + timedelta(minutes=duration_minutes))
    remaining_seconds = max(0, int((attempt_end - now).total_seconds()))

    return StartExamResponse(
        attempt_id=attempt["id"],
        exam_id=exam["id"],
        exam_title=exam["title"],
        duration_minutes=duration_minutes,
        start_time=attempt.get("start_time", now),
        end_time=attempt_end,
        remaining_seconds=remaining_seconds,
        total_questions=len(student_questions),
        questions=student_questions,
        current_answers=current_answers
    )

@router.get("/{id}/time-remaining", response_model=TimeRemainingResponse)
async def get_time_remaining(
    id: int,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Authoritative server countdown check and auto-timeout trigger."""
    attempt = await db["attempts"].find_one({"id": id})
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")

    if current_user.role == "student" and attempt["student_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden")

    if attempt.get("status") in ["submitted", "timed_out"]:
        return TimeRemainingResponse(
            attempt_id=attempt["id"],
            remaining_seconds=0,
            is_expired=True,
            status=attempt.get("status")
        )

    now = datetime.utcnow()
    end_time = attempt.get("end_time")
    remaining = int((end_time - now).total_seconds()) if end_time else 0
    if remaining <= 0:
        await evaluate_attempt(attempt["id"], db)
        await db["attempts"].update_one({"id": attempt["id"]}, {"$set": {"status": "timed_out"}})
        return TimeRemainingResponse(
            attempt_id=attempt["id"],
            remaining_seconds=0,
            is_expired=True,
            status="timed_out"
        )

    return TimeRemainingResponse(
        attempt_id=attempt["id"],
        remaining_seconds=remaining,
        is_expired=False,
        status=attempt.get("status", "in_progress")
    )

@router.post("/{id}/answer", status_code=status.HTTP_200_OK)
async def save_answer(
    id: int,
    payload: SaveAnswerRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Save or update candidate's answer for a question in real-time in MongoDB."""
    attempt = await db["attempts"].find_one({"id": id})
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")
    if attempt["student_id"] != current_user.id and current_user.role not in ["admin"]:
        raise HTTPException(status_code=403, detail="Forbidden")
    if attempt.get("status") != "in_progress":
        raise HTTPException(status_code=400, detail="Cannot edit answers for an inactive attempt")

    now = datetime.utcnow()
    end_time = attempt.get("end_time")
    if end_time and now > end_time:
        await evaluate_attempt(attempt["id"], db)
        await db["attempts"].update_one({"id": attempt["id"]}, {"$set": {"status": "timed_out"}})
        raise HTTPException(status_code=400, detail="Exam time expired")

    answers = attempt.get("answers", [])
    found = False
    for a in answers:
        if a.get("question_id") == payload.question_id:
            a["selected_option_id"] = payload.selected_option_id
            if payload.is_marked_for_review is not None:
                a["is_marked_for_review"] = payload.is_marked_for_review
            a["answered_at"] = now
            found = True
            break

    if not found:
        answers.append({
            "question_id": payload.question_id,
            "selected_option_id": payload.selected_option_id,
            "is_marked_for_review": payload.is_marked_for_review or False,
            "is_correct": False,
            "marks_awarded": 0.0,
            "answered_at": now
        })

    await db["attempts"].update_one({"id": id}, {"$set": {"answers": answers}})
    return {"status": "saved", "question_id": payload.question_id, "selected_option_id": payload.selected_option_id}

@router.post("/{id}/submit", response_model=AttemptResultResponse)
async def submit_exam(
    id: int,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Explicit student submission of exam, calculates marks and returns detailed result."""
    attempt = await db["attempts"].find_one({"id": id})
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")
    if attempt["student_id"] != current_user.id and current_user.role not in ["admin"]:
        raise HTTPException(status_code=403, detail="Forbidden")

    await evaluate_attempt(id, db)
    await db["attempts"].update_one({"id": id}, {"$set": {"status": "submitted"}})

    return await get_attempt_result(id=id, current_user=current_user, db=db)

@router.get("/{id}/result", response_model=AttemptResultResponse)
async def get_attempt_result(
    id: int,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Retrieve complete result analysis, question breakdown, and proctoring status."""
    attempt = await db["attempts"].find_one({"id": id})
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")
    if current_user.role == "student" and attempt["student_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden")

    exam = await db["exams"].find_one({"id": attempt["exam_id"]})
    student = await db["users"].find_one({"id": attempt["student_id"]})

    q_ids = exam.get("question_ids", []) if exam else []
    cursor = db["questions"].find({"id": {"$in": q_ids}})
    questions = []
    async for q in cursor:
        questions.append(q)
    q_map = {q["id"]: q for q in questions}

    student_answers = attempt.get("answers", [])
    ans_map = {a["question_id"]: a for a in student_answers}

    correct_count = 0
    incorrect_count = 0
    unanswered_count = 0
    marked_count = 0
    analysis_items = []

    for qid in q_ids:
        if qid not in q_map:
            continue
        q = q_map[qid]
        ans = ans_map.get(qid)
        
        options_data = [
            {
                "id": opt.get("id"),
                "option_text": opt.get("option_text", ""),
                "is_correct": opt.get("is_correct", False)
            }
            for opt in q.get("options", [])
        ]
        correct_opt = next((opt for opt in q.get("options", []) if opt.get("is_correct", False)), None)
        correct_opt_id = correct_opt.get("id") if correct_opt else None

        selected_opt_id = ans.get("selected_option_id") if ans else None
        is_marked = ans.get("is_marked_for_review", False) if ans else False
        if is_marked:
            marked_count += 1

        is_correct = False
        marks_awarded = 0.0

        if selected_opt_id is None:
            unanswered_count += 1
        else:
            if correct_opt_id and selected_opt_id == correct_opt_id:
                is_correct = True
                marks_awarded = float(q.get("marks", 1.0))
                correct_count += 1
            else:
                is_correct = False
                incorrect_count += 1
                if exam and exam.get("negative_marking", False):
                    q_neg = float(q.get("negative_marks", 0.0))
                    marks_awarded = -abs(q_neg if q_neg > 0 else float(exam.get("negative_mark_value", 0.25)))

        analysis_items.append(
            QuestionAnalysisItem(
                question_id=q["id"],
                question_text=q["text"],
                subject=q["subject"],
                difficulty=q.get("difficulty", "medium"),
                marks=float(q.get("marks", 1.0)),
                negative_marks=float(q.get("negative_marks", 0.0)),
                explanation=q.get("explanation"),
                options=options_data,
                selected_option_id=selected_opt_id,
                correct_option_id=correct_opt_id,
                is_correct=is_correct,
                marks_awarded=marks_awarded,
                is_marked_for_review=is_marked
            )
        )

    # Proctoring status
    proc_cursor = db["proctoring_incidents"].find({"attempt_id": attempt["id"]})
    events = []
    async for ev in proc_cursor:
        events.append(ev)
    proc_info = calculate_proctoring_score(events)

    return AttemptResultResponse(
        attempt_id=attempt["id"],
        exam_id=exam["id"] if exam else 0,
        exam_title=exam.get("title", "Exam") if exam else "Exam",
        student_id=student["id"] if student else attempt["student_id"],
        student_name=student.get("name", "Student") if student else "Student",
        student_email=student.get("email", "") if student else "",
        status=attempt.get("status", "submitted"),
        start_time=attempt.get("start_time", datetime.utcnow()),
        submitted_at=attempt.get("submitted_at"),
        time_spent_seconds=attempt.get("time_spent_seconds", 0),
        score=float(attempt.get("score", 0.0)),
        total_possible_marks=float(attempt.get("total_possible_marks", 100.0)),
        percentage=float(attempt.get("percentage", 0.0)),
        is_passed=attempt.get("is_passed", False),
        passing_marks=float(exam.get("passing_marks", 40.0)) if exam else 40.0,
        total_questions=len(analysis_items),
        correct_count=correct_count,
        incorrect_count=incorrect_count,
        unanswered_count=unanswered_count,
        marked_for_review_count=marked_count,
        proctoring_score=proc_info["score"],
        violation_count=proc_info["violations_count"],
        proctoring_status=proc_info["status"],
        questions=analysis_items
    )

@router.get("", response_model=List[AttemptSummaryAdmin])
async def list_attempts(
    exam_id: Optional[int] = None,
    student_id: Optional[int] = None,
    current_user: UserResponse = Depends(require_role(["admin", "examiner"])),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Admin / Examiner list examination attempts across all students from MongoDB."""
    query = {}
    if exam_id:
        query["exam_id"] = exam_id
    if student_id:
        query["student_id"] = student_id

    cursor = db["attempts"].find(query).sort("id", -1)
    summaries = []
    async for att in cursor:
        exam = await db["exams"].find_one({"id": att["exam_id"]})
        student = await db["users"].find_one({"id": att["student_id"]})
        if exam and student:
            summaries.append(
                AttemptSummaryAdmin(
                    id=att["id"],
                    exam_id=exam["id"],
                    exam_title=exam.get("title", "Exam"),
                    student_id=student["id"],
                    student_name=student.get("name", "Student"),
                    student_email=student.get("email", ""),
                    student_code=student.get("student_id"),
                    status=att.get("status", "submitted"),
                    start_time=att.get("start_time", datetime.utcnow()),
                    submitted_at=att.get("submitted_at"),
                    time_spent_seconds=att.get("time_spent_seconds", 0),
                    score=float(att.get("score", 0.0)),
                    total_possible_marks=float(att.get("total_possible_marks", 100.0)),
                    percentage=float(att.get("percentage", 0.0)),
                    is_passed=att.get("is_passed", False),
                    proctoring_score=float(att.get("proctoring_score", 100.0)),
                    violation_count=int(att.get("violation_count", 0))
                )
            )
    return summaries
