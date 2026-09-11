from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from datetime import datetime
from app.schemas.question import QuestionAdminResponse, QuestionStudentResponse

class ExamBase(BaseModel):
    title: str
    subject: str
    description: Optional[str] = None
    instructions: Optional[str] = None
    duration_minutes: int = 60
    total_marks: float = 100.0
    passing_marks: float = 40.0
    negative_marking: bool = False
    negative_mark_value: float = 0.25
    randomize_questions: bool = False
    randomize_options: bool = False
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    status: str = "active"

class ExamCreate(ExamBase):
    question_ids: Optional[List[int]] = []

class ExamUpdate(BaseModel):
    title: Optional[str] = None
    subject: Optional[str] = None
    description: Optional[str] = None
    instructions: Optional[str] = None
    duration_minutes: Optional[int] = None
    total_marks: Optional[float] = None
    passing_marks: Optional[float] = None
    negative_marking: Optional[bool] = None
    negative_mark_value: Optional[float] = None
    randomize_questions: Optional[bool] = None
    randomize_options: Optional[bool] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    status: Optional[str] = None
    question_ids: Optional[List[int]] = None

class ExamAdminResponse(ExamBase):
    id: int
    created_by_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    question_count: int = 0
    attempt_count: int = 0

    model_config = ConfigDict(from_attributes=True)

class ExamStudentCardResponse(BaseModel):
    id: int
    title: str
    subject: str
    description: Optional[str] = None
    instructions: Optional[str] = None
    duration_minutes: int
    total_marks: float
    passing_marks: float
    negative_marking: bool
    negative_mark_value: float
    question_count: int = 0
    status: str
    user_attempt_status: Optional[str] = None  # None, "in_progress", "submitted"
    user_attempt_id: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)
