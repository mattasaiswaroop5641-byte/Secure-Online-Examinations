import os
import cv2
import numpy as np
from datetime import datetime, timedelta
from app.database import SessionLocal, engine, Base
from app.models.user import User
from app.models.exam import Exam
from app.models.question import Question, QuestionOption, ExamQuestion
from app.models.attempt import ExamAttempt, StudentAnswer
from app.models.proctoring import ProctoringEvent
from app.utils.security import get_password_hash
from app.config import settings

def create_synthetic_evidence_image(event_type: str, severity: str, timestamp_str: str) -> str:
    """Generates a realistic forensic evidence snapshot image with synthetic candidate and CV annotations."""
    # Create dark frame (640x480)
    img = np.zeros((480, 640, 3), dtype=np.uint8)
    img[:] = (35, 30, 30)  # Dark room background

    # Draw synthetic candidate silhouette
    cv2.circle(img, (320, 240), 90, (180, 150, 140), -1)  # Head
    cv2.ellipse(img, (320, 430), (160, 140), 0, 0, 180, (80, 60, 50), -1)  # Torso

    # Eyes & nose
    if event_type == "LOOKING_AWAY":
        # Shift eyes sideways to simulate gaze deviation
        cv2.circle(img, (270, 230), 10, (255, 255, 255), -1)
        cv2.circle(img, (265, 230), 4, (40, 40, 40), -1)
        cv2.circle(img, (330, 230), 10, (255, 255, 255), -1)
        cv2.circle(img, (325, 230), 4, (40, 40, 40), -1)
    elif event_type != "NO_FACE_DETECTED":
        # Centered eyes
        cv2.circle(img, (285, 230), 10, (255, 255, 255), -1)
        cv2.circle(img, (285, 230), 5, (50, 50, 50), -1)
        cv2.circle(img, (355, 230), 10, (255, 255, 255), -1)
        cv2.circle(img, (355, 230), 5, (50, 50, 50), -1)

    # If multiple faces detected, draw a second face in corner
    if event_type == "MULTIPLE_FACES_DETECTED":
        cv2.circle(img, (510, 210), 60, (160, 140, 130), -1)
        cv2.rectangle(img, (440, 140), (580, 290), (0, 0, 255), 2)
        cv2.putText(img, "Face #2 (Secondary)", (445, 135), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 0, 255), 1)

    if event_type == "NO_FACE_DETECTED":
        # Candidate absent
        img[:] = (25, 25, 25)
        cv2.putText(img, "[EMPTY DESK - NO CANDIDATE VISIBLE]", (140, 240), cv2.FONT_HERSHEY_SIMPLEX, 0.65, (0, 0, 255), 2)
    else:
        # Bounding box around primary face
        box_col = (0, 0, 255) if severity in ["HIGH", "CRITICAL"] else (0, 165, 255)
        cv2.rectangle(img, (210, 130), (430, 360), box_col, 2)
        cv2.putText(img, f"Face #1 [{event_type}]", (215, 125), cv2.FONT_HERSHEY_SIMPLEX, 0.5, box_col, 1)

    # Forensic top banner
    cv2.rectangle(img, (0, 0), (640, 32), (15, 15, 15), -1)
    banner = f"[ExamShield Audit] {event_type} | Severity: {severity} | {timestamp_str}"
    cv2.putText(img, banner, (12, 22), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (230, 230, 230), 1, cv2.LINE_AA)

    # Save to evidence dir
    filename = f"sample_{event_type.lower()}_{severity.lower()}.jpg"
    filepath = settings.EVIDENCE_DIR / filename
    cv2.imwrite(str(filepath), img)
    return f"/uploads/evidence/{filename}"

