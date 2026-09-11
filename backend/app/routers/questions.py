from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List, Optional
import re

from app.mongodb import get_database, get_next_sequence
from app.schemas.auth import UserResponse
from app.schemas.question import (
    QuestionCreate, QuestionUpdate, QuestionAdminResponse, OptionAdminResponse
)
from app.utils.security import get_current_user, require_role

router = APIRouter(prefix="/questions", tags=["Question Bank"])

def doc_to_question_response(doc: dict) -> QuestionAdminResponse:
    options = []
    for idx, opt in enumerate(doc.get("options", [])):
        options.append(OptionAdminResponse(
            id=opt.get("id", idx + 1),
            option_text=opt.get("option_text", ""),
            is_correct=opt.get("is_correct", False),
            order_index=opt.get("order_index", idx)
        ))
    return QuestionAdminResponse(
        id=doc["id"],
        subject=doc["subject"],
        text=doc["text"],
        question_type=doc.get("question_type", "mcq_single"),
        difficulty=doc.get("difficulty", "medium"),
        marks=float(doc.get("marks", 1.0)),
        negative_marks=float(doc.get("negative_marks", 0.0)),
        explanation=doc.get("explanation"),
        created_by_id=doc.get("created_by_id"),
        created_at=doc.get("created_at", datetime.utcnow()),
        options=options
    )

@router.get("", response_model=List[QuestionAdminResponse])
async def get_questions(
    subject: Optional[str] = None,
    difficulty: Optional[str] = None,
    search: Optional[str] = None,
    current_user: UserResponse = Depends(require_role(["admin", "examiner"])),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Retrieve questions with optional filtering by subject, difficulty, and search keyword."""
    query = {}
    if subject:
        query["subject"] = {"$regex": subject, "$options": "i"}
    if difficulty:
        query["difficulty"] = difficulty
    if search:
        query["text"] = {"$regex": search, "$options": "i"}
    
    cursor = db["questions"].find(query).sort("id", -1)
    results = []
    async for doc in cursor:
        results.append(doc_to_question_response(doc))
    return results

@router.get("/subjects", response_model=List[str])
async def get_subjects(
    current_user: UserResponse = Depends(require_role(["admin", "examiner"])),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get list of all distinct subjects present in the question bank."""
    subjects = await db["questions"].distinct("subject")
    return [s for s in subjects if s]

@router.post("", response_model=QuestionAdminResponse, status_code=status.HTTP_201_CREATED)
async def create_question(
    q_in: QuestionCreate,
    current_user: UserResponse = Depends(require_role(["admin", "examiner"])),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Create a new question with embedded options."""
    if len(q_in.options) < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A question must contain at least 2 options."
        )
    
    has_correct = any(opt.is_correct for opt in q_in.options)
    if not has_correct:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one option must be marked as correct."
        )

    new_id = await get_next_sequence("question_id", db)
    now = datetime.utcnow()

    options_data = []
    for idx, opt in enumerate(q_in.options):
        opt_id = await get_next_sequence("option_id", db)
        options_data.append({
            "id": opt_id,
            "option_text": opt.option_text.strip(),
            "is_correct": opt.is_correct,
            "order_index": opt.order_index if opt.order_index is not None else idx
        })

    new_q_doc = {
        "id": new_id,
        "subject": q_in.subject.strip(),
        "text": q_in.text.strip(),
        "question_type": q_in.question_type or "mcq_single",
        "difficulty": q_in.difficulty or "medium",
        "marks": float(q_in.marks if q_in.marks is not None else 1.0),
        "negative_marks": float(q_in.negative_marks if q_in.negative_marks is not None else 0.0),
        "explanation": q_in.explanation,
        "created_by_id": current_user.id,
        "created_at": now,
        "options": options_data
    }

    await db["questions"].insert_one(new_q_doc)
    return doc_to_question_response(new_q_doc)

@router.get("/{id}", response_model=QuestionAdminResponse)
async def get_question(
    id: int,
    current_user: UserResponse = Depends(require_role(["admin", "examiner"])),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Fetch single question details by ID."""
    doc = await db["questions"].find_one({"id": id})
    if not doc:
        raise HTTPException(status_code=404, detail="Question not found")
    return doc_to_question_response(doc)

@router.put("/{id}", response_model=QuestionAdminResponse)
async def update_question(
    id: int,
    q_update: QuestionUpdate,
    current_user: UserResponse = Depends(require_role(["admin", "examiner"])),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Update question and optionally replace its options."""
    doc = await db["questions"].find_one({"id": id})
    if not doc:
        raise HTTPException(status_code=404, detail="Question not found")

    update_fields = {}
    if q_update.subject is not None:
        update_fields["subject"] = q_update.subject.strip()
    if q_update.text is not None:
        update_fields["text"] = q_update.text.strip()
    if q_update.difficulty is not None:
        update_fields["difficulty"] = q_update.difficulty
    if q_update.marks is not None:
        update_fields["marks"] = float(q_update.marks)
    if q_update.negative_marks is not None:
        update_fields["negative_marks"] = float(q_update.negative_marks)
    if q_update.explanation is not None:
        update_fields["explanation"] = q_update.explanation

    if q_update.options is not None:
        if len(q_update.options) < 2:
            raise HTTPException(status_code=400, detail="Must have at least 2 options")
        if not any(opt.is_correct for opt in q_update.options):
            raise HTTPException(status_code=400, detail="At least one option must be correct")

        options_data = []
        for idx, opt in enumerate(q_update.options):
            opt_id = await get_next_sequence("option_id", db)
            options_data.append({
                "id": opt_id,
                "option_text": opt.option_text.strip(),
                "is_correct": opt.is_correct,
                "order_index": opt.order_index if opt.order_index is not None else idx
            })
        update_fields["options"] = options_data

    if update_fields:
        await db["questions"].update_one({"id": id}, {"$set": update_fields})
        doc = await db["questions"].find_one({"id": id})

    return doc_to_question_response(doc)

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_question(
    id: int,
    current_user: UserResponse = Depends(require_role(["admin", "examiner"])),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Delete a question from the question bank."""
    res = await db["questions"].delete_one({"id": id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Question not found")
    return None
