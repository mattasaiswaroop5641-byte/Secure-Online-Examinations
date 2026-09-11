from pydantic import BaseModel, ConfigDict
from typing import List, Optional, Dict, Any
from datetime import datetime
from app.schemas.question import QuestionStudentResponse

class SaveAnswerRequest(BaseModel):
    question_id: int
    selected_option_id: Optional[int] = None
    is_marked_for_review: Optional[bool] = False

class AnswerState(BaseModel):
    question_id: int
    selected_option_id: Optional[int] = None
    is_marked_for_review: bool = False

class StartExamResponse(BaseModel):
    attempt_id: int
    exam_id: int
    exam_title: str
    duration_minutes: int
    start_time: datetime
    end_time: datetime
    remaining_seconds: int
    total_questions: int
    questions: List[QuestionStudentResponse]
    current_answers: Dict[int, AnswerState]  # question_id -> state

class TimeRemainingResponse(BaseModel):
    attempt_id: int
    remaining_seconds: int
    is_expired: bool
    status: str

class QuestionAnalysisItem(BaseModel):
    question_id: int
    question_text: str
    subject: str
    difficulty: str
    marks: float
    negative_marks: float
    explanation: Optional[str] = None
    options: List[Dict[str, Any]]
    selected_option_id: Optional[int] = None
    correct_option_id: Optional[int] = None
    is_correct: bool
    marks_awarded: float
    is_marked_for_review: bool

class AttemptResultResponse(BaseModel):
    attempt_id: int
    exam_id: int
    exam_title: str
    student_id: int
    student_name: str
    student_email: str
    status: str
    start_time: datetime
    submitted_at: Optional[datetime] = None
    time_spent_seconds: int
    
    score: float
    total_possible_marks: float
    percentage: float
    is_passed: bool
    passing_marks: float
    
    total_questions: int
    correct_count: int
    incorrect_count: int
    unanswered_count: int
    marked_for_review_count: int
    
    proctoring_score: float
    violation_count: int
    proctoring_status: str  # Normal, Warning, Suspicious
    
    questions: Optional[List[QuestionAnalysisItem]] = None

    model_config = ConfigDict(from_attributes=True)

class AttemptSummaryAdmin(BaseModel):
    id: int
    exam_id: int
    exam_title: str
    student_id: int
    student_name: str
    student_email: str
    student_code: Optional[str] = None
    status: str
    start_time: datetime
    submitted_at: Optional[datetime] = None
    time_spent_seconds: int
    score: float
    total_possible_marks: float
    percentage: float
    is_passed: bool
    proctoring_score: float
    violation_count: int

    model_config = ConfigDict(from_attributes=True)
