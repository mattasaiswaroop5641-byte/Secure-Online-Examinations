export type Role = 'admin' | 'examiner' | 'student';

export interface User {
  id: number;
  name: string;
  email: string;
  student_id?: string | null;
  role: Role;
  avatar_url?: string | null;
  is_active: boolean;
  created_at?: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface OptionAdmin {
  id: number;
  option_text: string;
  is_correct: boolean;
  order_index?: number;
}

export interface OptionStudent {
  id: number;
  option_text: string;
  order_index?: number;
}

export interface QuestionAdmin {
  id: number;
  subject: string;
  text: string;
  question_type: string;
  difficulty: 'easy' | 'medium' | 'hard';
  marks: number;
  negative_marks: number;
  explanation?: string | null;
  created_by_id?: number | null;
  options: OptionAdmin[];
}

export interface QuestionStudent {
  id: number;
  subject: string;
  text: string;
  question_type: string;
  difficulty: 'easy' | 'medium' | 'hard';
  marks: number;
  negative_marks: number;
  order_index?: number;
  options: OptionStudent[];
}

export interface Exam {
  id: number;
  title: string;
  subject: string;
  description?: string | null;
  instructions?: string | null;
  duration_minutes: number;
  total_marks: number;
  passing_marks: number;
  negative_marking: boolean;
  negative_mark_value: number;
  randomize_questions: boolean;
  randomize_options: boolean;
  start_time?: string | null;
  end_time?: string | null;
  status: 'draft' | 'scheduled' | 'active' | 'completed' | 'archived';
  question_count?: number;
  attempt_count?: number;
  user_attempt_status?: 'in_progress' | 'submitted' | 'timed_out' | null;
  user_attempt_id?: number | null;
}

export interface AnswerState {
  question_id: number;
  selected_option_id: number | null;
  is_marked_for_review: boolean;
}

export interface StartExamResponse {
  attempt_id: number;
  exam_id: number;
  exam_title: string;
  duration_minutes: number;
  start_time: string;
  end_time: string;
  remaining_seconds: number;
  total_questions: number;
  questions: QuestionStudent[];
  current_answers: Record<number, AnswerState>;
}

export interface QuestionAnalysisItem {
  question_id: number;
  question_text: string;
  subject: string;
  difficulty: string;
  marks: number;
  negative_marks: number;
  explanation?: string | null;
  options: { id: number; option_text: string; is_correct: boolean }[];
  selected_option_id: number | null;
  correct_option_id: number | null;
  is_correct: boolean;
  marks_awarded: number;
  is_marked_for_review: boolean;
}

export interface AttemptResult {
  attempt_id: number;
  exam_id: number;
  exam_title: string;
  student_id: number;
  student_name: string;
  student_email: string;
  status: string;
  start_time: string;
  submitted_at: string | null;
  time_spent_seconds: number;
  score: number;
  total_possible_marks: number;
  percentage: number;
  is_passed: boolean;
  passing_marks: number;
  total_questions: number;
  correct_count: number;
  incorrect_count: number;
  unanswered_count: number;
  marked_for_review_count: number;
  proctoring_score: number;
  violation_count: number;
  proctoring_status: 'Normal' | 'Warning' | 'Suspicious';
  questions?: QuestionAnalysisItem[];
}

export type ProctoringEventType =
  | 'NO_FACE_DETECTED'
  | 'MULTIPLE_FACES_DETECTED'
  | 'FACE_OUT_OF_FRAME'
  | 'LOOKING_AWAY'
  | 'TAB_SWITCH'
  | 'FULLSCREEN_EXIT'
  | 'CAMERA_DISCONNECTED'
  | 'DEVTOOLS_SUSPECT';

export type ViolationSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface ProctoringEvent {
  id: number;
  attempt_id: number;
  student_id: number;
  student_name?: string | null;
  event_type: ProctoringEventType;
  severity: ViolationSeverity;
  timestamp: string;
  duration_seconds: number;
  description: string;
  screenshot_path?: string | null;
  resolved: boolean;
  created_at: string;
}

export interface ProctoringSummary {
  attempt_id: number;
  student_id: number;
  student_name: string;
  exam_title: string;
  proctoring_score: number;
  proctoring_status: 'Normal' | 'Warning' | 'Suspicious';
  total_violations: number;
  violations_by_type: Record<string, number>;
  violations_by_severity: Record<string, number>;
  events: ProctoringEvent[];
}

export interface DashboardMetrics {
  kpis: {
    total_students: number;
    total_exams: number;
    active_exams: number;
    total_attempts: number;
    completed_attempts: number;
    average_score: number;
    suspicious_attempts: number;
    total_violations: number;
  };
  violation_breakdown: Record<string, number>;
  recent_attempts: {
    id: number;
    student_name: string;
    student_email: string;
    student_code?: string | null;
    exam_title: string;
    status: string;
    score: number;
    total_possible_marks: number;
    percentage: number;
    proctoring_score: number;
    violation_count: number;
    start_time: string;
    submitted_at?: string | null;
  }[];
}
