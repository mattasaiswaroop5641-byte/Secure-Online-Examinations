from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.database import Base

class ExamAttempt(Base):
    __tablename__ = "exam_attempts"

    id = Column(Integer, primary_key=True, index=True)
    exam_id = Column(Integer, ForeignKey("exams.id", ondelete="CASCADE"), nullable=False)
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    # Timing (server-authoritative)
    start_time = Column(DateTime, default=datetime.utcnow, nullable=False)
    end_time = Column(DateTime, nullable=True)  # Server computed deadline
    submitted_at = Column(DateTime, nullable=True)
    time_spent_seconds = Column(Integer, default=0)
    
    # Status: in_progress, submitted, timed_out, abandoned
    status = Column(String(30), default="in_progress", index=True, nullable=False)
    
    # Evaluation
    score = Column(Float, default=0.0)
    total_possible_marks = Column(Float, default=0.0)
    percentage = Column(Float, default=0.0)
    is_passed = Column(Boolean, default=False)
    
    # Proctoring integrity score (100 is pristine; decreases with violations)
    proctoring_score = Column(Float, default=100.0)
    violation_count = Column(Integer, default=0)
    
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    exam = relationship("Exam", back_populates="attempts")
    student = relationship("User", back_populates="attempts")
    answers = relationship("StudentAnswer", back_populates="attempt", cascade="all, delete-orphan")
    proctoring_events = relationship("ProctoringEvent", back_populates="attempt", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Attempt {self.id} for Exam {self.exam_id} by Student {self.student_id} ({self.status})>"


class StudentAnswer(Base):
    __tablename__ = "student_answers"

    id = Column(Integer, primary_key=True, index=True)
    attempt_id = Column(Integer, ForeignKey("exam_attempts.id", ondelete="CASCADE"), nullable=False)
    question_id = Column(Integer, ForeignKey("questions.id", ondelete="CASCADE"), nullable=False)
    selected_option_id = Column(Integer, ForeignKey("question_options.id", ondelete="SET NULL"), nullable=True)
    
    is_marked_for_review = Column(Boolean, default=False)
    is_correct = Column(Boolean, default=False)
    marks_awarded = Column(Float, default=0.0)
    answered_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    attempt = relationship("ExamAttempt", back_populates="answers")
    question = relationship("Question")
    selected_option = relationship("QuestionOption")

    def __repr__(self):
        return f"<Answer {self.id} Q{self.question_id} Opt={self.selected_option_id}>"
