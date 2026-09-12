from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel, Field
from typing import Literal, Optional, Dict, Any

from app.mongodb import get_database, init_db_indexes, get_next_sequence
from app.schemas.auth import UserResponse
from app.utils.security import get_password_hash, require_role
from app.config import settings

router = APIRouter(prefix="/admin/database", tags=["Admin Database Management"])

class DatabaseActionRequest(BaseModel):
    action: Literal["clear_attempts", "reset_and_reseed", "drop_database"] = Field(
        ...,
        description="Database maintenance action to perform"
    )
    confirmation_code: str = Field(
        ...,
        description="Confirmation code typed by the admin to prevent accidental execution"
    )

class DatabaseActionResponse(BaseModel):
    status: str
    action: str
    message: str
    details: Dict[str, Any]
    timestamp: datetime

@router.post("/action", response_model=DatabaseActionResponse)
async def perform_database_action(
    payload: DatabaseActionRequest,
    current_user: UserResponse = Depends(require_role(["admin"])),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    High-privilege Admin endpoint for database maintenance and reset operations:
    - clear_attempts: Purges all candidate test attempts, answers, and proctoring incidents.
    - reset_and_reseed: Completely resets database and reseeds standard exams, questions, and accounts.
    - drop_database: Drops all collections and preserves the active admin account.
    """
    valid_codes = ["CONFIRM_DATABASE_RESET", "DROP_DATABASE", "CONFIRM_ACTION", "RESET"]
    if payload.confirmation_code.strip() not in valid_codes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid confirmation code. Please enter 'CONFIRM_DATABASE_RESET' or 'DROP_DATABASE'."
        )

    now = datetime.now(timezone.utc)
    details: Dict[str, Any] = {}

    if payload.action == "clear_attempts":
        # 1. Purge all test attempt records, answers, and proctoring incidents
        del_attempts = await db["attempts"].delete_many({})
        del_answers = await db["answers"].delete_many({})
        del_incidents = await db["proctoring_incidents"].delete_many({})

        # Reset sequence counters for attempts, answers, proctoring
        await db["counters"].delete_many({"_id": {"$in": ["attempt_id", "answer_id", "proctoring_event_id"]}})

        details = {
            "attempts_deleted": del_attempts.deleted_count,
            "answers_deleted": del_answers.deleted_count,
            "incidents_deleted": del_incidents.deleted_count,
            "preserved": ["users", "exams", "questions"]
        }
        message = f"Successfully purged {del_attempts.deleted_count} candidate attempts, {del_answers.deleted_count} answers, and {del_incidents.deleted_count} proctoring incidents."

    elif payload.action in ["reset_and_reseed", "drop_database"]:
        # Drop or wipe all collections
        collections = ["attempts", "answers", "proctoring_incidents", "questions", "exams", "users", "counters"]
        for coll_name in collections:
            await db[coll_name].delete_many({})

        # Reinitialize indexes
        await init_db_indexes(db)

        # Re-create Admin Account
        admin_doc = {
            "id": 1,
            "name": "Sai Swaroop (Admin)",
            "email": "mattasaiswaroop5641@gmail.com",
            "student_id": "EMP-ADM-01",
            "hashed_password": get_password_hash("Mgsai@1025"),
            "role": "admin",
            "is_active": True,
            "is_2fa_enabled": False,
            "two_factor_secret": None,
            "created_at": now
        }
        await db["users"].insert_one(admin_doc)

        if payload.action == "reset_and_reseed":
            # Re-seed Examiner & Students
            examiner_doc = {
                "id": 2,
                "name": "Prof. Marcus Sterling",
                "email": "examiner@example.com",
                "student_id": "FAC-CS-402",
                "hashed_password": get_password_hash("Examiner@123"),
                "role": "examiner",
                "is_active": True,
                "is_2fa_enabled": False,
                "two_factor_secret": None,
                "created_at": now
            }
            student1_doc = {
                "id": 3,
                "name": "Alex Chen",
                "email": "student@example.com",
                "student_id": "STU-2026-9812",
                "hashed_password": get_password_hash("Student@123"),
                "role": "student",
                "is_active": True,
                "is_2fa_enabled": False,
                "two_factor_secret": None,
                "created_at": now
            }
            student2_doc = {
                "id": 4,
                "name": "Sophia Rodriguez",
                "email": "sophia@example.com",
                "student_id": "STU-2026-4401",
                "hashed_password": get_password_hash("Student@123"),
                "role": "student",
                "is_active": True,
                "is_2fa_enabled": False,
                "two_factor_secret": None,
                "created_at": now
            }
            await db["users"].insert_many([examiner_doc, student1_doc, student2_doc])

            # Seed standard Questions
            sample_questions = [
                {
                    "id": 1,
                    "subject": "Computer Science & AI",
                    "question_text": "Which data structure uses LIFO (Last In, First Out) ordering principle?",
                    "options": [
                        {"id": 1, "option_text": "Queue"},
                        {"id": 2, "option_text": "Stack"},
                        {"id": 3, "option_text": "Binary Search Tree"},
                        {"id": 4, "option_text": "Linked List"}
                    ],
                    "correct_option_id": 2,
                    "marks": 5,
                    "difficulty": "EASY",
                    "explanation": "A Stack operates on the Last In First Out (LIFO) paradigm, where elements added last are popped first.",
                    "created_at": now
                },
                {
                    "id": 2,
                    "subject": "Computer Science & AI",
                    "question_text": "What is the worst-case time complexity of standard QuickSort algorithm?",
                    "options": [
                        {"id": 1, "option_text": "O(n log n)"},
                        {"id": 2, "option_text": "O(n)"},
                        {"id": 3, "option_text": "O(n^2)"},
                        {"id": 4, "option_text": "O(log n)"}
                    ],
                    "correct_option_id": 3,
                    "marks": 5,
                    "difficulty": "MEDIUM",
                    "explanation": "QuickSort degrades to O(n^2) when the pivot selected consistently splits the array into unbalanced partitions.",
                    "created_at": now
                },
                {
                    "id": 3,
                    "subject": "Machine Learning",
                    "question_text": "Which algorithm is commonly used for real-time frontal face detection in OpenCV?",
                    "options": [
                        {"id": 1, "option_text": "Haar Cascade Classifier"},
                        {"id": 2, "option_text": "Dijkstra Algorithm"},
                        {"id": 3, "option_text": "K-Means Clustering"},
                        {"id": 4, "option_text": "Bellman-Ford Algorithm"}
                    ],
                    "correct_option_id": 1,
                    "marks": 5,
                    "difficulty": "EASY",
                    "explanation": "Haar Feature-based Cascade Classifiers (Viola-Jones) are standard in OpenCV for lightweight real-time face detection.",
                    "created_at": now
                },
                {
                    "id": 4,
                    "subject": "Cybersecurity",
                    "question_text": "In a Time-based One-Time Password (TOTP) algorithm (RFC 6238), what is the default standard time step window?",
                    "options": [
                        {"id": 1, "option_text": "10 seconds"},
                        {"id": 2, "option_text": "30 seconds"},
                        {"id": 3, "option_text": "60 seconds"},
                        {"id": 4, "option_text": "5 minutes"}
                    ],
                    "correct_option_id": 2,
                    "marks": 5,
                    "difficulty": "MEDIUM",
                    "explanation": "TOTP defaults to a 30-second time step window for rolling 6-digit authentication codes.",
                    "created_at": now
                }
            ]
            await db["questions"].insert_many(sample_questions)

            # Seed sample Examination
            sample_exam = {
                "id": 1,
                "title": "Computer Science & Continuous AI Proctoring Assessment",
                "description": "Comprehensive secure online assessment covering computer science algorithms, cybersecurity protocols, and computer vision systems with continuous automated face proctoring.",
                "duration_minutes": 30,
                "passing_marks": 10,
                "total_marks": 20,
                "is_active": True,
                "requires_proctoring": True,
                "question_ids": [1, 2, 3, 4],
                "created_by": 1,
                "created_at": now
            }
            await db["exams"].insert_one(sample_exam)

            # Initialize counters
            await db["counters"].insert_many([
                {"_id": "user_id", "seq": 4},
                {"_id": "question_id", "seq": 4},
                {"_id": "exam_id", "seq": 1},
                {"_id": "attempt_id", "seq": 0},
                {"_id": "answer_id", "seq": 0},
                {"_id": "proctoring_event_id", "seq": 0}
            ])

            details = {
                "users_seeded": 4,
                "questions_seeded": 4,
                "exams_seeded": 1,
                "admin_email": "mattasaiswaroop5641@gmail.com"
            }
            message = "Database completely reset and re-seeded with default admin, examiner, questions, and demo exam."
        else:
            # Drop database and preserve admin only
            await db["counters"].insert_many([
                {"_id": "user_id", "seq": 1},
                {"_id": "question_id", "seq": 0},
                {"_id": "exam_id", "seq": 0},
                {"_id": "attempt_id", "seq": 0},
                {"_id": "answer_id", "seq": 0},
                {"_id": "proctoring_event_id", "seq": 0}
            ])
            details = {
                "status": "database_dropped",
                "admin_preserved": "mattasaiswaroop5641@gmail.com"
            }
            message = "Database dropped. Collections cleared and fresh admin account re-initialized."

    return DatabaseActionResponse(
        status="success",
        action=payload.action,
        message=message,
        details=details,
        timestamp=now
    )
