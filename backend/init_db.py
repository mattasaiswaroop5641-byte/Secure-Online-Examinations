"""
Database Initialization Script for ExamShield (MongoDB Atlas).
Verifies upload storage directories, creates MongoDB indexes, and seeds starter data.
"""

import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(backend_dir))

from pymongo import MongoClient, ASCENDING
from app.config import settings
from app.utils.seed_data import seed_database

def init_database():
    """Initializes schema and directories for fresh deployment."""
    print("=== ExamShield MongoDB Initialization ===")
    
    settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    settings.EVIDENCE_DIR.mkdir(parents=True, exist_ok=True)
    print(f"[OK] Upload storage verified at: {settings.UPLOAD_DIR}")

    try:
        client = MongoClient(settings.MONGO_URI, serverSelectionTimeoutMS=5000)
        db = client[settings.MONGO_DB_NAME]
        client.admin.command('ping')
        print(f"[OK] Successfully connected to MongoDB database: {settings.MONGO_DB_NAME}")
        
        # Initialize indexes
        db["users"].create_index([("email", ASCENDING)], unique=True)
        db["users"].create_index([("student_id", ASCENDING)], sparse=True)
        db["users"].create_index([("id", ASCENDING)], unique=True)
        db["exams"].create_index([("id", ASCENDING)], unique=True)
        db["questions"].create_index([("id", ASCENDING)], unique=True)
        db["attempts"].create_index([("id", ASCENDING)], unique=True)
        db["proctoring_incidents"].create_index([("id", ASCENDING)], unique=True)
        print("[OK] MongoDB indexes built successfully.")
        
        # Seed database if empty
        seed_database()
    except Exception as e:
        print(f"[MongoDB Connection Notice] {e}")
        print("Please check your MONGO_URI in backend/.env if connecting to MongoDB Atlas.")

if __name__ == "__main__":
    init_database()
