from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.models.user import User
from app.models.exam import Exam
from app.models.question import Question, ExamQuestion
from app.models.attempt import ExamAttempt
from app.schemas.exam import (
    ExamCreate, ExamUpdate, ExamAdminResponse, ExamStudentCardResponse
)
from app.schemas.question import QuestionAdminResponse
from app.utils.security import get_current_user, require_role

router = APIRouter(prefix="/exams", tags=["Exams"])

@router.get("", response_model=List[dict])
def list_exams(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List exams.
    - Students receive active/available exams with their own attempt status.
    - Admins/Examiners receive all exams with stats (question count, attempt count).
    """
    if current_user.role in ["admin", "examiner"]:
        exams = db.query(Exam).order_by(Exam.id.desc()).all()
        results = []
        for e in exams:
            q_count = db.query(ExamQuestion).filter(ExamQuestion.exam_id == e.id).count()
            att_count = db.query(ExamAttempt).filter(ExamAttempt.exam_id == e.id).count()
            e_dict = {
                "id": e.id,
                "title": e.title,
                "subject": e.subject,
                "description": e.description,
                "instructions": e.instructions,
                "duration_minutes": e.duration_minutes,
                "total_marks": e.total_marks,
                "passing_marks": e.passing_marks,
                "negative_marking": e.negative_marking,
                "negative_mark_value": e.negative_mark_value,
                "randomize_questions": e.randomize_questions,
                "randomize_options": e.randomize_options,
                "start_time": e.start_time,
                "end_time": e.end_time,
                "status": e.status,
                "created_by_id": e.created_by_id,
                "created_at": e.created_at,
                "updated_at": e.updated_at,
                "question_count": q_count,
                "attempt_count": att_count
            }
            results.append(e_dict)
        return results

    # Student perspective
    exams = db.query(Exam).filter(Exam.status.in_(["active", "scheduled"])).order_by(Exam.id.desc()).all()
    results = []
    for e in exams:
        q_count = db.query(ExamQuestion).filter(ExamQuestion.exam_id == e.id).count()
        # Find latest attempt by this student
        attempt = (
            db.query(ExamAttempt)
            .filter(ExamAttempt.exam_id == e.id, ExamAttempt.student_id == current_user.id)
            .order_by(ExamAttempt.id.desc())
            .first()
        )
        attempt_status = attempt.status if attempt else None
        attempt_id = attempt.id if attempt else None

        results.append({
            "id": e.id,
            "title": e.title,
            "subject": e.subject,
            "description": e.description,
            "instructions": e.instructions,
            "duration_minutes": e.duration_minutes,
            "total_marks": e.total_marks,
            "passing_marks": e.passing_marks,
            "negative_marking": e.negative_marking,
            "negative_mark_value": e.negative_mark_value,
            "question_count": q_count,
            "status": e.status,
            "user_attempt_status": attempt_status,
            "user_attempt_id": attempt_id
        })
    return results

@router.post("", response_model=ExamAdminResponse, status_code=status.HTTP_201_CREATED)
def create_exam(
    exam_in: ExamCreate,
    current_user: User = Depends(require_role(["admin", "examiner"])),
    db: Session = Depends(get_db)
):
    """Create a new examination and link selected questions."""
    new_exam = Exam(
        title=exam_in.title.strip(),
        subject=exam_in.subject.strip(),
        description=exam_in.description,
        instructions=exam_in.instructions,
        duration_minutes=exam_in.duration_minutes,
        total_marks=exam_in.total_marks,
        passing_marks=exam_in.passing_marks,
        negative_marking=exam_in.negative_marking,
        negative_mark_value=exam_in.negative_mark_value,
        randomize_questions=exam_in.randomize_questions,
        randomize_options=exam_in.randomize_options,
        start_time=exam_in.start_time,
        end_time=exam_in.end_time,
        status=exam_in.status,
        created_by_id=current_user.id
    )
    db.add(new_exam)
    db.flush()

    # Link questions
    if exam_in.question_ids:
        for idx, qid in enumerate(exam_in.question_ids):
            q_exists = db.query(Question).filter(Question.id == qid).first()
            if q_exists:
                link = ExamQuestion(exam_id=new_exam.id, question_id=qid, order_index=idx)
                db.add(link)

    db.commit()
    db.refresh(new_exam)

    q_count = db.query(ExamQuestion).filter(ExamQuestion.exam_id == new_exam.id).count()
    res = new_exam.__dict__
    res["question_count"] = q_count
    res["attempt_count"] = 0
    return res

@router.get("/{id}")
def get_exam(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get exam details."""
    exam = db.query(Exam).filter(Exam.id == id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    q_count = db.query(ExamQuestion).filter(ExamQuestion.exam_id == exam.id).count()
    att_count = db.query(ExamAttempt).filter(ExamAttempt.exam_id == exam.id).count()

    exam_dict = {
        "id": exam.id,
        "title": exam.title,
        "subject": exam.subject,
        "description": exam.description,
        "instructions": exam.instructions,
        "duration_minutes": exam.duration_minutes,
        "total_marks": exam.total_marks,
        "passing_marks": exam.passing_marks,
        "negative_marking": exam.negative_marking,
        "negative_mark_value": exam.negative_mark_value,
        "randomize_questions": exam.randomize_questions,
        "randomize_options": exam.randomize_options,
        "start_time": exam.start_time,
        "end_time": exam.end_time,
        "status": exam.status,
        "created_by_id": exam.created_by_id,
        "created_at": exam.created_at,
        "updated_at": exam.updated_at,
        "question_count": q_count,
        "attempt_count": att_count
    }

    if current_user.role == "student":
        attempt = (
            db.query(ExamAttempt)
            .filter(ExamAttempt.exam_id == exam.id, ExamAttempt.student_id == current_user.id)
            .order_by(ExamAttempt.id.desc())
            .first()
        )
        exam_dict["user_attempt_status"] = attempt.status if attempt else None
        exam_dict["user_attempt_id"] = attempt.id if attempt else None

    return exam_dict

@router.put("/{id}")
def update_exam(
    id: int,
    exam_update: ExamUpdate,
    current_user: User = Depends(require_role(["admin", "examiner"])),
    db: Session = Depends(get_db)
):
    """Update exam configuration and question assignments."""
    exam = db.query(Exam).filter(Exam.id == id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    for field, val in exam_update.model_dump(exclude_unset=True, exclude={"question_ids"}).items():
        setattr(exam, field, val)

    if exam_update.question_ids is not None:
        db.query(ExamQuestion).filter(ExamQuestion.exam_id == id).delete()
        for idx, qid in enumerate(exam_update.question_ids):
            link = ExamQuestion(exam_id=id, question_id=qid, order_index=idx)
            db.add(link)

    db.commit()
    db.refresh(exam)
    return exam

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_exam(
    id: int,
    current_user: User = Depends(require_role(["admin", "examiner"])),
    db: Session = Depends(get_db)
):
    """Delete an examination."""
    exam = db.query(Exam).filter(Exam.id == id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    db.delete(exam)
    db.commit()
    return None

@router.get("/{id}/questions", response_model=List[QuestionAdminResponse])
def get_exam_questions_admin(
    id: int,
    current_user: User = Depends(require_role(["admin", "examiner"])),
    db: Session = Depends(get_db)
):
    """Admin / Examiner fetch all questions associated with an exam with full details."""
    links = db.query(ExamQuestion).filter(ExamQuestion.exam_id == id).order_by(ExamQuestion.order_index).all()
    q_ids = [l.question_id for l in links]
    if not q_ids:
        return []
    questions = db.query(Question).filter(Question.id.in_(q_ids)).all()
    # Preserve order
    q_map = {q.id: q for q in questions}
    return [q_map[qid] for qid in q_ids if qid in q_map]
