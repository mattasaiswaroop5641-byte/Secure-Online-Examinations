import React, { useState, useEffect } from 'react';
import { attemptService } from '../services/attempts';
import { AttemptResult } from '../types';
import { formatSeconds, formatDate, getProctoringStatusBadgeClass } from '../utils/formatters';
import {
  Award,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  ShieldCheck,
  ShieldAlert,
  ArrowLeft,
  FileCheck,
  HelpCircle,
  Sparkles,
} from 'lucide-react';

interface ResultPageProps {
  attemptId: number;
  onBackToDashboard: () => void;
}

export const ResultPage: React.FC<ResultPageProps> = ({ attemptId, onBackToDashboard }) => {
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadResult() {
      setIsLoading(true);
      try {
        const data = await attemptService.getResult(attemptId);
        setResult(data);
      } catch (err: any) {
        setErrorMessage(err.message || 'Failed to retrieve assessment score.');
      } finally {
        setIsLoading(false);
      }
    }
    loadResult();
  }, [attemptId]);

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500">Compiling examination performance breakdown...</p>
        </div>
      </div>
    );
  }

  if (errorMessage || !result) {
    return (
      <div className="max-w-md mx-auto my-16 p-6 bg-white border border-slate-200 shadow-xl rounded-3xl text-center">
        <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-900">Score Record Unavailable</h3>
        <p className="text-xs text-slate-500 mt-1">{errorMessage || 'Could not fetch result data.'}</p>
        <button
          onClick={onBackToDashboard}
          className="mt-5 px-4 py-2 rounded-xl bg-slate-100 text-xs font-semibold text-slate-700 hover:bg-slate-200 border border-slate-200 cursor-pointer"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const proctorStatusClass = getProctoringStatusBadgeClass(result.proctoring_status);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBackToDashboard}
            className="p-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-slate-600 hover:text-slate-900 transition-colors shadow-sm cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">
              Assessment Report
            </span>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              {result.exam_title}
            </h1>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs text-slate-600 font-mono">
            Candidate: <strong className="text-slate-900">{result.student_name}</strong>
          </span>
        </div>
      </div>

      {/* KICKED / TERMINATED PROCTOR NOTICE BANNER */}
      {(result.status === 'terminated' || result.termination_reason) && (
        <div className="p-6 bg-rose-50 border-2 border-rose-300 rounded-3xl shadow-sm space-y-3 animate-in slide-in-from-top-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-100 border border-rose-300 flex items-center justify-center text-rose-600 shrink-0">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-rose-600 text-white shadow-sm">
                  Disqualified & Terminated
                </span>
                <span className="text-xs text-rose-700 font-semibold">
                  Integrity Rule Violation
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 mt-0.5">
                Examination Terminated by Proctor
              </h2>
            </div>
          </div>

          <div className="bg-white border border-rose-200 p-4 rounded-2xl space-y-2">
            <div className="text-xs font-semibold text-rose-700 uppercase tracking-wider">
              Reason for Disqualification:
            </div>
            <p className="text-sm text-slate-800 font-medium leading-relaxed">
              {result.termination_reason || 'Proctor disqualified this candidate session due to security/integrity protocol violations.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 pt-1">
            <span>
              Authorized by: <strong className="text-slate-800">{result.terminated_by_name || 'System / Administrator'}</strong>
            </span>
            {result.terminated_at && (
              <span>
                Terminated on: <strong className="text-slate-800">{formatDate(result.terminated_at)}</strong>
              </span>
            )}
          </div>
        </div>
      )}

      {/* Main KPI Scoreboard Banner */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Score & Percentage */}
        <div className="md:col-span-2 p-6 bg-gradient-to-br from-blue-50 to-white border border-slate-200 rounded-3xl flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Score</span>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
                result.status === 'terminated'
                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                  : result.is_passed
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}
            >
              {result.status === 'terminated'
                ? 'Disqualified (Terminated)'
                : result.is_passed
                ? 'Passed Examination'
                : 'Below Passing Threshold'}
            </span>
          </div>

          <div className="my-4 flex items-baseline space-x-3">
            <span className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
              {result.score}
            </span>
            <span className="text-xl text-slate-500 font-medium">/ {result.total_possible_marks} Marks</span>
            <span className="text-xl font-bold text-blue-600 font-mono">({result.percentage}%)</span>
          </div>

          <div className="flex items-center space-x-4 text-xs text-slate-500 pt-2 border-t border-slate-100">
            <span>Passing Mark: {result.passing_marks}</span>
            <span>•</span>
            <span>Duration: {formatSeconds(result.time_spent_seconds)}</span>
          </div>
        </div>

        {/* Proctoring Integrity Summary */}
        <div className="p-6 bg-white border border-slate-200 rounded-3xl flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Proctoring Integrity</span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-200">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>

          <div className="my-2">
            <div className="flex items-baseline space-x-2">
              <span className="text-3xl font-extrabold text-slate-900 font-mono">{result.proctoring_score}%</span>
              <span className="text-xs text-slate-500">Trust Score</span>
            </div>
            <div className="mt-2">
              <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${proctorStatusClass}`}>
                Status: {result.proctoring_status}
              </span>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 pt-2 border-t border-slate-100">
            {result.violation_count === 0
              ? 'Zero suspicious incidents detected'
              : `${result.violation_count} proctoring incident(s) logged`}
          </p>
        </div>

        {/* Question Performance Breakdown */}
        <div className="p-6 bg-white border border-slate-200 rounded-3xl flex flex-col justify-between shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Answer Breakdown</span>

          <div className="space-y-2 my-2 text-xs">
            <div className="flex items-center justify-between text-emerald-700 font-semibold">
              <span className="flex items-center space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Correct</span>
              </span>
              <span>{result.correct_count}</span>
            </div>
            <div className="flex items-center justify-between text-rose-700 font-semibold">
              <span className="flex items-center space-x-1">
                <XCircle className="w-3.5 h-3.5" />
                <span>Incorrect</span>
              </span>
              <span>{result.incorrect_count}</span>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span className="flex items-center space-x-1">
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Unanswered</span>
              </span>
              <span>{result.unanswered_count}</span>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 pt-2 border-t border-slate-100">
            Total Questions: {result.total_questions}
          </p>
        </div>
      </div>

      {/* Question-Wise Detailed Analysis */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Question-Wise Detailed Analysis</h2>
          <span className="text-xs text-slate-500">Review answers and explanations</span>
        </div>

        <div className="space-y-4">
          {result.questions?.map((item, idx) => {
            const isUnanswered = item.selected_option_id === null;

            return (
              <div
                key={item.question_id}
                className="p-6 bg-white border border-slate-200 rounded-3xl space-y-4 shadow-sm"
              >
                {/* Question Header */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
                      Question {idx + 1}
                    </span>
                    <span className="text-xs text-slate-500">{item.subject}</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    {item.is_correct ? (
                      <span className="flex items-center space-x-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>+{item.marks_awarded} Marks</span>
                      </span>
                    ) : isUnanswered ? (
                      <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full">
                        Unanswered (0 Marks)
                      </span>
                    ) : (
                      <span className="flex items-center space-x-1 text-xs font-bold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
                        <XCircle className="w-3.5 h-3.5" />
                        <span>{item.marks_awarded} Marks</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Prompt */}
                <p className="text-sm font-semibold text-slate-900 leading-relaxed whitespace-pre-wrap">
                  {item.question_text}
                </p>

                {/* Options List */}
                <div className="space-y-2 pt-2">
                  {item.options.map((opt) => {
                    const isCandidateChoice = item.selected_option_id === opt.id;
                    const isCorrectAnswer = item.correct_option_id === opt.id;

                    let optStyle = 'bg-slate-50 border-slate-200 text-slate-600';
                    if (isCorrectAnswer) {
                      optStyle = 'bg-emerald-50 border-emerald-400 text-emerald-800 font-semibold';
                    } else if (isCandidateChoice && !isCorrectAnswer) {
                      optStyle = 'bg-rose-50 border-rose-300 text-rose-700 line-through';
                    }

                    return (
                      <div
                        key={opt.id}
                        className={`p-3 rounded-xl border text-xs flex items-center justify-between ${optStyle}`}
                      >
                        <div className="flex items-center space-x-2.5">
                          <span>{opt.option_text}</span>
                        </div>

                        <div className="flex items-center space-x-1.5 shrink-0 text-[11px]">
                          {isCorrectAnswer && (
                            <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md font-bold">
                              Correct Answer
                            </span>
                          )}
                          {isCandidateChoice && (
                            <span
                              className={`px-2 py-0.5 rounded-md font-bold ${
                                isCorrectAnswer
                                  ? 'bg-emerald-200 text-emerald-900'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              Your Choice
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Explanation */}
                {item.explanation && (
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1">
                    <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                      Explanation & Rationale
                    </span>
                    <p className="text-slate-600 leading-relaxed">{item.explanation}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
