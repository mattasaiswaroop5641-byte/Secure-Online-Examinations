from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List, Optional

from app.mongodb import get_database, get_next_sequence
from app.schemas.auth import UserResponse
from app.schemas.exam import (
    ExamCreate, ExamUpdate, ExamAdminResponse
)
from app.schemas.question import QuestionAdminResponse, OptionAdminResponse
from app.utils.security import get_current_user, require_role

router = APIRouter(prefix="/exams", tags=["Exams"])

def doc_to_question_admin_response(doc: dict) -> QuestionAdminResponse:
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

@router.get("", response_model=List[dict])
async def list_exams(
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    List exams.
    - Students receive active/available exams with their own attempt status.
    - Admins/Examiners receive all exams with stats (question count, attempt count).
    """
    if current_user.role in ["admin", "examiner"]:
        cursor = db["exams"].find({}).sort("id", -1)
        results = []
        async for e in cursor:
            q_ids = e.get("question_ids", [])
            att_count = await db["attempts"].count_documents({"exam_id": e["id"]})
            e_dict = {
                "id": e["id"],
                "title": e["title"],
                "subject": e["subject"],
                "description": e.get("description"),
                "instructions": e.get("instructions"),
                "duration_minutes": e.get("duration_minutes", 60),
                "total_marks": float(e.get("total_marks", 100.0)),
                "passing_marks": float(e.get("passing_marks", 40.0)),
                "negative_marking": e.get("negative_marking", False),
                "negative_mark_value": float(e.get("negative_mark_value", 0.25)),
                "randomize_questions": e.get("randomize_questions", False),
                "randomize_options": e.get("randomize_options", False),
                "start_time": e.get("start_time"),
                "end_time": e.get("end_time"),
                "status": e.get("status", "active"),
                "created_by_id": e.get("created_by_id"),
                "created_at": e.get("created_at", datetime.utcnow()),
                "updated_at": e.get("updated_at", datetime.utcnow()),
                "question_count": len(q_ids),
                "attempt_count": att_count
            }
            results.append(e_dict)
        return results

    # Student perspective
    cursor = db["exams"].find({"status": {"$in": ["active", "scheduled"]}}).sort("id", -1)
    results = []
    async for e in cursor:
        q_ids = e.get("question_ids", [])
        attempt = await db["attempts"].find_one(
            {"exam_id": e["id"], "student_id": current_user.id},
            sort=[("id", -1)]
        )
        attempt_status = attempt.get("status") if attempt else None
        attempt_id = attempt.get("id") if attempt else None

        results.append({
            "id": e["id"],
            "title": e["title"],
            "subject": e["subject"],
            "description": e.get("description"),
            "instructions": e.get("instructions"),
            "duration_minutes": e.get("duration_minutes", 60),
            "total_marks": float(e.get("total_marks", 100.0)),
            "passing_marks": float(e.get("passing_marks", 40.0)),
            "negative_marking": e.get("negative_marking", False),
            "negative_mark_value": float(e.get("negative_mark_value", 0.25)),
            "question_count": len(q_ids),
            "status": e.get("status", "active"),
            "user_attempt_status": attempt_status,
            "user_attempt_id": attempt_id
        })
    return results

@router.post("", response_model=ExamAdminResponse, status_code=status.HTTP_201_CREATED)
async def create_exam(
    exam_in: ExamCreate,
    current_user: UserResponse = Depends(require_role(["admin", "examiner"])),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Create a new examination and link selected questions in MongoDB."""
    new_id = await get_next_sequence("exam_id", db)
    now = datetime.utcnow()

    new_exam_doc = {
        "id": new_id,
        "title": exam_in.title.strip(),
        "subject": exam_in.subject.strip(),
        "description": exam_in.description,
        "instructions": exam_in.instructions,
        "duration_minutes": exam_in.duration_minutes,
        "total_marks": float(exam_in.total_marks),
        "passing_marks": float(exam_in.passing_marks),
        "negative_marking": exam_in.negative_marking,
        "negative_mark_value": float(exam_in.negative_mark_value),
        "randomize_questions": exam_in.randomize_questions,
        "randomize_options": exam_in.randomize_options,
        "start_time": exam_in.start_time,
        "end_time": exam_in.end_time,
        "status": exam_in.status or "active",
        "created_by_id": current_user.id,
        "question_ids": exam_in.question_ids or [],
        "created_at": now,
        "updated_at": now
    }

    await db["exams"].insert_one(new_exam_doc)

    return ExamAdminResponse(
        id=new_exam_doc["id"],
        title=new_exam_doc["title"],
        subject=new_exam_doc["subject"],
        description=new_exam_doc["description"],
        instructions=new_exam_doc["instructions"],
        duration_minutes=new_exam_doc["duration_minutes"],
        total_marks=new_exam_doc["total_marks"],
        passing_marks=new_exam_doc["passing_marks"],
        negative_marking=new_exam_doc["negative_marking"],
        negative_mark_value=new_exam_doc["negative_mark_value"],
        randomize_questions=new_exam_doc["randomize_questions"],
        randomize_options=new_exam_doc["randomize_options"],
        start_time=new_exam_doc["start_time"],
        end_time=new_exam_doc["end_time"],
        status=new_exam_doc["status"],
        created_by_id=new_exam_doc["created_by_id"],
        created_at=new_exam_doc["created_at"],
        updated_at=new_exam_doc["updated_at"],
        question_count=len(new_exam_doc["question_ids"]),
        attempt_count=0
    )

@router.get("/{id}")
async def get_exam(
    id: int,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get exam details."""
    exam = await db["exams"].find_one({"id": id})
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    q_ids = exam.get("question_ids", [])
    att_count = await db["attempts"].count_documents({"exam_id": id})

    exam_dict = {
        "id": exam["id"],
        "title": exam["title"],
        "subject": exam["subject"],
        "description": exam.get("description"),
        "instructions": exam.get("instructions"),
        "duration_minutes": exam.get("duration_minutes", 60),
        "total_marks": float(exam.get("total_marks", 100.0)),
        "passing_marks": float(exam.get("passing_marks", 40.0)),
        "negative_marking": exam.get("negative_marking", False),
        "negative_mark_value": float(exam.get("negative_mark_value", 0.25)),
        "randomize_questions": exam.get("randomize_questions", False),
        "randomize_options": exam.get("randomize_options", False),
        "start_time": exam.get("start_time"),
        "end_time": exam.get("end_time"),
        "status": exam.get("status", "active"),
        "created_by_id": exam.get("created_by_id"),
        "created_at": exam.get("created_at", datetime.utcnow()),
        "updated_at": exam.get("updated_at", datetime.utcnow()),
        "question_count": len(q_ids),
        "attempt_count": att_count
    }

    if current_user.role == "student":
        attempt = await db["attempts"].find_one(
            {"exam_id": exam["id"], "student_id": current_user.id},
            sort=[("id", -1)]
        )
        exam_dict["user_attempt_status"] = attempt.get("status") if attempt else None
        exam_dict["user_attempt_id"] = attempt.get("id") if attempt else None

    return exam_dict

@router.put("/{id}")
async def update_exam(
    id: int,
    exam_update: ExamUpdate,
    current_user: UserResponse = Depends(require_role(["admin", "examiner"])),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Update exam configuration and question assignments."""
    exam = await db["exams"].find_one({"id": id})
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    update_fields = {}
    dump = exam_update.model_dump(exclude_unset=True)
    for field, val in dump.items():
        if field == "question_ids":
            update_fields["question_ids"] = val
        elif val is not None:
            update_fields[field] = val

    update_fields["updated_at"] = datetime.utcnow()

    await db["exams"].update_one({"id": id}, {"$set": update_fields})
    updated = await db["exams"].find_one({"id": id})
    return {
        "id": updated["id"],
        "title": updated["title"],
        "subject": updated["subject"],
        "status": updated.get("status", "active"),
        "question_count": len(updated.get("question_ids", []))
    }

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_exam(
    id: int,
    current_user: UserResponse = Depends(require_role(["admin", "examiner"])),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Delete an examination."""
    res = await db["exams"].delete_one({"id": id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Exam not found")
    return None

@router.get("/{id}/questions", response_model=List[QuestionAdminResponse])
async def get_exam_questions_admin(
    id: int,
    current_user: UserResponse = Depends(require_role(["admin", "examiner"])),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Admin / Examiner fetch all questions associated with an exam with full details."""
    exam = await db["exams"].find_one({"id": id})
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    q_ids = exam.get("question_ids", [])
    if not q_ids:
        return []

    cursor = db["questions"].find({"id": {"$in": q_ids}})
    q_map = {}
    async for q_doc in cursor:
        q_map[q_doc["id"]] = doc_to_question_admin_response(q_doc)

    return [q_map[qid] for qid in q_ids if qid in q_map]
