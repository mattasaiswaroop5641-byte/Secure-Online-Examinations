import os
import cv2
import numpy as np
from datetime import datetime, timedelta
from pymongo import MongoClient, ASCENDING
from app.utils.security import get_password_hash
from app.config import settings

def create_synthetic_evidence_image(event_type: str, severity: str, timestamp_str: str) -> str:
    """Generates a realistic forensic evidence snapshot image with synthetic candidate and CV annotations."""
    settings.EVIDENCE_DIR.mkdir(parents=True, exist_ok=True)
    img = np.zeros((480, 640, 3), dtype=np.uint8)
    img[:] = (35, 30, 30)

    cv2.circle(img, (320, 240), 90, (180, 150, 140), -1)
    cv2.ellipse(img, (320, 430), (160, 140), 0, 0, 180, (80, 60, 50), -1)

    if event_type == "LOOKING_AWAY":
        cv2.circle(img, (270, 230), 10, (255, 255, 255), -1)
        cv2.circle(img, (265, 230), 4, (40, 40, 40), -1)
        cv2.circle(img, (330, 230), 10, (255, 255, 255), -1)
        cv2.circle(img, (325, 230), 4, (40, 40, 40), -1)
    elif event_type != "NO_FACE_DETECTED":
        cv2.circle(img, (285, 230), 10, (255, 255, 255), -1)
        cv2.circle(img, (285, 230), 5, (50, 50, 50), -1)
        cv2.circle(img, (355, 230), 10, (255, 255, 255), -1)
        cv2.circle(img, (355, 230), 5, (50, 50, 50), -1)

    if event_type == "MULTIPLE_FACES_DETECTED":
        cv2.circle(img, (510, 210), 60, (160, 140, 130), -1)
        cv2.rectangle(img, (440, 140), (580, 290), (0, 0, 255), 2)
        cv2.putText(img, "Face #2 (Secondary)", (445, 135), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 0, 255), 1)

    if event_type == "NO_FACE_DETECTED":
        img[:] = (25, 25, 25)
        cv2.putText(img, "[EMPTY DESK - NO CANDIDATE VISIBLE]", (140, 240), cv2.FONT_HERSHEY_SIMPLEX, 0.65, (0, 0, 255), 2)
    else:
        box_col = (0, 0, 255) if severity in ["HIGH", "CRITICAL"] else (0, 165, 255)
        cv2.rectangle(img, (210, 130), (430, 360), box_col, 2)
        cv2.putText(img, f"Face #1 [{event_type}]", (215, 125), cv2.FONT_HERSHEY_SIMPLEX, 0.5, box_col, 1)

    cv2.rectangle(img, (0, 0), (640, 32), (15, 15, 15), -1)
    banner = f"[ExamShield Audit] {event_type} | Severity: {severity} | {timestamp_str}"
    cv2.putText(img, banner, (12, 22), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (230, 230, 230), 1, cv2.LINE_AA)

    filename = f"sample_{event_type.lower()}_{severity.lower()}.jpg"
    filepath = settings.EVIDENCE_DIR / filename
    cv2.imwrite(str(filepath), img)
    return f"/uploads/evidence/{filename}"

