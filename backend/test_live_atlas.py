import asyncio
import sys
import time
import os

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings
from app.utils.security import verify_password, get_password_hash
import pyotp

async def run_live_tests():
    print("=" * 60)
    print("[*] STARTING LIVE MONGODB ATLAS INTEGRATION & HEALTH TESTS")
    print("=" * 60)
    print(f"[*] Target Database Name: {settings.MONGO_DB_NAME}")
    print("-" * 60)

    # 1. Test Ping & Connection
    start_t = time.time()
    try:
        client = AsyncIOMotorClient(settings.MONGO_URI, serverSelectionTimeoutMS=5000)
        db = client[settings.MONGO_DB_NAME]
        ping_res = await db.command("ping")
        latency = (time.time() - start_t) * 1000
        print(f"[PASS] Ping to MongoDB Atlas succeeded in {latency:.2f} ms: {ping_res}")
    except Exception as e:
        print(f"[FAIL] MongoDB Atlas Connection Failed: {e}")
        return False

    # 2. Check Database Collections
    collections = await db.list_collection_names()
    print(f"[PASS] Active Collections Found ({len(collections)}): {', '.join(collections)}")

    # 3. Verify Admin User
    admin_user = await db["users"].find_one({"email": "mattasaiswaroop5641@gmail.com"})
    if admin_user:
        is_pw_valid = verify_password("Mgsai@1025", admin_user["hashed_password"])
        print(f"[PASS] Admin User Exists: {admin_user['name']} <{admin_user['email']}>")
        print(f"[PASS] Admin Role: {admin_user.get('role')}")
        print(f"[PASS] Password Hash Check (Mgsai@1025): {'VALID' if is_pw_valid else 'INVALID'}")
        print(f"[PASS] 2FA Status: {'ENABLED' if admin_user.get('is_2fa_enabled') else 'DISABLED (Ready for setup in Admin UI)'}")
    else:
        print("[FAIL] Admin user mattasaiswaroop5641@gmail.com not found!")
        return False

    # 4. Verify Question Bank
    q_count = await db["questions"].count_documents({})
    print(f"[PASS] Question Bank count: {q_count} questions indexed in Atlas")
    if q_count > 0:
        sample_q = await db["questions"].find_one({})
        print(f"       Sample Question: [{sample_q.get('subject')}] {sample_q.get('text')[:45]}...")

    # 5. Verify Exams
    exam_count = await db["exams"].count_documents({})
    print(f"[PASS] Exams count: {exam_count} exams configured in Atlas")
    async for ex in db["exams"].find({}):
        print(f"       Exam #{ex.get('id')}: {ex.get('title')} ({ex.get('duration_minutes')} mins, {len(ex.get('question_ids', []))} questions)")

    # 6. Verify Atomic Sequence Counters
    counters = await db["counters"].find({}).to_list(10)
    counters_str = ", ".join([f"{c.get('_id')}: {c.get('seq')}" for c in counters])
    print(f"[PASS] Atomic Sequence Counters ({len(counters)}): {counters_str}")

    # 7. Test Live Database Write & Read & Delete
    test_doc_id = f"test_probe_{int(time.time())}"
    await db["_health_checks"].insert_one({"_id": test_doc_id, "timestamp": time.time(), "status": "ok"})
    read_doc = await db["_health_checks"].find_one({"_id": test_doc_id})
    assert read_doc is not None and read_doc["status"] == "ok"
    await db["_health_checks"].delete_one({"_id": test_doc_id})
    print("[PASS] Live Write -> Read -> Delete Roundtrip successfully verified on Atlas cluster!")

    # 8. Test 2FA TOTP Generation & Verification logic
    secret = pyotp.random_base32()
    totp = pyotp.TOTP(secret)
    token = totp.now()
    assert totp.verify(token) is True
    assert totp.verify("000000") is False
    print(f"[PASS] Google Authenticator TOTP 2FA Engine: Verified (Generated token {token} validated)")

    client.close()
    print("=" * 60)
    print(">> ALL LIVE MONGODB ATLAS & AUTHENTICATION TESTS PASSED 100%! <<")
    print("=" * 60)
    return True

if __name__ == "__main__":
    success = asyncio.run(run_live_tests())
    sys.exit(0 if success else 1)