def seed_database():
    """Seeds the ExamShield database with default users, questions, exams, and demo attempts."""
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # Check if already seeded
        if db.query(User).count() > 0:
            print("Database already contains records. Skipping initial seeding.")
            return

        print("--- Starting ExamShield Database Seeding ---")

        # 1. Users
        admin_user = User(
            name="Dr. Eleanor Vance",
            email="admin@example.com",
            student_id="EMP-ADM-01",
            hashed_password=get_password_hash("Admin@123"),
            role="admin",
            is_active=True
        )
        examiner_user = User(
            name="Prof. Marcus Sterling",
            email="examiner@example.com",
            student_id="FAC-CS-402",
            hashed_password=get_password_hash("Examiner@123"),
            role="examiner",
            is_active=True
        )
        student_user = User(
            name="Alex Chen",
            email="student@example.com",
            student_id="STU-2026-9812",
            hashed_password=get_password_hash("Student@123"),
            role="student",
            is_active=True
        )
        student_user2 = User(
            name="Sophia Rodriguez",
            email="sophia@example.com",
            student_id="STU-2026-4401",
            hashed_password=get_password_hash("Student@123"),
            role="student",
            is_active=True
        )
        db.add_all([admin_user, examiner_user, student_user, student_user2])
        db.flush()
        print("[OK] Created default users: admin@example.com, examiner@example.com, student@example.com")

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
            {
                "subject": "Data Structures & Algorithms",
                "text": "A Min-Heap is a complete binary tree where each node is less than or equal to its children. What is the time complexity of deleting the minimum element?",
                "difficulty": "medium",
                "marks": 2.0,
                "negative_marks": 0.5,
                "explanation": "Deleting the root requires swapping with the last leaf and sifting down, which takes time proportional to the height O(log n).",
                "options": [
                    ("O(1)", False),
                    ("O(log n)", True),
                    ("O(n)", False),
                    ("O(n log n)", False)
                ]
            },
            {
                "subject": "Data Structures & Algorithms",
                "text": "What is the primary advantage of a B-Tree over a standard Binary Search Tree for database storage engines?",
                "difficulty": "medium",
                "marks": 2.0,
                "negative_marks": 0.5,
                "explanation": "B-Trees have high branching factors (wide nodes), reducing the tree height and drastically minimizing disk/block I/O operations.",
                "options": [
                    ("High branching factor minimizes disk block reads and page faults", True),
                    ("B-Trees require zero memory allocation", False),
                    ("B-Trees perform sorting in O(n) worst-case time", False),
                    ("B-Trees eliminate the need for index locks", False)
                ]
            },

            # Cybersecurity & Network Security
            {
                "subject": "Cybersecurity & Network Defense",
                "text": "Which cryptographic principle states that a cryptosystem should remain secure even if everything about the system, except the key, is public knowledge?",
                "difficulty": "easy",
                "marks": 1.0,
                "negative_marks": 0.25,
                "explanation": "Kerckhoffs's principle (and Shannon's maxim 'the enemy knows the system') dictates that security should rely on secrecy of key, not obscurity of algorithm.",
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
                "explanation": "To ensure only Bob can decrypt the message, the sender encrypts it using Bob's public key. Bob decrypts it with his private key.",
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
                "explanation": "Anti-CSRF synchronizer tokens (and SameSite cookie policies) prevent unauthorized sites from submitting authentic requests using victim session cookies.",
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
                "explanation": "ECB encrypts identical plaintext blocks into identical ciphertext blocks, preserving visual and structural patterns (as famously illustrated by the ECB Penguin).",
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
                "explanation": "PUT is idempotent and replaces the target resource with the uploaded representation. POST is not required to be idempotent.",
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
                "explanation": "When a network partition (P) inevitably occurs, a distributed system must trade off between Consistency (C) and Availability (A).",
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
                    ("Load balancing, SSL termination, and routing incoming requests to upstream servers", True),
                    ("Executing backend business logic directly in the kernel", False),
                    ("Acting as the primary SQL query optimizer", False),
                    ("Replacing application code with WebAssembly bundles", False)
                ]
            }
        ]

        created_questions = []
        for q_data in raw_questions:
            q = Question(
                subject=q_data["subject"],
                text=q_data["text"],
                question_type="mcq_single",
                difficulty=q_data["difficulty"],
                marks=q_data["marks"],
                negative_marks=q_data["negative_marks"],
                explanation=q_data["explanation"],
                created_by_id=examiner_user.id
            )
            db.add(q)
            db.flush()

            for idx, (opt_text, is_corr) in enumerate(q_data["options"]):
                opt = QuestionOption(
                    question_id=q.id,
                    option_text=opt_text,
                    is_correct=is_corr,
                    order_index=idx
                )
                db.add(opt)
            created_questions.append(q)

        db.flush()
        print(f"[OK] Seeded {len(created_questions)} technical questions with options and explanations")

        # 3. Create Sample Examinations
        # Exam 1: Computer Science & Data Structures Qualifying Exam
        ds_questions = [q for q in created_questions if q.subject == "Data Structures & Algorithms"]
        exam1 = Exam(
            title="Computer Science & Data Structures Qualifying Exam",
            subject="Computer Science",
            description="Comprehensive qualification exam testing proficiency in asymptotic analysis, balanced tree structures, graph traversal, and dynamic programming.",
            instructions="""1. Maintain your webcam activated at all times during the examination.
2. Fullscreen mode is enforced; exiting fullscreen or switching tabs will be recorded as a violation.
3. Ensure adequate lighting with your face centered inside the frame.
4. Answering is auto-saved in real-time. Unanswered questions do not incur negative marks.
5. Review questions before final submission.""",
            duration_minutes=30,
            total_marks=float(sum(q.marks for q in ds_questions)),
            passing_marks=10.0,
            negative_marking=True,
            negative_mark_value=0.25,
            randomize_questions=False,
            randomize_options=False,
            status="active",
            created_by_id=examiner_user.id
        )
        db.add(exam1)
        db.flush()

        for idx, q in enumerate(ds_questions):
            eq = ExamQuestion(exam_id=exam1.id, question_id=q.id, order_index=idx)
            db.add(eq)

        # Exam 2: Cybersecurity & Network Defense Assessment
        sec_questions = [q for q in created_questions if q.subject == "Cybersecurity & Network Defense"]
        exam2 = Exam(
            title="Cybersecurity & Network Defense Assessment",
            subject="Information Security",
            description="Rigorous evaluation covering asymmetric cryptography, XSS/CSRF mitigation, network attack vectors, and secure protocol design.",
            instructions="""1. Continuous face proctoring is enabled for this assessment.
2. Multiple faces or unauthorized individuals in the camera feed will flag an immediate high-severity incident.
3. Copying or pasting text is strictly prohibited.
4. Timer is server-authoritative and will automatically submit when time expires.""",
            duration_minutes=25,
            total_marks=float(sum(q.marks for q in sec_questions)),
            passing_marks=8.0,
            negative_marking=True,
            negative_mark_value=0.25,
            randomize_questions=True,
            randomize_options=True,
            status="active",
            created_by_id=examiner_user.id
        )
        db.add(exam2)
        db.flush()

        for idx, q in enumerate(sec_questions):
            eq = ExamQuestion(exam_id=exam2.id, question_id=q.id, order_index=idx)
            db.add(eq)

        # Exam 3: Web Architecture & Cloud Systems
        web_questions = [q for q in created_questions if q.subject == "Web Architecture & Cloud"]
        exam3 = Exam(
            title="Full-Stack Web Architecture & Cloud Systems",
            subject="Software Engineering",
            description="Assessment on HTTP protocols, distributed systems consistency (CAP), relational storage indexing, and reverse proxy architectures.",
            instructions="""1. Ensure stable internet connectivity before proceeding.
2. Read all instructions carefully before starting.
3. Keep face visible and avoid looking away from the primary screen.""",
            duration_minutes=20,
            total_marks=float(sum(q.marks for q in web_questions)),
            passing_marks=6.0,
            negative_marking=False,
            negative_mark_value=0.0,
            randomize_questions=False,
            randomize_options=False,
            status="active",
            created_by_id=admin_user.id
        )
        db.add(exam3)
        db.flush()

        for idx, q in enumerate(web_questions):
            eq = ExamQuestion(exam_id=exam3.id, question_id=q.id, order_index=idx)
            db.add(eq)

        print("[OK] Created 3 exams: Data Structures Qualifying, Cybersecurity Defense, and Cloud Systems")

        # 4. Create Sample Completed Attempt for Student 2 (Sophia Rodriguez)
        # with realistic proctoring events and forensic evidence screenshots!
        attempt_time = datetime.utcnow() - timedelta(hours=2)
        sample_attempt = ExamAttempt(
            exam_id=exam1.id,
            student_id=student_user2.id,
            start_time=attempt_time,
            end_time=attempt_time + timedelta(minutes=exam1.duration_minutes),
            submitted_at=attempt_time + timedelta(minutes=18, seconds=45),
            time_spent_seconds=1125,
            status="submitted",
            score=15.0,
            total_possible_marks=exam1.total_marks,
            percentage=round((15.0 / exam1.total_marks) * 100.0, 1),
            is_passed=True,
            proctoring_score=82.0,
            violation_count=3
        )
        db.add(sample_attempt)
        db.flush()

        # Seed sample answers for this attempt
        for idx, q in enumerate(ds_questions):
            opts = list(q.options)
            correct_opt = next((o for o in opts if o.is_correct), opts[0])
            # Answer 8 correctly, 2 incorrectly
            selected = correct_opt if idx < 8 else opts[(opts.index(correct_opt) + 1) % len(opts)]
            is_correct = (selected.id == correct_opt.id)
            marks_awd = q.marks if is_correct else (-0.25 if exam1.negative_marking else 0.0)

            ans = StudentAnswer(
                attempt_id=sample_attempt.id,
                question_id=q.id,
                selected_option_id=selected.id,
                is_marked_for_review=(idx == 3 or idx == 7),
                is_correct=is_correct,
                marks_awarded=marks_awd
            )
            db.add(ans)

        # Generate sample evidence screenshots and proctoring incidents
        img_tab = create_synthetic_evidence_image("TAB_SWITCH", "HIGH", (attempt_time + timedelta(minutes=4)).strftime("%H:%M:%S"))
        img_away = create_synthetic_evidence_image("LOOKING_AWAY", "MEDIUM", (attempt_time + timedelta(minutes=9)).strftime("%H:%M:%S"))
        img_noface = create_synthetic_evidence_image("NO_FACE_DETECTED", "HIGH", (attempt_time + timedelta(minutes=14)).strftime("%H:%M:%S"))

        ev1 = ProctoringEvent(
            attempt_id=sample_attempt.id,
            student_id=student_user2.id,
            event_type="TAB_SWITCH",
            severity="HIGH",
            timestamp=attempt_time + timedelta(minutes=4, seconds=12),
            duration_seconds=3.5,
            description="Browser window lost focus. Student switched tabs or minimized exam window.",
            screenshot_path=img_tab,
            resolved=False
        )
        ev2 = ProctoringEvent(
            attempt_id=sample_attempt.id,
            student_id=student_user2.id,
            event_type="LOOKING_AWAY",
            severity="MEDIUM",
            timestamp=attempt_time + timedelta(minutes=9, seconds=45),
            duration_seconds=5.0,
            description="Facial landmark orientation indicates candidate repeatedly looking away from monitor.",
            screenshot_path=img_away,
            resolved=True
        )
        ev3 = ProctoringEvent(
            attempt_id=sample_attempt.id,
            student_id=student_user2.id,
            event_type="NO_FACE_DETECTED",
            severity="HIGH",
            timestamp=attempt_time + timedelta(minutes=14, seconds=20),
            duration_seconds=6.2,
            description="No face detected in camera viewport for more than 5 seconds.",
            screenshot_path=img_noface,
            resolved=False
        )
        db.add_all([ev1, ev2, ev3])

        db.commit()
        print("[OK] Sample attempt with proctoring incidents and forensic evidence screenshots created successfully.")
        print("--- ExamShield Database Seeding Completed Successfully ---")

    except Exception as e:
        db.rollback()
        print(f"Database seeding failed: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
