from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path

from app.config import settings
from app.mongodb import connect_to_mongo, close_mongo_connection
from app.routers import (
    auth_router,
    exams_router,
    questions_router,
    attempts_router,
    proctoring_router,
    analytics_router,
    admin_db_router
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Connect to MongoDB Atlas / Local cluster
    await connect_to_mongo()
    yield
    # Shutdown: Close database connection pool
    await close_mongo_connection()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.PROJECT_VERSION,
    description="ExamShield - Secure Online Examination System with Continuous Face Proctoring API (MongoDB Atlas)",
    lifespan=lifespan
)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount evidence snapshots upload directory as static files
uploads_path = settings.UPLOAD_DIR
uploads_path.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(uploads_path)), name="uploads")
app.mount("/api/uploads", StaticFiles(directory=str(uploads_path)), name="api_uploads")


# Include Routers
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(exams_router, prefix=settings.API_V1_STR)
app.include_router(questions_router, prefix=settings.API_V1_STR)
app.include_router(attempts_router, prefix=settings.API_V1_STR)
app.include_router(proctoring_router, prefix=settings.API_V1_STR)
app.include_router(analytics_router, prefix=settings.API_V1_STR)
app.include_router(admin_db_router, prefix=settings.API_V1_STR)

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "system": "ExamShield Proctoring API",
        "database": "MongoDB Atlas",
        "version": settings.PROJECT_VERSION
    }

@app.get("/")
def root():
    return {
        "message": "Welcome to ExamShield API powered by MongoDB Atlas. Visit /docs for OpenAPI Swagger documentation.",
        "version": settings.PROJECT_VERSION
    }
