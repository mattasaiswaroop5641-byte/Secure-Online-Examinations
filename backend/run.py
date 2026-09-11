import uvicorn
import sys
from app.utils.seed_data import seed_database

if __name__ == "__main__":
    print("Ensuring database has seed data...")
    try:
        seed_database()
    except Exception as e:
        print(f"Seed info: {e}")
        
    print("Starting ExamShield Backend Server on http://127.0.0.1:8000 ...")
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
