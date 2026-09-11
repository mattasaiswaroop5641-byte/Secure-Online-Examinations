from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo import ReturnDocument, ASCENDING, DESCENDING
from app.config import settings

class MongoDBManager:
    client: AsyncIOMotorClient = None
    db: AsyncIOMotorDatabase = None

db_manager = MongoDBManager()

async def connect_to_mongo():
    """Initializes async connection to MongoDB Atlas / Local MongoDB."""
    if db_manager.client is not None:
        return
    print(f"[MongoDB] Connecting to MongoDB at: {settings.MONGO_URI} ...")
    db_manager.client = AsyncIOMotorClient(
        settings.MONGO_URI,
        serverSelectionTimeoutMS=5000
    )
    db_manager.db = db_manager.client[settings.MONGO_DB_NAME]
    
    # Ping database to verify connection
    try:
        await db_manager.client.admin.command('ping')
        print(f"[MongoDB] Successfully connected to database: '{settings.MONGO_DB_NAME}'")
        await init_db_indexes(db_manager.db)
    except Exception as e:
        print(f"[MongoDB Warning] Could not reach MongoDB cluster: {e}")
        print("[MongoDB Warning] Make sure MONGO_URI is set correctly in .env and network access is permitted.")

async def close_mongo_connection():
    """Closes MongoDB connection pool."""
    if db_manager.client:
        try:
            db_manager.client.close()
        except Exception:
            pass
        db_manager.client = None
        db_manager.db = None
        print("[MongoDB] Connection closed.")


def get_database() -> AsyncIOMotorDatabase:
    """FastAPI dependency for accessing the database."""
    return db_manager.db

async def get_next_sequence(name: str, db: AsyncIOMotorDatabase = None) -> int:
    """
    Atomic integer counter generator to provide incremental IDs for users, exams,
    questions, attempts, and incidents, ensuring 100% frontend API compatibility.
    """
    if db is None:
        db = db_manager.db
        
    counter = await db["counters"].find_one_and_update(
        {"_id": name},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=ReturnDocument.AFTER
    )
    return counter["seq"]

async def init_db_indexes(db: AsyncIOMotorDatabase):
    """Initializes required unique and search indexes on MongoDB collections."""
    try:
        # Users
        await db["users"].create_index([("email", ASCENDING)], unique=True)
        await db["users"].create_index([("student_id", ASCENDING)], sparse=True)
        await db["users"].create_index([("id", ASCENDING)], unique=True)
        
        # Exams
        await db["exams"].create_index([("id", ASCENDING)], unique=True)
        await db["exams"].create_index([("status", ASCENDING)])
        
        # Questions
        await db["questions"].create_index([("id", ASCENDING)], unique=True)
        await db["questions"].create_index([("subject", ASCENDING)])
        
        # Attempts
        await db["attempts"].create_index([("id", ASCENDING)], unique=True)
        await db["attempts"].create_index([("exam_id", ASCENDING), ("student_id", ASCENDING)])
        await db["attempts"].create_index([("status", ASCENDING)])
        
        # Proctoring Incidents
        await db["proctoring_incidents"].create_index([("id", ASCENDING)], unique=True)
        await db["proctoring_incidents"].create_index([("attempt_id", ASCENDING)])
        
        print("[MongoDB] Database indexes initialized successfully.")
    except Exception as e:
        print(f"[MongoDB Warning] Index initialization notice: {e}")
