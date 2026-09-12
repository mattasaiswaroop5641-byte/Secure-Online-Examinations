import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { examService } from '../services/exams';
import { Exam } from '../types';
import {
  Clock,
  Award,
  CheckCircle2,
  AlertCircle,
  Play,
  FileText,
  ShieldCheck,
  Calendar,
  Layers,
  Sparkles,
} from 'lucide-react';

interface StudentDashboardProps {
  onStartExam: (examId: number) => void;
  onViewResult: (attemptId: number) => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({
  onStartExam,
  onViewResult,
}) => {
  const { user } = useAuth();
  const [exams, setExams] = useState<Exam[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadExams() {
      setIsLoading(true);
      try {
        const data = await examService.listExams();
        setExams(data);
      } catch (err: any) {
        setErrorMessage(err.message || 'Failed to load examinations.');
      } finally {
        setIsLoading(false);
      }
    }
    loadExams();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Welcome Banner */}
      <div className="p-8 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 border border-blue-500 rounded-3xl relative overflow-hidden shadow-lg text-white">
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 blur-3xl rounded-full pointer-events-none" />

        <div className="max-w-2xl relative z-10 space-y-2">
          <div className="inline-flex items-center space-x-2 bg-white/20 backdrop-blur-sm border border-white/30 px-3 py-1 rounded-full text-xs font-semibold text-white">
            <Sparkles className="w-3.5 h-3.5 text-blue-200" />
            <span>Candidate Portal Active</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            Welcome back, {user?.name}
          </h1>

          <p className="text-xs sm:text-sm text-blue-100 leading-relaxed">
            Select an assessment below to complete pre-exam biometric verification and enter the secure examination environment.
          </p>

          {user?.student_id && (
            <p className="text-xs font-mono text-blue-200">
              Student ID: <span className="text-white font-semibold">{user.student_id}</span>
            </p>
          )}
        </div>
      </div>

      {/* Assessment Listings */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Available Examinations</h2>
            <p className="text-xs text-slate-500 mt-0.5">Assigned proctored assessments ready for evaluation.</p>
          </div>
          <span className="text-xs font-mono text-slate-700 bg-white border border-slate-200 shadow-sm px-3 py-1.5 rounded-xl">
            {exams.length} Assessment(s)
          </span>
        </div>

        {errorMessage && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs mb-6 flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{errorMessage}</span>
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="h-64 rounded-3xl bg-white border border-slate-200 shadow-sm animate-pulse"
              />
            ))}
          </div>
        ) : exams.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 shadow-sm max-w-lg mx-auto">
            <ShieldCheck className="w-10 h-10 text-slate-400 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-800">No Examinations Scheduled</p>
            <p className="text-xs text-slate-500 mt-1">
              There are currently no active assessments assigned to your cohort.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {exams.map((exam) => {
              const isSubmitted =
                exam.user_attempt_status === 'submitted' ||
                exam.user_attempt_status === 'timed_out';
              const isInProgress = exam.user_attempt_status === 'in_progress';

              return (
                <div
                  key={exam.id}
                  className="bg-white border border-slate-200 hover:border-blue-300 hover:shadow-md rounded-3xl p-6 flex flex-col justify-between shadow-sm transition-all group"
                >
                  <div className="space-y-4">
                    {/* Top Badges */}
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-lg">
                        {exam.subject}
                      </span>

                      {isSubmitted ? (
                        <span className="flex items-center space-x-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Submitted</span>
                        </span>
                      ) : isInProgress ? (
                        <span className="flex items-center space-x-1 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full animate-pulse">
                          <Clock className="w-3.5 h-3.5" />
                          <span>In Progress</span>
                        </span>
                      ) : (
                        <span className="flex items-center space-x-1 text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full">
                          <span>Ready</span>
                        </span>
                      )}
                    </div>

                    {/* Title & Description */}
                    <div>
                      <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors tracking-tight">
                        {exam.title}
                      </h3>
                      <p className="text-xs text-slate-600 line-clamp-2 mt-1 leading-relaxed">
                        {exam.description || 'Comprehensive evaluation assessment with continuous face monitoring.'}
                      </p>
                    </div>

                    {/* Meta Info Grid */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
                      <div className="flex items-center space-x-2 text-slate-700">
                        <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                        <span>{exam.duration_minutes} Minutes</span>
                      </div>
                      <div className="flex items-center space-x-2 text-slate-700">
                        <Award className="w-4 h-4 text-slate-400 shrink-0" />
                        <span>{exam.total_marks} Marks</span>
                      </div>
                      <div className="flex items-center space-x-2 text-slate-700">
                        <Layers className="w-4 h-4 text-slate-400 shrink-0" />
                        <span>{exam.question_count || 0} Questions</span>
                      </div>
                      <div className="flex items-center space-x-2 text-slate-700">
                        <span className="w-4 h-4 text-slate-400 text-center font-bold text-xs shrink-0">P</span>
                        <span>Pass: {exam.passing_marks}</span>
                      </div>
                    </div>

                    {exam.negative_marking && (
                      <p className="text-[11px] text-amber-800 font-medium bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                        ⚠️ Negative marking active (-{exam.negative_mark_value} per wrong answer)
                      </p>
                    )}
                  </div>

                  {/* Card Action Button */}
                  <div className="pt-6">
                    {isSubmitted ? (
                      <button
                        onClick={() => {
                          if (exam.user_attempt_id) {
                            onViewResult(exam.user_attempt_id);
                          }
                        }}
                        className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs transition-colors flex items-center justify-center space-x-2 cursor-pointer border border-slate-200"
                      >
                        <FileText className="w-4 h-4 text-emerald-600" />
                        <span>View Detailed Results</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => onStartExam(exam.id)}
                        className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md shadow-blue-600/20 transition-all flex items-center justify-center space-x-2 cursor-pointer"
                      >
                        <Play className="w-4 h-4 fill-white" />
                        <span>{isInProgress ? 'Resume Examination' : 'Start Examination'}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