def seed_database():
    """Seeds the MongoDB Atlas / Local database with default users, questions, exams, and demo attempts."""
    try:
        client = MongoClient(settings.MONGO_URI, serverSelectionTimeoutMS=5000)
        db = client[settings.MONGO_DB_NAME]
        client.admin.command('ping')
    except Exception as e:
        print(f"[MongoDB Seed Notice] Unable to connect to MongoDB ({e}). Skipping seeding.")
        return

    # Ensure the requested admin account exists
    admin_exists = db["users"].find_one({"email": "mattasaiswaroop5641@gmail.com"})
    if not admin_exists:
        db["users"].insert_one({
            "id": 1,
            "name": "Sai Swaroop (Admin)",
            "email": "mattasaiswaroop5641@gmail.com",
            "student_id": "EMP-ADM-01",
            "hashed_password": get_password_hash("Mgsai@1025"),
            "role": "admin",
            "is_active": True,
            "is_2fa_enabled": False,
            "two_factor_secret": None,
            "created_at": datetime.utcnow()
        })
        print("[OK] Admin account 'mattasaiswaroop5641@gmail.com' created successfully.")
    else:
        db["users"].update_one(
            {"email": "mattasaiswaroop5641@gmail.com"},
            {"$set": {
                "hashed_password": get_password_hash("Mgsai@1025"),
                "role": "admin",
                "is_active": True
            }}
        )
        print("[OK] Admin account 'mattasaiswaroop5641@gmail.com' credentials updated.")

    # Check if questions/exams already seeded
    if db["questions"].count_documents({}) > 0:
        print("[MongoDB] Database already contains records. Skipping initial seeding.")
        return

    print("--- Starting ExamShield MongoDB Seeding ---")

    now = datetime.utcnow()

    # 1. Users
    users_data = [
        {
            "id": 1,
            "name": "Sai Swaroop (Admin)",
            "email": "mattasaiswaroop5641@gmail.com",
            "student_id": "EMP-ADM-01",
            "hashed_password": get_password_hash("Mgsai@1025"),
            "role": "admin",
            "is_active": True,
            "created_at": now
        },
        {
            "id": 2,
            "name": "Prof. Marcus Sterling",
            "email": "examiner@example.com",
            "student_id": "FAC-CS-402",
            "hashed_password": get_password_hash("Examiner@123"),
            "role": "examiner",
            "is_active": True,
            "created_at": now
        },
        {
            "id": 3,
            "name": "Alex Chen",
            "email": "student@example.com",
            "student_id": "STU-2026-9812",
            "hashed_password": get_password_hash("Student@123"),
            "role": "student",
            "is_active": True,
            "created_at": now
        },
        {
            "id": 4,
            "name": "Sophia Rodriguez",
            "email": "sophia@example.com",
            "student_id": "STU-2026-4401",
            "hashed_password": get_password_hash("Student@123"),
            "role": "student",
            "is_active": True,
            "created_at": now
        }
    ]
    for u in users_data:
        if not db["users"].find_one({"email": u["email"]}):
            db["users"].insert_one(u)
    print("[OK] Seeded starter user accounts.")

    # 2. Comprehensive Question Bank
    raw_questions = [
        # Data Structures & Algorithms
        {
            "subject": "Data Structures & Algorithms",
            "text": "What is the worst-case time complexity of searching for an element in a balanced Binary Search Tree (AVL or Red-Black Tree) with n nodes?",
            "difficulty": "medium",
            "marks": 2.0,
            "negative_marks": 0.5,
            "explanation": "Balanced binary search trees maintain a maximum height proportional to O(log n), guaranteeing O(log n) worst-case search, insertion, and deletion time.",
            "options": [
                ("O(1)", False),
                ("O(log n)", True),
                ("O(n)", False),
                ("O(n log n)", False)
            ]
        },
        {
            "subject": "Data Structures & Algorithms",
            "text": "Which of the following sorting algorithms is NOT stable in its standard textbook implementation?",
            "difficulty": "medium",
            "marks": 2.0,
            "negative_marks": 0.5,
            "explanation": "Standard Quicksort can swap non-adjacent identical keys across the pivot partition, making it unstable without artificial tie-breakers.",
            "options": [
                ("Merge Sort", False),
                ("Insertion Sort", False),
                ("Quick Sort", True),
                ("Bubble Sort", False)
            ]
        },
        {
            "subject": "Data Structures & Algorithms",
            "text": "What data structure is typically used to implement Breadth-First Search (BFS) graph traversal?",
            "difficulty": "easy",
            "marks": 1.0,
            "negative_marks": 0.25,
            "explanation": "BFS explores vertices level by level, requiring a FIFO (First-In, First-Out) Queue data structure.",
            "options": [
                ("Stack", False),
                ("Queue", True),
                ("Priority Queue", False),
                ("Disjoint Set", False)
            ]
        },
        {
            "subject": "Data Structures & Algorithms",
            "text": "In dynamic programming, what is the core difference between Memoization and Tabulation?",
            "difficulty": "hard",
            "marks": 3.0,
            "negative_marks": 0.5,
            "explanation": "Memoization is top-down recursion with caching of subproblem solutions, whereas tabulation is bottom-up iterative table filling.",
            "options": [
                ("Memoization is top-down recursive caching; Tabulation is bottom-up iterative table filling", True),
                ("Tabulation uses recursive trees while memoization uses matrices", False),
                ("Memoization consumes O(1) auxiliary memory while tabulation consumes exponential space", False),
                ("There is no technical difference; they are synonymous terms", False)
            ]
        },
        {
            "subject": "Data Structures & Algorithms",
            "text": "What is the space complexity of Depth-First Search (DFS) on a tree of maximum depth d?",
            "difficulty": "easy",
            "marks": 1.0,
            "negative_marks": 0.25,
            "explanation": "DFS only maintains the current path from root to current node on the call stack, which is bounded by O(d).",
            "options": [
                ("O(1)", False),
                ("O(d)", True),
                ("O(2^d)", False),
                ("O(d^2)", False)
            ]
        },
        {
            "subject": "Data Structures & Algorithms",
            "text": "Which algorithm computes single-source shortest paths in a directed graph with non-negative edge weights?",
            "difficulty": "easy",
            "marks": 1.0,
            "negative_marks": 0.25,
            "explanation": "Dijkstra's algorithm uses a priority queue to find shortest paths efficiently when all edge weights are >= 0.",
            "options": [
                ("Dijkstra's Algorithm", True),
                ("Kruskal's Algorithm", False),
                ("Floyd-Warshall Algorithm", False),
                ("Prim's Algorithm", False)
            ]
        },
        {
            "subject": "Data Structures & Algorithms",
            "text": "What is the amortized time complexity of inserting an item into a dynamic hash table with linear probing when the load factor is kept below 0.7?",
            "difficulty": "medium",
            "marks": 2.0,
            "negative_marks": 0.5,
            "explanation": "With a good uniform hash function and load factor < 0.7, expected search and insert operations run in O(1) amortized time.",
            "options": [
                ("O(1)", True),
                ("O(log n)", False),
                ("O(n)", False),
                ("O(n^2)", False)
            ]
        },
        {
            "subject": "Data Structures & Algorithms",
            "text": "What is the minimum number of comparisons needed in the worst-case to sort 4 elements using a comparison-based sort?",
            "difficulty": "hard",
            "marks": 3.0,
            "negative_marks": 0.5,
            "explanation": "Ceil(log2(4!)) = Ceil(log2(24)) = Ceil(4.58) = 5 comparisons.",
            "options": [
                ("4", False),
                ("5", True),
                ("6", False),
                ("8", False)
            ]
        },

        # Cybersecurity & Network Defense
        {
            "subject": "Cybersecurity & Network Defense",
            "text": "Which cryptographic principle states that a cryptosystem should remain secure even if everything about the system, except the key, is public knowledge?",
            "difficulty": "easy",
            "marks": 1.0,
            "negative_marks": 0.25,
            "explanation": "Kerckhoffs's principle dictates that security should rely on secrecy of key, not obscurity of algorithm.",
            "options": [
                ("Kerckhoffs's Principle", True),
                ("Needham-Schroeder Theorem", False),
                ("Diffie-Hellman Law", False),
                ("Shannon's Expansion", False)
            ]
        },
        {
            "subject": "Cybersecurity & Network Defense",
            "text": "In asymmetric public-key cryptography, which key is used by the sender to encrypt a confidential message destined for a receiver named Bob?",
            "difficulty": "easy",
            "marks": 1.0,
            "negative_marks": 0.25,
            "explanation": "To ensure only Bob can decrypt the message, the sender encrypts it using Bob's public key.",
            "options": [
                ("Bob's Public Key", True),
                ("Bob's Private Key", False),
                ("Sender's Private Key", False),
                ("Sender's Public Key", False)
            ]
        },
        {
            "subject": "Cybersecurity & Network Defense",
            "text": "Which HTTP security header mitigates Cross-Site Scripting (XSS) by restricting the domains from which scripts, styles, and images can be executed?",
            "difficulty": "medium",
            "marks": 2.0,
            "negative_marks": 0.5,
            "explanation": "Content-Security-Policy (CSP) allows server operators to declare authorized script and resource sources.",
            "options": [
                ("Content-Security-Policy", True),
                ("X-Frame-Options", False),
                ("Strict-Transport-Security", False),
                ("Access-Control-Allow-Origin", False)
            ]
        },
        {
            "subject": "Cybersecurity & Network Defense",
            "text": "What type of attack involves an adversary intercepting and potentially altering communications between two parties who believe they are communicating directly?",
            "difficulty": "easy",
            "marks": 1.0,
            "negative_marks": 0.25,
            "explanation": "A Man-in-the-Middle (MitM) attack occurs when an attacker positions themselves between client and server.",
            "options": [
                ("Man-in-the-Middle (MitM)", True),
                ("SQL Injection", False),
                ("Buffer Overflow", False),
                ("SYN Flood", False)
            ]
        },
        {
            "subject": "Cybersecurity & Network Defense",
            "text": "What defense mechanism specifically guards against Cross-Site Request Forgery (CSRF) in state-changing web requests?",
            "difficulty": "medium",
            "marks": 2.0,
            "negative_marks": 0.5,
            "explanation": "Anti-CSRF synchronizer tokens prevent unauthorized sites from submitting authentic requests using victim session cookies.",
            "options": [
                ("Unique cryptographic anti-CSRF token verified per session/form", True),
                ("SSL/TLS certificate pinning alone", False),
                ("Base64 URL parameter encoding", False),
                ("Client-side JavaScript form validators", False)
            ]
        },
        {
            "subject": "Cybersecurity & Network Defense",
            "text": "Which port does HTTPS default to for secure transport layer communications?",
            "difficulty": "easy",
            "marks": 1.0,
            "negative_marks": 0.25,
            "explanation": "Standard unencrypted HTTP runs on port 80, whereas HTTPS runs on TCP port 443.",
            "options": [
                ("443", True),
                ("80", False),
                ("8080", False),
                ("22", False)
            ]
        },
        {
            "subject": "Cybersecurity & Network Defense",
            "text": "In symmetric block cipher encryption modes, why is Electronic Codebook (ECB) mode considered fundamentally insecure for encrypting structured data?",
            "difficulty": "hard",
            "marks": 3.0,
            "negative_marks": 0.5,
            "explanation": "ECB encrypts identical plaintext blocks into identical ciphertext blocks, preserving visual and structural patterns.",
            "options": [
                ("Identical plaintext blocks produce identical ciphertext blocks, exposing patterns", True),
                ("It does not support 256-bit keys", False),
                ("It requires an asymmetric RSA private key exchange", False),
                ("It runs exponentially slower than CBC or GCM", False)
            ]
        },
        {
            "subject": "Cybersecurity & Network Defense",
            "text": "What is the purpose of adding a random cryptographic salt before hashing user passwords?",
            "difficulty": "medium",
            "marks": 2.0,
            "negative_marks": 0.5,
            "explanation": "Salting ensures identical passwords have distinct hashes and defeats precomputed lookup tables such as Rainbow Tables.",
            "options": [
                ("Defeats precomputed Rainbow Table lookups and ensures unique hashes for identical passwords", True),
                ("Reduces the CPU workload of hashing functions", False),
                ("Allows the administrator to reverse the hash back into plaintext", False),
                ("Compresses password length down to 16 bits", False)
            ]
        },

        # Web Architecture & Cloud Systems
        {
            "subject": "Web Architecture & Cloud",
            "text": "Which HTTP method is defined by RFC 7231 as idempotent and used to replace an entire resource representation?",
            "difficulty": "medium",
            "marks": 2.0,
            "negative_marks": 0.5,
            "explanation": "PUT is idempotent and replaces the target resource with the uploaded representation.",
            "options": [
                ("PUT", True),
                ("POST", False),
                ("PATCH", False),
                ("CONNECT", False)
            ]
        },
        {
            "subject": "Web Architecture & Cloud",
            "text": "According to Eric Brewer's CAP Theorem, a distributed database network partition (P) guarantees that the system can at most choose between:",
            "difficulty": "medium",
            "marks": 2.0,
            "negative_marks": 0.5,
            "explanation": "When a network partition (P) occurs, a distributed system must trade off between Consistency (C) and Availability (A).",
            "options": [
                ("Consistency vs Availability", True),
                ("Concurrency vs ACID Compliance", False),
                ("Throughput vs Latency", False),
                ("Partitioning vs Replication", False)
            ]
        },
        {
            "subject": "Web Architecture & Cloud",
            "text": "What database index structure is most commonly utilized by relational database systems (PostgreSQL, MySQL, SQLite) for B-tree indexed range scans?",
            "difficulty": "easy",
            "marks": 1.0,
            "negative_marks": 0.25,
            "explanation": "B+ Trees store all actual record keys in linked leaf nodes, facilitating fast ordered range queries and sequential scans.",
            "options": [
                ("B+ Tree", True),
                ("Hash Index", False),
                ("Inverted Index", False),
                ("Radix Trie", False)
            ]
        },
        {
            "subject": "Web Architecture & Cloud",
            "text": "In modern web application security, what does the 'HttpOnly' flag on a Set-Cookie header achieve?",
            "difficulty": "medium",
            "marks": 2.0,
            "negative_marks": 0.5,
            "explanation": "The HttpOnly flag blocks client-side scripts from accessing document.cookie, mitigating session theft via XSS.",
            "options": [
                ("Prevents JavaScript document.cookie access to mitigate XSS token theft", True),
                ("Ensures cookies are only sent over encrypted TLS connections", False),
                ("Restricts cookie transmission to first-party origins only", False),
                ("Forces the browser to encrypt the cookie content with AES-GCM", False)
            ]
        },
        {
            "subject": "Web Architecture & Cloud",
            "text": "What architectural pattern decouples asynchronous message producers from consumers using durable message brokers like Kafka or RabbitMQ?",
            "difficulty": "easy",
            "marks": 1.0,
            "negative_marks": 0.25,
            "explanation": "Publish-Subscribe (Pub/Sub) and event-driven architectures decouple producers and consumers asynchronously.",
            "options": [
                ("Publish-Subscribe (Pub/Sub)", True),
                ("Model-View-Controller (MVC)", False),
                ("Monolithic Shared Memory", False),
                ("Client-Server Polling", False)
            ]
        },
        {
            "subject": "Web Architecture & Cloud",
            "text": "What is the primary role of a Reverse Proxy (such as Nginx or Traefik) placed in front of backend application microservices?",
            "difficulty": "easy",
            "marks": 1.0,
            "negative_marks": 0.25,
            "explanation": "A reverse proxy handles SSL termination, load balancing, reverse routing, caching, and rate limiting for upstream services.",
            "options": [
                ("Load balancing, TLS termination, caching, and security routing", True),
                ("Executing database transactions across shards", False),
                ("Compiling JavaScript frontend bundles on the fly", False),
                ("Generating cryptographic JWT tokens for OAuth2", False)
            ]
        }
    ]

    opt_counter = 1
    questions_to_insert = []
    for q_idx, q in enumerate(raw_questions):
        q_id = q_idx + 1
        options = []
        for opt_idx, (opt_text, is_corr) in enumerate(q["options"]):
            options.append({
                "id": opt_counter,
                "option_text": opt_text,
                "is_correct": is_corr,
                "order_index": opt_idx
            })
            opt_counter += 1

        questions_to_insert.append({
            "id": q_id,
            "subject": q["subject"],
            "text": q["text"],
            "question_type": "mcq_single",
            "difficulty": q["difficulty"],
            "marks": q["marks"],
            "negative_marks": q["negative_marks"],
            "explanation": q["explanation"],
            "created_by_id": 2,
            "created_at": now,
            "options": options
        })

    db["questions"].insert_many(questions_to_insert)
    print(f"[OK] Seeded {len(questions_to_insert)} questions across multiple subjects.")

    # 3. Create Sample Exams
    all_q_ids = [q["id"] for q in questions_to_insert]
    dsa_q_ids = [q["id"] for q in questions_to_insert if q["subject"] == "Data Structures & Algorithms"]
    sec_q_ids = [q["id"] for q in questions_to_insert if q["subject"] == "Cybersecurity & Network Defense"]
    cloud_q_ids = [q["id"] for q in questions_to_insert if q["subject"] == "Web Architecture & Cloud"]

    exam1 = {
        "id": 1,
        "title": "Comprehensive Technical Assessment: CS Fundamentals & Security",
        "subject": "Computer Science & Cybersecurity",
        "description": "Comprehensive proctored assessment evaluating data structures, algorithmic complexity, cryptography, and modern cloud architectures.",
        "instructions": "Ensure you are in a quiet, well-lit environment. Maintain continuous face orientation toward the screen. Tab switches and secondary persons in the camera view are logged as forensic audit incidents.",
        "duration_minutes": 45,
        "total_marks": 36.0,
        "passing_marks": 15.0,
        "negative_marking": True,
        "negative_mark_value": 0.25,
        "randomize_questions": True,
        "randomize_options": True,
        "start_time": now - timedelta(days=1),
        "end_time": now + timedelta(days=30),
        "status": "active",
        "created_by_id": 2,
        "question_ids": all_q_ids[:15],
        "created_at": now,
        "updated_at": now
    }

    exam2 = {
        "id": 2,
        "title": "Data Structures & Algorithmic Complexity Midterm",
        "subject": "Data Structures & Algorithms",
        "description": "Rigorous evaluation covering trees, graph algorithms, asymptotic complexity, and dynamic programming.",
        "instructions": "Calculators are not permitted. Select the best single option for each question.",
        "duration_minutes": 30,
        "total_marks": 16.0,
        "passing_marks": 8.0,
        "negative_marking": False,
        "negative_mark_value": 0.0,
        "randomize_questions": False,
        "randomize_options": False,
        "start_time": now - timedelta(days=2),
        "end_time": now + timedelta(days=15),
        "status": "active",
        "created_by_id": 2,
        "question_ids": dsa_q_ids,
        "created_at": now,
        "updated_at": now
    }

    exam3 = {
        "id": 3,
        "title": "Cloud Systems & Network Security Final",
        "subject": "Web Architecture & Cloud",
        "description": "Final exam covering distributed databases, CAP theorem, web protocols, and zero-trust security.",
        "instructions": "Proctored arena requires active webcam and fullscreen mode.",
        "duration_minutes": 30,
        "total_marks": 14.0,
        "passing_marks": 7.0,
        "negative_marking": True,
        "negative_mark_value": 0.5,
        "randomize_questions": True,
        "randomize_options": False,
        "start_time": now - timedelta(days=5),
        "end_time": now + timedelta(days=20),
        "status": "active",
        "created_by_id": 2,
        "question_ids": cloud_q_ids + sec_q_ids[:2],
        "created_at": now,
        "updated_at": now
    }

    db["exams"].insert_many([exam1, exam2, exam3])
    print("[OK] Seeded 3 pre-configured examinations.")

    # 4. Create Demo Attempt with Proctoring Incidents for Alex Chen
    demo_answers = []
    for qid in exam2["question_ids"][:6]:
        q_doc = next(q for q in questions_to_insert if q["id"] == qid)
        corr_opt = next(opt["id"] for opt in q_doc["options"] if opt["is_correct"])
        demo_answers.append({
            "question_id": qid,
            "selected_option_id": corr_opt,
            "is_marked_for_review": False,
            "is_correct": True,
            "marks_awarded": float(q_doc["marks"]),
            "answered_at": now - timedelta(minutes=15)
        })

    demo_attempt = {
        "id": 1,
        "exam_id": 2,
        "student_id": 3,
        "start_time": now - timedelta(minutes=25),
        "end_time": now + timedelta(minutes=5),
        "submitted_at": now - timedelta(minutes=5),
        "time_spent_seconds": 1200,
        "status": "submitted",
        "score": 11.0,
        "total_possible_marks": 16.0,
        "percentage": 68.75,
        "is_passed": True,
        "proctoring_score": 92.0,
        "violation_count": 2,
        "answers": demo_answers,
        "created_at": now - timedelta(minutes=25)
    }
    db["attempts"].insert_one(demo_attempt)

    # 5. Proctoring Events
    img1 = create_synthetic_evidence_image("LOOKING_AWAY", "MEDIUM", (now - timedelta(minutes=18)).strftime("%Y-%m-%d %H:%M:%S UTC"))
    img2 = create_synthetic_evidence_image("TAB_SWITCH", "LOW", (now - timedelta(minutes=12)).strftime("%Y-%m-%d %H:%M:%S UTC"))

    incidents = [
        {
            "id": 1,
            "attempt_id": 1,
            "student_id": 3,
            "event_type": "LOOKING_AWAY",
            "severity": "MEDIUM",
            "timestamp": now - timedelta(minutes=18),
            "duration_seconds": 4.2,
            "description": "Gaze tracking detected sustained attention shift away from exam arena.",
            "screenshot_path": img1,
            "resolved": False,
            "created_at": now - timedelta(minutes=18)
        },
        {
            "id": 2,
            "attempt_id": 1,
            "student_id": 3,
            "event_type": "TAB_SWITCH",
            "severity": "LOW",
            "timestamp": now - timedelta(minutes=12),
            "duration_seconds": 1.5,
            "description": "Page visibility state changed: candidate switched window/tab.",
            "screenshot_path": img2,
            "resolved": True,
            "created_at": now - timedelta(minutes=12)
        }
    ]
    db["proctoring_incidents"].insert_many(incidents)

    # 6. Initialize Sequence Counters
    db["counters"].insert_many([
        {"_id": "user_id", "seq": 4},
        {"_id": "question_id", "seq": len(questions_to_insert)},
        {"_id": "option_id", "seq": opt_counter},
        {"_id": "exam_id", "seq": 3},
        {"_id": "attempt_id", "seq": 1},
        {"_id": "proctoring_event_id", "seq": 2}
    ])

    print("=== ExamShield MongoDB Seeding Completed Successfully ===")

if __name__ == "__main__":
    seed_database()
