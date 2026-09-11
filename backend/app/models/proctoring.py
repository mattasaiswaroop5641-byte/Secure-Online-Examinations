from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.database import Base

class ProctoringEvent(Base):
    __tablename__ = "proctoring_events"

    id = Column(Integer, primary_key=True, index=True)
    attempt_id = Column(Integer, ForeignKey("exam_attempts.id", ondelete="CASCADE"), nullable=False)
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    # Event Types:
    # NO_FACE_DETECTED, MULTIPLE_FACES_DETECTED, FACE_OUT_OF_FRAME,
    # LOOKING_AWAY, TAB_SWITCH, FULLSCREEN_EXIT, CAMERA_DISCONNECTED, DEVTOOLS_SUSPECT
    event_type = Column(String(50), index=True, nullable=False)
    
    # Severity: LOW, MEDIUM, HIGH, CRITICAL
    severity = Column(String(20), default="MEDIUM", nullable=False)
    
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    duration_seconds = Column(Float, default=0.0)
    description = Column(Text, nullable=True)
    screenshot_path = Column(String(255), nullable=True)
    resolved = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    attempt = relationship("ExamAttempt", back_populates="proctoring_events")
    student = relationship("User", back_populates="proctoring_events")

    def __repr__(self):
        return f"<ProctoringEvent {self.id}: {self.event_type} [{self.severity}]>"


class SystemSetting(Base):
    __tablename__ = "system_settings"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(100), unique=True, index=True, nullable=False)
    value = Column(Text, nullable=False)
    description = Column(Text, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f"<SystemSetting {self.key}={self.value}>"
