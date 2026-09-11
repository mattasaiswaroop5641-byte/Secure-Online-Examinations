# ExamShield 🛡️
> **Secure Assessments. Trusted Results.**

A professional, production-style Secure Online Examination System with Continuous Face Proctoring, Anti-Cheating Browser Lockdowns, Automated Grading, and Forensic Incident Auditing.

ExamShield runs **100% locally with open-source Computer Vision**. It does not require any paid APIs, external AI keys, or third-party cloud services.

---

## 🌟 Key Features

### 1. Role-Based Portals & Workflows
- **Administrator**: Comprehensive institutional dashboard, KPIs, pass rate metrics, exam management, question bank management, student enrollment records, and full forensic incident audits with screenshot evidence.
- **Examiner / Teacher**: Exam configuration, question authoring, difficulty and negative marking calibration, student attempt review, and incident resolution.
- **Candidate / Student**: Intuitive assessment dashboard, 5-step pre-exam hardware and biometric calibration, fullscreen lockdown arena, real-time question palette, and instant score breakdown with explanations.

### 2. Multi-Step Candidate Onboarding Workflow
1. **Step 1 — Overview**: Review assessment subject, syllabus, duration, marks distribution, and negative marking rules.
2. **Step 2 — System Check**: Automated hardware verification for webcam availability, browser security APIs, and fullscreen capability.
3. **Step 3 — Biometric Face Calibration**: Real-time webcam alignment inside an elliptical guide verifying single-candidate presence before exam entry.
4. **Step 4 — Rules & Privacy Consent**: Transparent disclosure of continuous proctoring and event-based screenshot evidence capture with explicit student consent.
5. **Step 5 — Fullscreen Lockdown**: Enters fullscreen focus mode, initializes continuous proctoring loop, and starts the synchronized countdown clock.

### 3. Continuous Face Proctoring & Integrity Controls
- **No Face Detection (`NO_FACE_DETECTED`)**: Flags candidate leaving desk or covering camera.
- **Multiple Faces Detection (`MULTIPLE_FACES_DETECTED`)**: Flags secondary person entering exam view.
- **Attention & Gaze Tracking (`LOOKING_AWAY`)**: Uses facial landmark orientation (yaw/pitch) to detect sustained looking away from monitor.
- **Position Tracking (`FACE_OUT_OF_FRAME`)**: Flags face drifting out of camera bounds.
- **Tab Visibility Detection (`TAB_SWITCH`)**: Uses HTML5 Page Visibility API to detect window blurring or tab switching.
- **Fullscreen Exit Detection (`FULLSCREEN_EXIT`)**: Detects exit from fullscreen and locks examination until resumed.
- **Hardware Interruption (`CAMERA_DISCONNECTED`)**: Detects camera stream disconnection.
- **Forensic Evidence Snapshots**: High-severity incidents automatically capture annotated frames watermarked with OpenCV bounding boxes and UTC timestamps.
- **Dynamic Trust Score**: Starts at 100% and calculates deduction penalties, classifying attempts into *Normal* (>=85%), *Warning* (65-84%), or *Suspicious* (<65%).

### 4. Server-Authoritative Timing & Grading
- Server calculates hard deadlines at start time. Client countdown clock synchronizes periodically.
- Answers are auto-saved in real time.
- Expiration automatically triggers server-side grading and timeout submission.
- Prevents tampering: correct answers and explanations are never sent to candidate clients before final submission.

---

## 🚀 Tech Stack

- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, Lucide React Icons.
- **Backend**: Python 3.11, FastAPI, Uvicorn, Pydantic v2.
- **Computer Vision**: OpenCV (`opencv-python-headless`), Browser MediaDevices & Canvas Pixel Analysis.
- **Database**: SQLite by default via SQLAlchemy ORM (compatible with PostgreSQL with zero schema changes).
- **Authentication**: JWT (JSON Web Tokens), bcrypt password hashing, Role-Based Access Control (RBAC).

---

## 👥 User-Defined Roles & Registration

ExamShield is **100% user-defined**. There are no hardcoded personas or dummy dependencies. Any user can create their own account directly through the registration portal:

- **Student / Candidate**: Select `Student` during registration, provide your Full Name, Email, and Student/Roll ID. Immediately access scheduled examinations, complete biometric webcam calibration, and view authoritative grading results.
- **Teacher / Examiner**: Select `Examiner` during registration. Author questions in the Question Bank, configure examination schedules, set passing marks, enable/disable negative marking, and evaluate student submissions.
- **Institutional Administrator**: Select `Admin` during registration. Oversee the entire institutional dashboard, monitor real-time proctoring streams, inspect forensic violation logs with photographic evidence snapshots, and manage institution-wide assessments.

---

## 🛠️ Quick Start Guide

### Prerequisites
- **Python 3.11+** installed
- **Node.js v18+** and **npm** installed

### 1. Backend Setup & Run
From the project root:
```powershell
# Navigate to backend directory
cd backend

# Create & activate virtual environment (if not already created)
py -m venv ..\venv
..\venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt

# Initialize clean database tables and storage directories
python init_db.py

# (Optional) If you want to pre-load a starter bank of 24+ technical questions:
# python -m app.utils.seed_data

# Start FastAPI backend server
python run.py
```
Backend will start on: **http://127.0.0.1:8000**
OpenAPI interactive documentation available at: **http://127.0.0.1:8000/docs**

