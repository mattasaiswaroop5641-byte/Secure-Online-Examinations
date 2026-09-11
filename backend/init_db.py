"""
Database Initialization Script for ExamShield.
Creates all database tables and ensures required upload storage directories exist.
Ready for fresh, user-defined administrative setups and candidate registrations.
"""

import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(backend_dir))

from app.database import engine, Base
from app.config import settings
from app.models.user import User
from app.models.exam import Exam
from app.models.question import Question, QuestionOption, ExamQuestion
from app.models.attempt import ExamAttempt, StudentAnswer
from app.models.proctoring import ProctoringEvent, SystemSetting

def init_database():
    """Initializes schema and directories for fresh deployment."""
    print("=== ExamShield Database Initialization ===")
    
    settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    settings.EVIDENCE_DIR.mkdir(parents=True, exist_ok=True)
    print(f"[OK] Upload storage verified at: {settings.UPLOAD_DIR}")

    Base.metadata.create_all(bind=engine)
    print(f"[OK] Database schema initialized successfully at: {settings.DATABASE_URL}")
    print("System is ready for user-defined account registrations and examination setups.")

if __name__ == "__main__":
    init_database()
