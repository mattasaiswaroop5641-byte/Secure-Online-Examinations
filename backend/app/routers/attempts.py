from datetime import datetime, timedelta
import random
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional, Dict

from app.database import get_db
from app.models.user import User
from app.models.exam import Exam
from app.models.question import Question, QuestionOption, ExamQuestion
from app.models.attempt import ExamAttempt, StudentAnswer
from app.models.proctoring import ProctoringEvent
from app.schemas.attempt import (
    StartExamResponse, SaveAnswerRequest, TimeRemainingResponse,
    AttemptResultResponse, AttemptSummaryAdmin, QuestionAnalysisItem, AnswerState
)
from app.schemas.question import QuestionStudentResponse, OptionStudentResponse
from app.services.grading_service import evaluate_attempt, calculate_proctoring_score
from app.utils.security import get_current_user, require_role

router = APIRouter(prefix="/attempts", tags=["Attempts & Submissions"])

@router.post("/exams/{exam_id}/start", response_model=StartExamResponse)
def start_exam_attempt(
    exam_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Starts or resumes an examination attempt.
    Returns student-safe question payloads (no correct answers / explanations),
    authoritative server-calculated deadline, and any previously saved answer state.
    """
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    if exam.status != "active":
        raise HTTPException(status_code=400, detail=f"Exam is not currently active (status: {exam.status})")

    # Check for existing attempt
    attempt = (
        db.query(ExamAttempt)
        .filter(ExamAttempt.exam_id == exam.id, ExamAttempt.student_id == current_user.id)
        .order_by(ExamAttempt.id.desc())
        .first()
    )

    now = datetime.utcnow()
    if attempt:
        if attempt.status in ["submitted", "timed_out"]:
            raise HTTPException(status_code=400, detail="You have already completed and submitted this examination.")
        
        # Check if deadline passed
        if attempt.end_time and now > attempt.end_time:
            evaluate_attempt(attempt.id, db)
            attempt.status = "timed_out"
            db.commit()
            raise HTTPException(status_code=400, detail="Examination time has expired.")
    else:
        # Create fresh attempt
        end_time = now + timedelta(minutes=exam.duration_minutes)
        attempt = ExamAttempt(
            exam_id=exam.id,
            student_id=current_user.id,
            start_time=now,
            end_time=end_time,
            status="in_progress",
            proctoring_score=100.0,
            violation_count=0
        )
        db.add(attempt)
        db.commit()
        db.refresh(attempt)

    # Fetch questions
    links = db.query(ExamQuestion).filter(ExamQuestion.exam_id == exam.id).order_by(ExamQuestion.order_index).all()
    q_ids = [l.question_id for l in links]
    questions = db.query(Question).filter(Question.id.in_(q_ids)).all() if q_ids else []
    q_map = {q.id: q for q in questions}
    ordered_questions = [q_map[qid] for qid in q_ids if qid in q_map]

    if exam.randomize_questions:
        # Deterministically seed with attempt ID so student sees consistent order on reload
        rng = random.Random(attempt.id)
        rng.shuffle(ordered_questions)

    # Format questions safely for student
    student_questions = []
    for idx, q in enumerate(ordered_questions):
        raw_options = list(q.options)
        if exam.randomize_options:
            rng_opt = random.Random(attempt.id * 1000 + q.id)
            rng_opt.shuffle(raw_options)

        opts = [
            OptionStudentResponse(
                id=opt.id,
                option_text=opt.option_text,
                order_index=opt_idx
            )
            for opt_idx, opt in enumerate(raw_options)
        ]

        student_questions.append(
            QuestionStudentResponse(
                id=q.id,
                subject=q.subject,
                text=q.text,
                question_type=q.question_type or "mcq_single",
                difficulty=q.difficulty or "medium",
                marks=q.marks or 1.0,
                negative_marks=q.negative_marks or 0.0,
                order_index=idx + 1,
                options=opts
            )
        )

    # Existing answers
    saved_answers = db.query(StudentAnswer).filter(StudentAnswer.attempt_id == attempt.id).all()
    current_answers: Dict[int, AnswerState] = {
        ans.question_id: AnswerState(
            question_id=ans.question_id,
            selected_option_id=ans.selected_option_id,
            is_marked_for_review=ans.is_marked_for_review
        )
        for ans in saved_answers
    }

    remaining_seconds = max(0, int((attempt.end_time - now).total_seconds())) if attempt.end_time else exam.duration_minutes * 60

    return StartExamResponse(
        attempt_id=attempt.id,
        exam_id=exam.id,
        exam_title=exam.title,
        duration_minutes=exam.duration_minutes,
        start_time=attempt.start_time,
        end_time=attempt.end_time or (now + timedelta(minutes=exam.duration_minutes)),
        remaining_seconds=remaining_seconds,
        total_questions=len(student_questions),
        questions=student_questions,
        current_answers=current_answers
    )

@router.get("/{id}/time-remaining", response_model=TimeRemainingResponse)
def get_time_remaining(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Authoritative server countdown check and auto-timeout trigger."""
    attempt = db.query(ExamAttempt).filter(ExamAttempt.id == id).first()
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")

    # Access check
    if current_user.role == "student" and attempt.student_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden")

    if attempt.status in ["submitted", "timed_out"]:
        return TimeRemainingResponse(
            attempt_id=attempt.id,
            remaining_seconds=0,
            is_expired=True,
            status=attempt.status
        )

    now = datetime.utcnow()
    remaining = int((attempt.end_time - now).total_seconds()) if attempt.end_time else 0
    if remaining <= 0:
        # Time expired: auto submit
        evaluate_attempt(attempt.id, db)
        attempt.status = "timed_out"
        db.commit()
        return TimeRemainingResponse(
            attempt_id=attempt.id,
            remaining_seconds=0,
            is_expired=True,
            status="timed_out"
        )

    return TimeRemainingResponse(
        attempt_id=attempt.id,
        remaining_seconds=remaining,
        is_expired=False,
        status=attempt.status
    )

@router.post("/{id}/answer", status_code=status.HTTP_200_OK)
def save_answer(
    id: int,
    payload: SaveAnswerRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Save or update candidate's answer for a question in real-time."""
    attempt = db.query(ExamAttempt).filter(ExamAttempt.id == id).first()
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")
    if attempt.student_id != current_user.id and current_user.role not in ["admin"]:
        raise HTTPException(status_code=403, detail="Forbidden")
    if attempt.status != "in_progress":
        raise HTTPException(status_code=400, detail="Cannot edit answers for an inactive attempt")

    # Verify deadline
    if attempt.end_time and datetime.utcnow() > attempt.end_time:
        evaluate_attempt(attempt.id, db)
        attempt.status = "timed_out"
        db.commit()
        raise HTTPException(status_code=400, detail="Exam time expired")

    answer = (
        db.query(StudentAnswer)
        .filter(StudentAnswer.attempt_id == id, StudentAnswer.question_id == payload.question_id)
        .first()
    )

    if answer:
        answer.selected_option_id = payload.selected_option_id
        if payload.is_marked_for_review is not None:
            answer.is_marked_for_review = payload.is_marked_for_review
    else:
        answer = StudentAnswer(
            attempt_id=id,
            question_id=payload.question_id,
            selected_option_id=payload.selected_option_id,
            is_marked_for_review=payload.is_marked_for_review or False
        )
        db.add(answer)

    db.commit()
    return {"status": "saved", "question_id": payload.question_id, "selected_option_id": payload.selected_option_id}

@router.post("/{id}/submit", response_model=AttemptResultResponse)
def submit_exam(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Explicit student submission of exam, calculates marks and returns detailed result."""
    attempt = db.query(ExamAttempt).filter(ExamAttempt.id == id).first()
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")
    if attempt.student_id != current_user.id and current_user.role not in ["admin"]:
        raise HTTPException(status_code=403, detail="Forbidden")

    evaluate_attempt(attempt.id, db)
    attempt.status = "submitted"
    db.commit()

    return get_attempt_result(id=id, current_user=current_user, db=db)

@router.get("/{id}/result", response_model=AttemptResultResponse)
def get_attempt_result(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve complete result analysis, question breakdown, and proctoring status."""
    attempt = db.query(ExamAttempt).filter(ExamAttempt.id == id).first()
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")
    if current_user.role == "student" and attempt.student_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden")

    exam = db.query(Exam).filter(Exam.id == attempt.exam_id).first()
    student = db.query(User).filter(User.id == attempt.student_id).first()

    # Fetch all questions for this exam
    links = db.query(ExamQuestion).filter(ExamQuestion.exam_id == exam.id).order_by(ExamQuestion.order_index).all()
    q_ids = [l.question_id for l in links]
    questions = db.query(Question).filter(Question.id.in_(q_ids)).all() if q_ids else []
    q_map = {q.id: q for q in questions}

    student_answers = db.query(StudentAnswer).filter(StudentAnswer.attempt_id == attempt.id).all()
    ans_map = {a.question_id: a for a in student_answers}

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
        
        # Options list
        options_data = [
            {
                "id": opt.id,
                "option_text": opt.option_text,
                "is_correct": opt.is_correct
            }
            for opt in q.options
        ]
        correct_opt = next((opt for opt in q.options if opt.is_correct), None)
        correct_opt_id = correct_opt.id if correct_opt else None

        selected_opt_id = ans.selected_option_id if ans else None
        is_marked = ans.is_marked_for_review if ans else False
        if is_marked:
            marked_count += 1

        is_correct = False
        marks_awarded = 0.0

        if selected_opt_id is None:
            unanswered_count += 1
        else:
            if correct_opt_id and selected_opt_id == correct_opt_id:
                is_correct = True
                marks_awarded = q.marks or 1.0
                correct_count += 1
            else:
                is_correct = False
                incorrect_count += 1
                if exam.negative_marking:
                    marks_awarded = -abs(q.negative_marks if q.negative_marks > 0 else exam.negative_mark_value)

        analysis_items.append(
            QuestionAnalysisItem(
                question_id=q.id,
                question_text=q.text,
                subject=q.subject,
                difficulty=q.difficulty or "medium",
                marks=q.marks or 1.0,
                negative_marks=q.negative_marks or 0.0,
                explanation=q.explanation,
                options=options_data,
                selected_option_id=selected_opt_id,
                correct_option_id=correct_opt_id,
                is_correct=is_correct,
                marks_awarded=marks_awarded,
                is_marked_for_review=is_marked
            )
        )

    # Proctoring status
    events = db.query(ProctoringEvent).filter(ProctoringEvent.attempt_id == attempt.id).all()
    proc_info = calculate_proctoring_score(events)

    return AttemptResultResponse(
        attempt_id=attempt.id,
        exam_id=exam.id,
        exam_title=exam.title,
        student_id=student.id,
        student_name=student.name,
        student_email=student.email,
        status=attempt.status,
        start_time=attempt.start_time,
        submitted_at=attempt.submitted_at,
        time_spent_seconds=attempt.time_spent_seconds or 0,
        score=attempt.score,
        total_possible_marks=attempt.total_possible_marks,
        percentage=attempt.percentage,
        is_passed=attempt.is_passed,
        passing_marks=exam.passing_marks,
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
def list_attempts(
    exam_id: Optional[int] = None,
    student_id: Optional[int] = None,
    current_user: User = Depends(require_role(["admin", "examiner"])),
    db: Session = Depends(get_db)
):
    """Admin / Examiner list examination attempts across all students."""
    query = db.query(ExamAttempt)
    if exam_id:
        query = query.filter(ExamAttempt.exam_id == exam_id)
    if student_id:
        query = query.filter(ExamAttempt.student_id == student_id)

    attempts = query.order_by(ExamAttempt.id.desc()).all()
    summaries = []
    for att in attempts:
        exam = db.query(Exam).filter(Exam.id == att.exam_id).first()
        student = db.query(User).filter(User.id == att.student_id).first()
        if exam and student:
            summaries.append(
                AttemptSummaryAdmin(
                    id=att.id,
                    exam_id=exam.id,
                    exam_title=exam.title,
                    student_id=student.id,
                    student_name=student.name,
                    student_email=student.email,
                    student_code=student.student_id,
                    status=att.status,
                    start_time=att.start_time,
                    submitted_at=att.submitted_at,
                    time_spent_seconds=att.time_spent_seconds or 0,
                    score=att.score,
                    total_possible_marks=att.total_possible_marks,
                    percentage=att.percentage,
                    is_passed=att.is_passed,
                    proctoring_score=att.proctoring_score,
                    violation_count=att.violation_count
                )
            )
    return summaries
