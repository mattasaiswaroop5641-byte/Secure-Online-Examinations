from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.orm import relationship
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, index=True, nullable=False)
    student_id = Column(String(50), unique=True, index=True, nullable=True)  # Roll / Registration number
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(20), default="student", nullable=False)  # admin, examiner, student
    avatar_url = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    created_exams = relationship("Exam", back_populates="creator", cascade="all, delete-orphan")
    attempts = relationship("ExamAttempt", back_populates="student", cascade="all, delete-orphan")
    proctoring_events = relationship("ProctoringEvent", back_populates="student")

    def __repr__(self):
        return f"<User {self.email} ({self.role})>"
