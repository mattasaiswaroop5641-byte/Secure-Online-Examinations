from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from datetime import datetime

# --- Options ---
class OptionBase(BaseModel):
    option_text: str
    order_index: Optional[int] = 0

class OptionCreate(OptionBase):
    is_correct: bool = False

class OptionAdminResponse(OptionBase):
    id: int
    is_correct: bool

    model_config = ConfigDict(from_attributes=True)

class OptionStudentResponse(OptionBase):
    id: int
    # Note: NO is_correct returned to student during examination

    model_config = ConfigDict(from_attributes=True)


# --- Questions ---
class QuestionBase(BaseModel):
    subject: str
    text: str
    question_type: Optional[str] = "mcq_single"
    difficulty: Optional[str] = "medium"
    marks: Optional[float] = 1.0
    negative_marks: Optional[float] = 0.0
    explanation: Optional[str] = None

class QuestionCreate(QuestionBase):
    options: List[OptionCreate]

class QuestionUpdate(BaseModel):
    subject: Optional[str] = None
    text: Optional[str] = None
    difficulty: Optional[str] = None
    marks: Optional[float] = None
    negative_marks: Optional[float] = None
    explanation: Optional[str] = None
    options: Optional[List[OptionCreate]] = None

class QuestionAdminResponse(QuestionBase):
    id: int
    created_by_id: Optional[int] = None
    created_at: datetime
    options: List[OptionAdminResponse]

    model_config = ConfigDict(from_attributes=True)

class QuestionStudentResponse(BaseModel):
    id: int
    subject: str
    text: str
    question_type: str
    difficulty: str
    marks: float
    negative_marks: float
    order_index: Optional[int] = 0
    options: List[OptionStudentResponse]
    # Note: NO explanation or is_correct field

    model_config = ConfigDict(from_attributes=True)
