from app.routers.auth import router as auth_router
from app.routers.questions import router as questions_router
from app.routers.exams import router as exams_router
from app.routers.attempts import router as attempts_router
from app.routers.proctoring import router as proctoring_router
from app.routers.analytics import router as analytics_router
from app.routers.admin_db import router as admin_db_router

__all__ = [
    "auth_router",
    "questions_router",
    "exams_router",
    "attempts_router",
    "proctoring_router",
    "analytics_router",
    "admin_db_router"
]
