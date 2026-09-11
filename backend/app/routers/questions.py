from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.models.user import User
from app.models.question import Question, QuestionOption, ExamQuestion
from app.schemas.question import (
    QuestionCreate, QuestionUpdate, QuestionAdminResponse
)
from app.utils.security import get_current_user, require_role

router = APIRouter(prefix="/questions", tags=["Question Bank"])

@router.get("", response_model=List[QuestionAdminResponse])
def get_questions(
    subject: Optional[str] = None,
    difficulty: Optional[str] = None,
    search: Optional[str] = None,
    current_user: User = Depends(require_role(["admin", "examiner"])),
    db: Session = Depends(get_db)
):
    """Retrieve questions with optional filtering by subject, difficulty, and search keyword."""
    query = db.query(Question)
    if subject:
        query = query.filter(Question.subject.ilike(f"%{subject}%"))
    if difficulty:
        query = query.filter(Question.difficulty == difficulty)
    if search:
        query = query.filter(Question.text.ilike(f"%{search}%"))
    return query.order_by(Question.id.desc()).all()

@router.get("/subjects", response_model=List[str])
def get_subjects(
    current_user: User = Depends(require_role(["admin", "examiner"])),
    db: Session = Depends(get_db)
):
    """Get list of all distinct subjects present in the question bank."""
    subjects = db.query(Question.subject).distinct().all()
    return [s[0] for s in subjects if s[0]]

@router.post("", response_model=QuestionAdminResponse, status_code=status.HTTP_201_CREATED)
def create_question(
    q_in: QuestionCreate,
    current_user: User = Depends(require_role(["admin", "examiner"])),
    db: Session = Depends(get_db)
):
    """Create a new question with multiple options."""
    if len(q_in.options) < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A question must contain at least 2 options."
        )
    
    # Verify at least one option is marked correct
    has_correct = any(opt.is_correct for opt in q_in.options)
    if not has_correct:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one option must be marked as correct."
        )

    new_q = Question(
        subject=q_in.subject.strip(),
        text=q_in.text.strip(),
        question_type=q_in.question_type or "mcq_single",
        difficulty=q_in.difficulty or "medium",
        marks=q_in.marks if q_in.marks is not None else 1.0,
        negative_marks=q_in.negative_marks if q_in.negative_marks is not None else 0.0,
        explanation=q_in.explanation,
        created_by_id=current_user.id
    )
    db.add(new_q)
    db.flush()

    for idx, opt in enumerate(q_in.options):
        new_opt = QuestionOption(
            question_id=new_q.id,
            option_text=opt.option_text.strip(),
            is_correct=opt.is_correct,
            order_index=opt.order_index if opt.order_index is not None else idx
        )
        db.add(new_opt)

    db.commit()
    db.refresh(new_q)
    return new_q

@router.get("/{id}", response_model=QuestionAdminResponse)
def get_question(
    id: int,
    current_user: User = Depends(require_role(["admin", "examiner"])),
    db: Session = Depends(get_db)
):
    """Fetch single question details by ID."""
    question = db.query(Question).filter(Question.id == id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    return question

@router.put("/{id}", response_model=QuestionAdminResponse)
def update_question(
    id: int,
    q_update: QuestionUpdate,
    current_user: User = Depends(require_role(["admin", "examiner"])),
    db: Session = Depends(get_db)
):
    """Update question and optionally replace its options."""
    question = db.query(Question).filter(Question.id == id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    if q_update.subject is not None:
        question.subject = q_update.subject.strip()
    if q_update.text is not None:
        question.text = q_update.text.strip()
    if q_update.difficulty is not None:
        question.difficulty = q_update.difficulty
    if q_update.marks is not None:
        question.marks = q_update.marks
    if q_update.negative_marks is not None:
        question.negative_marks = q_update.negative_marks
    if q_update.explanation is not None:
        question.explanation = q_update.explanation

    if q_update.options is not None:
        # Validate options
        if len(q_update.options) < 2:
            raise HTTPException(status_code=400, detail="Must have at least 2 options")
        if not any(opt.is_correct for opt in q_update.options):
            raise HTTPException(status_code=400, detail="At least one option must be correct")

        # Delete existing options and recreate
        db.query(QuestionOption).filter(QuestionOption.question_id == id).delete()
        for idx, opt in enumerate(q_update.options):
            new_opt = QuestionOption(
                question_id=id,
                option_text=opt.option_text.strip(),
                is_correct=opt.is_correct,
                order_index=opt.order_index if opt.order_index is not None else idx
            )
            db.add(new_opt)

    db.commit()
    db.refresh(question)
    return question

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_question(
    id: int,
    current_user: User = Depends(require_role(["admin", "examiner"])),
    db: Session = Depends(get_db)
):
    """Delete a question from the question bank."""
    question = db.query(Question).filter(Question.id == id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    db.delete(question)
    db.commit()
    return None