### 2. Frontend Setup & Run
Open a second terminal window:
```powershell
# Navigate to frontend directory
cd frontend

# Install dependencies
npm.cmd install

# Start Vite development server
npm.cmd run dev
```
Frontend will start on: **http://localhost:5173**

---

## 🧪 Running Automated Tests

ExamShield includes an automated test suite verifying authentication, exam flows, answer grading, and computer vision endpoints.

```powershell
cd backend
$env:PYTHONPATH="."
..\venv\Scripts\python.exe -m pytest tests -v
```

Expected output:
```
tests/test_auth.py::test_health_check PASSED
tests/test_auth.py::test_login_admin PASSED
tests/test_auth.py::test_login_student PASSED
tests/test_auth.py::test_invalid_login PASSED
tests/test_auth.py::test_register_new_student PASSED
tests/test_exam_flow.py::test_list_exams PASSED
tests/test_exam_flow.py::test_student_exam_attempt_flow PASSED
tests/test_proctoring.py::test_proctoring_event_logging PASSED
tests/test_proctoring.py::test_opencv_frame_verification PASSED
======================== 9 passed in 3.94s ========================
```

---

## 📋 User-Defined Examination Walkthrough

1. **Sign Up**: Navigate to `http://localhost:5173` and click **"Create Candidate Account"** or **"Register"**.
2. **Choose Role**: Select your role (`Student`, `Examiner`, or `Admin`) and enter your own credentials.
3. **For Examiners & Admins**:
   - Access the Question Bank to create custom multiple-choice questions with answer choices and explanations.
   - Access Exam Management to create a custom exam, allocate questions, set time limits and passing thresholds.
4. **For Students / Candidates**:
   - View your available examinations on the Student Dashboard.
   - Click **"Start Examination"** and complete the 5-step hardware check and face calibration with your live webcam.
   - Enter Fullscreen Arena and complete your test under real-time proctoring.
   - Submit and review your instant score breakdown and dynamic trust rating.

---

## 📁 Architecture & File Structure

```
examshield/
├── backend/
│   ├── app/
│   │   ├── config.py              # Configuration & proctoring thresholds
│   │   ├── database.py            # SQLite / SQLAlchemy engine setup
│   │   ├── main.py                # FastAPI app with static uploads mount & CORS
│   │   ├── models/                # SQLAlchemy ORM models (User, Exam, Question, Attempt, Proctoring)
│   │   ├── schemas/               # Pydantic v2 schemas (with data privacy separation)
│   │   ├── routers/               # REST API endpoints (auth, exams, questions, attempts, proctoring, analytics)
│   │   ├── services/              # Grading service, OpenCV CV frame verifier & snapshot saver
│   │   └── utils/                 # Security utilities & database seed script
│   ├── uploads/evidence/          # Stored forensic evidence snapshot images
│   ├── tests/                     # Pytest automated test suite
│   ├── requirements.txt           # Python dependencies
│   └── run.py                     # Convenience backend runner with auto-seed
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/            # Navbar, Footer, Modal, Badges
│   │   │   ├── exam/              # SystemCheck, FaceVerification, RulesConsent, ExamTimer, QuestionCard, Palette, ProctoringFeed
│   │   │   └── admin/             # AdminSidebar, StatsCard, ProctoringTimeline, EvidenceViewerModal, ExamForm, QuestionForm
│   │   ├── context/               # AuthContext with 1-click quick login
│   │   ├── hooks/                 # useWebcam, useFaceProctor, useAntiCheating
│   │   ├── pages/                 # LandingPage, LoginPage, RegisterPage, StudentDashboard, ExamOnboarding, ExamArena, ResultPage
│   │   ├── pages/admin/           # AdminOverview, ExamManagement, QuestionBank, AttemptReview, ProctoringReports
│   │   ├── services/              # API clients for auth, exams, questions, attempts, proctoring, analytics
│   │   ├── utils/                 # Client-side Computer Vision face tracker & formatters
│   │   ├── types/                 # Full TypeScript definitions
│   │   ├── App.tsx                # Master routing and role views
│   │   └── index.css              # Tailwind CSS directives and custom scrollbars
│   ├── package.json
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   └── vite.config.ts
│
├── .env.example
└── README.md
```

---

## 🔒 Security & Anti-Cheating Architecture

- **Data Privacy by Design**: Option `is_correct` and question `explanation` are strictly stripped from student payloads before submission. Grading is 100% authoritative on the backend.
- **Server-Authoritative Clock**: The test countdown is anchored to server UTC timestamps; adjusting system clocks or pausing JavaScript execution cannot spoof exam duration.
- **Local Computer Vision**: Real-time biometric processing happens on client frames without streaming heavy video feeds to expensive cloud APIs. Evidence frames are captured strictly upon high-severity infractions.
- **Tamper Resistance**: Suppresses right-clicks, copy, paste, select, and common developer tool shortcut combinations.

---

## 📄 License

MIT License — Built for academic competitions, hackathons, and real-world institutional evaluations.
