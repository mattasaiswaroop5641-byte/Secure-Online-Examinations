from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, Float, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class Question(Base):
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, index=True)
    subject = Column(String(100), index=True, nullable=False)
    text = Column(Text, nullable=False)
    question_type = Column(String(30), default="mcq_single")  # mcq_single, mcq_multiple, true_false
    difficulty = Column(String(20), default="medium")  # easy, medium, hard
    marks = Column(Float, default=1.0)
    negative_marks = Column(Float, default=0.0)
    explanation = Column(Text, nullable=True)
    created_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    options = relationship("QuestionOption", back_populates="question", cascade="all, delete-orphan", order_by="QuestionOption.order_index")
    exam_links = relationship("ExamQuestion", back_populates="question", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Question {self.id}: {self.subject} ({self.difficulty})>"


class QuestionOption(Base):
    __tablename__ = "question_options"

    id = Column(Integer, primary_key=True, index=True)
    question_id = Column(Integer, ForeignKey("questions.id", ondelete="CASCADE"), nullable=False)
    option_text = Column(Text, nullable=False)
    is_correct = Column(Boolean, default=False, nullable=False)
    order_index = Column(Integer, default=0)

    # Relationships
    question = relationship("Question", back_populates="options")

    def __repr__(self):
        return f"<Option {self.id} for Q{self.question_id}: {self.is_correct}>"


class ExamQuestion(Base):
    __tablename__ = "exam_questions"

    id = Column(Integer, primary_key=True, index=True)
    exam_id = Column(Integer, ForeignKey("exams.id", ondelete="CASCADE"), nullable=False)
    question_id = Column(Integer, ForeignKey("questions.id", ondelete="CASCADE"), nullable=False)
    order_index = Column(Integer, default=0)

    # Relationships
    exam = relationship("Exam", back_populates="exam_questions")
    question = relationship("Question", back_populates="exam_links")
