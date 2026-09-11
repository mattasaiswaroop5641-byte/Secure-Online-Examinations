import pytest
import os
import sys
from pathlib import Path
from datetime import datetime, timedelta

backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from fastapi.testclient import TestClient
from app.main import app
from app.mongodb import db_manager, init_db_indexes
from app.config import settings
from app.utils.security import get_password_hash
from mongomock_motor import AsyncMongoMockClient

async def seed_async_mock_db(db):
    now = datetime.utcnow()
    # Users
    users_data = [
        {
            "id": 1,
            "name": "Sai Swaroop (Admin)",
            "email": "mattasaiswaroop5641@gmail.com",
            "student_id": "EMP-ADM-01",
            "hashed_password": get_password_hash("Mgsai@1025"),
            "role": "admin",
            "is_active": True,
            "is_2fa_enabled": False,
            "created_at": now
        },
        {
            "id": 99,
            "name": "Dr. Eleanor Vance",
            "email": "admin@example.com",
            "student_id": "EMP-ADM-99",
            "hashed_password": get_password_hash("Admin@123"),
            "role": "admin",
            "is_active": True,
            "is_2fa_enabled": False,
            "created_at": now
        },
        {
            "id": 2,
            "name": "Prof. Marcus Sterling",
            "email": "examiner@example.com",
            "student_id": "FAC-CS-402",
            "hashed_password": get_password_hash("Examiner@123"),
            "role": "examiner",
            "is_active": True,
            "created_at": now
        },
        {
            "id": 3,
            "name": "Alex Chen",
            "email": "student@example.com",
            "student_id": "STU-2026-9812",
            "hashed_password": get_password_hash("Student@123"),
            "role": "student",
            "is_active": True,
            "created_at": now
        }
    ]
    await db["users"].insert_many(users_data)

    # Questions
    q_doc = {
        "id": 1,
        "subject": "Data Structures & Algorithms",
        "text": "What is the worst-case time complexity of searching in a balanced BST?",
        "question_type": "mcq_single",
        "difficulty": "medium",
        "marks": 2.0,
        "negative_marks": 0.5,
        "explanation": "Balanced BSTs guarantee O(log n) time.",
        "created_by_id": 2,
        "created_at": now,
        "options": [
            {"id": 1, "option_text": "O(1)", "is_correct": False, "order_index": 0},
            {"id": 2, "option_text": "O(log n)", "is_correct": True, "order_index": 1}
        ]
    }
    await db["questions"].insert_one(q_doc)

    # Exam
    exam_doc = {
        "id": 1,
        "title": "CS Fundamentals & Security",
        "subject": "Computer Science",
        "description": "Midterm test",
        "instructions": "Follow camera proctoring instructions.",
        "duration_minutes": 45,
        "total_marks": 20.0,
        "passing_marks": 8.0,
        "negative_marking": True,
        "negative_mark_value": 0.25,
        "randomize_questions": False,
        "randomize_options": False,
        "status": "active",
        "created_by_id": 2,
        "question_ids": [1],
        "created_at": now,
        "updated_at": now
    }
    await db["exams"].insert_one(exam_doc)

    # Counters
    await db["counters"].insert_many([
        {"_id": "user_id", "seq": 10},
        {"_id": "question_id", "seq": 10},
        {"_id": "option_id", "seq": 20},
        {"_id": "exam_id", "seq": 10},
        {"_id": "attempt_id", "seq": 10},
        {"_id": "proctoring_event_id", "seq": 10}
    ])

@pytest.fixture(scope="session", autouse=True)
def setup_test_environment():
    import asyncio
    # Check live Mongo connection; if fails, use AsyncMongoMockClient
    try:
        from pymongo import MongoClient
        test_client = MongoClient(settings.MONGO_URI, serverSelectionTimeoutMS=1000)
        test_client.admin.command('ping')
        from app.utils.seed_data import seed_database
        seed_database()
    except Exception:
        # Switch to mock motor database for offline tests
        mock_client = AsyncMongoMockClient()
        db_manager.client = mock_client
        db_manager.db = mock_client[settings.MONGO_DB_NAME]
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        loop.run_until_complete(seed_async_mock_db(db_manager.db))

@pytest.fixture(scope="session")
def client():
    with TestClient(app) as c:
        yield c

