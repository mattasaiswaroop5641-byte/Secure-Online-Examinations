import React, { useState, useEffect, useRef, useCallback } from 'react';
import { attemptService } from '../services/attempts';
import { StartExamResponse, QuestionStudent, AnswerState, ProctoringEventType, ViolationSeverity } from '../types';
import { useFaceProctor } from '../hooks/useFaceProctor';
import { useAntiCheating } from '../hooks/useAntiCheating';
import { ExamTimer } from '../components/exam/ExamTimer';
import { QuestionCard } from '../components/exam/QuestionCard';
import { QuestionPalette } from '../components/exam/QuestionPalette';
import { ProctoringFeed } from '../components/exam/ProctoringFeed';
import { SubmitConfirmModal } from '../components/exam/SubmitConfirmModal';
import { useAuth } from '../context/AuthContext';
import {
  ShieldCheck,
  Maximize2,
  AlertTriangle,
  AlertCircle,
  Eye,
  Lock,
  RotateCcw,
  ShieldAlert,
} from 'lucide-react';

interface ExamArenaPageProps {
  examId: number;
  mediaStream: MediaStream;
  onFinishExam: (attemptId: number) => void;
}

export const ExamArenaPage: React.FC<ExamArenaPageProps> = ({
  examId,
  mediaStream,
  onFinishExam,
}) => {
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [examData, setExamData] = useState<StartExamResponse | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<number, AnswerState>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [autoSubmitNotice, setAutoSubmitNotice] = useState<string | null>(null);
  const [kickOutNotice, setKickOutNotice] = useState<string | null>(null);

  // Attach webcam stream to ref once UI is loaded and videoRef is mounted
  useEffect(() => {
    let activeStream = mediaStream;

    async function attachStream() {
      if (!isLoading && videoRef.current) {
        const isAlive = Boolean(
          activeStream &&
          activeStream.active &&
          activeStream.getVideoTracks().some((t) => t.readyState === 'live')
        );

        if (!isAlive) {
          try {
            activeStream = await navigator.mediaDevices.getUserMedia({
              video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
              audio: false,
            });
          } catch (e) {
            console.error('Camera acquisition error in ExamArenaPage:', e);
          }
        }

        if (videoRef.current && activeStream) {
          videoRef.current.srcObject = activeStream;
          videoRef.current.play().catch((err) => console.log('Arena video play:', err));
        }
      }
    }

    attachStream();
  }, [isLoading, mediaStream]);

  // Load / Start attempt
  useEffect(() => {
    async function initExam() {
      setIsLoading(true);
      try {
        const data = await attemptService.startExam(examId);
        setExamData(data);
        setAnswers(data.current_answers || {});
      } catch (err: any) {
        setErrorMessage(err.message || 'Failed to initialize exam session.');
      } finally {
        setIsLoading(false);
      }
    }
    initExam();
  }, [examId]);

  // Submission handler
  const handleFinalSubmit = useCallback(async () => {
    if (!examData || isSubmitting) return;
    setIsSubmitting(true);

    try {
      if (mediaStream) {
        mediaStream.getTracks().forEach((t) => t.stop());
      }

      await attemptService.submitExam(examData.attempt_id);
      onFinishExam(examData.attempt_id);
    } catch (err: any) {
      console.error('Submission failed:', err);
      setErrorMessage(err.message || 'Failed to submit examination.');
      setIsSubmitting(false);
    }
  }, [examData, isSubmitting, mediaStream, onFinishExam]);

  // Continuous Face Proctoring Hook
  const {
    detection,
    trustScore,
    violationCount,
    warningMessage,
    reportViolation,
  } = useFaceProctor({
    attemptId: examData?.attempt_id ?? null,
    videoRef,
    isActive: !isLoading && Boolean(examData) && !kickOutNotice,
    maxViolationsAllowed: 3,
    onAutoTerminate: (reason) => {
      setKickOutNotice(reason);
      setTimeout(() => {
        handleFinalSubmit();
      }, 3000);
    },
  });

  // Anti-Cheating & Fullscreen Lockdown Hook
  const {
    isFullscreen,
    fullscreenWarning,
    windowBlurWarning,
    requestFullscreen,
    exitFullscreen,
    dismissFullscreenWarning,
  } = useAntiCheating({
    isActive: !isLoading && Boolean(examData) && !kickOutNotice,
    onViolation: (eventType, severity, desc) => {
      reportViolation(eventType, severity, 0, desc);
    },
  });


  // Request fullscreen on start
  useEffect(() => {
    if (!isLoading && examData) {
      requestFullscreen();
    }
  }, [isLoading, examData, requestFullscreen]);

  // Save student answer in real time
  const handleSelectOption = async (optionId: number | null) => {
    if (!examData || kickOutNotice) return;
    const currentQ = examData.questions[currentQuestionIndex];
    const prevAnswer = answers[currentQ.id];
    const isMarked = prevAnswer?.is_marked_for_review ?? false;

    // Optimistic UI update
    const updatedAnswer: AnswerState = {
      question_id: currentQ.id,
      selected_option_id: optionId,
      is_marked_for_review: isMarked,
    };

    setAnswers((prev) => ({
      ...prev,
      [currentQ.id]: updatedAnswer,
    }));

    // Server persist
    try {
      await attemptService.saveAnswer(examData.attempt_id, {
        question_id: currentQ.id,
        selected_option_id: optionId,
        is_marked_for_review: isMarked,
      });
    } catch (err) {
      console.error('Failed to sync answer to server:', err);
    }
  };

  const handleToggleMarkReview = async () => {
    if (!examData || kickOutNotice) return;
    const currentQ = examData.questions[currentQuestionIndex];
    const prevAnswer = answers[currentQ.id];
    const newMarked = !prevAnswer?.is_marked_for_review;

    const updatedAnswer: AnswerState = {
      question_id: currentQ.id,
      selected_option_id: prevAnswer?.selected_option_id ?? null,
      is_marked_for_review: newMarked,
    };

    setAnswers((prev) => ({
      ...prev,
      [currentQ.id]: updatedAnswer,
    }));

    try {
      await attemptService.saveAnswer(examData.attempt_id, {
        question_id: currentQ.id,
        selected_option_id: updatedAnswer.selected_option_id,
        is_marked_for_review: newMarked,
      });
    } catch (err) {
      console.error('Failed to update review flag:', err);
    }
  };

  // Automatic timer timeout handler
  const handleTimerExpired = useCallback(async () => {
    setAutoSubmitNotice('Examination duration has expired! Finalizing answers and submitting automatically...');
    setTimeout(() => {
      handleFinalSubmit();
    }, 1500);
  }, [handleFinalSubmit]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-300">Entering Secure Examination Arena...</p>
          <p className="text-xs text-slate-500">Initializing continuous face tracker & timer synchronization</p>
        </div>
      </div>
    );
  }

  if (errorMessage || !examData) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center space-y-4 shadow-2xl">
          <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
          <h3 className="text-lg font-bold text-white">Examination Session Error</h3>
          <p className="text-xs text-slate-400">{errorMessage || 'Could not connect to exam.'}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold cursor-pointer"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  const currentQ = examData.questions[currentQuestionIndex];
  const answeredCount = Object.values(answers).filter((a) => a.selected_option_id !== null).length;
  const markedCount = Object.values(answers).filter((a) => a.is_marked_for_review).length;
  const unansweredCount = examData.questions.length - answeredCount;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col secure-exam-content select-none">
      {/* TOP ARENA BAR */}
      <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 sm:px-6 py-3 shrink-0 flex items-center justify-between gap-4 sticky top-0 z-30">
        {/* Left: Exam Title & Candidate */}
        <div className="flex items-center space-x-3 overflow-hidden">
          <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="truncate">
            <h1 className="text-sm font-bold text-white truncate tracking-tight">{examData.exam_title}</h1>
            <p className="text-[11px] text-slate-400 truncate">
              Candidate: <span className="text-slate-200 font-semibold">{user?.name}</span>{' '}
              {user?.student_id && `(${user.student_id})`}
            </p>
          </div>
        </div>

        {/* Center: Authoritative Timer & Fullscreen Status */}
        <div className="flex items-center space-x-3">
          <ExamTimer
            initialSeconds={examData.remaining_seconds}
            attemptId={examData.attempt_id}
            onExpire={handleTimerExpired}
          />

          {!isFullscreen && (
            <button
              onClick={requestFullscreen}
              className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-semibold animate-pulse transition-colors"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>Re-enter Fullscreen</span>
            </button>
          )}
        </div>

        {/* Right: Submit Button */}
        <div>
          <button
            onClick={() => setIsSubmitModalOpen(true)}
            disabled={Boolean(kickOutNotice)}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/20 transition-all cursor-pointer disabled:opacity-50"
          >
            Submit Exam
          </button>
        </div>
      </header>

      {/* AUTO-TERMINATION / KICK OUT OVERLAY */}
      {kickOutNotice && (
        <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-lg w-full bg-slate-900 border-2 border-rose-500/60 rounded-3xl p-8 text-center space-y-5 shadow-2xl animate-in zoom-in-95">
            <div className="w-16 h-16 bg-rose-500/10 border-2 border-rose-500/30 rounded-2xl flex items-center justify-center text-rose-400 mx-auto animate-bounce">
              <ShieldAlert className="w-10 h-10" />
            </div>

            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                Examination Terminated
              </h2>
              <span className="inline-block mt-1.5 px-3 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30">
                Security Violation Threshold Exceeded
              </span>
            </div>

            <p className="text-xs text-slate-300 bg-slate-950 p-4 rounded-2xl border border-slate-800 text-left leading-relaxed">
              {kickOutNotice}
            </p>

            <div className="p-3 bg-rose-500/10 rounded-xl text-[11px] text-rose-300 flex items-center justify-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-rose-400 animate-ping" />
              <span>All forensic snapshot frames have been logged to MongoDB Atlas Cloud.</span>
            </div>

            <div className="pt-2">
              <p className="text-xs text-slate-500 animate-pulse">
                Auto-submitting test and redirecting to integrity report...
              </p>
            </div>
          </div>
        </div>
      )}

      {/* WINDOW BLUR / ALT+TAB WARNING BANNER */}
      {windowBlurWarning && !kickOutNotice && (
        <div className="bg-amber-500/95 text-slate-950 px-4 py-2 text-xs flex items-center justify-between font-bold sticky top-[57px] z-20 shadow-lg animate-pulse">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-slate-950" />
            <span>
              {windowBlurWarning} Incident and webcam evidence snapshot have been logged!
            </span>
          </div>
        </div>
      )}

      {/* FULLSCREEN WARNING BANNER */}
      {fullscreenWarning && !kickOutNotice && (
        <div className="bg-rose-600/90 text-white px-4 py-2 text-xs flex items-center justify-between font-semibold sticky top-[57px] z-20 shadow-md">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 shrink-0 animate-bounce" />
            <span>
              Security Notice: Fullscreen mode is mandatory. Exiting fullscreen logs an incident in your audit report.
            </span>
          </div>
          <button
            onClick={() => {
              dismissFullscreenWarning();
              requestFullscreen();
            }}
            className="px-3 py-1 bg-white text-rose-700 rounded-lg text-xs font-bold hover:bg-slate-100 transition-colors shrink-0 ml-3 cursor-pointer"
          >
            Restore Fullscreen
          </button>
        </div>
      )}


      {/* MAIN ARENA WORKSPACE */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT 2 COLS: QUESTION DISPLAY */}
        <div className="lg:col-span-2 flex flex-col space-y-4">
          <QuestionCard
            question={currentQ}
            currentIndex={currentQuestionIndex}
            totalQuestions={examData.questions.length}
            currentAnswer={answers[currentQ.id]}
            onSelectOption={handleSelectOption}
            onToggleMarkReview={handleToggleMarkReview}
            onNext={() => {
              if (currentQuestionIndex < examData.questions.length - 1) {
                setCurrentQuestionIndex((prev) => prev + 1);
              }
            }}
            onPrevious={() => {
              if (currentQuestionIndex > 0) {
                setCurrentQuestionIndex((prev) => prev - 1);
              }
            }}
            hasPrevious={currentQuestionIndex > 0}
            hasNext={currentQuestionIndex < examData.questions.length - 1}
          />
        </div>

        {/* RIGHT 1 COL: PROCTORING FEED & PALETTE */}
        <div className="space-y-6 flex flex-col">
          {/* Live Continuous Proctor Feed */}
          <ProctoringFeed
            videoRef={videoRef}
            detection={detection}
            trustScore={trustScore}
            violationCount={violationCount}
            warningMessage={warningMessage}
          />

          {/* Question Status Palette */}
          <QuestionPalette
            questions={examData.questions}
            currentIndex={currentQuestionIndex}
            answers={answers}
            onSelectQuestion={(idx) => setCurrentQuestionIndex(idx)}
          />
        </div>
      </div>

      {/* SUBMISSION CONFIRMATION MODAL */}
      <SubmitConfirmModal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        onConfirm={handleFinalSubmit}
        isSubmitting={isSubmitting}
        totalQuestions={examData.questions.length}
        answeredCount={answeredCount}
        markedCount={markedCount}
        unansweredCount={unansweredCount}
      />

    </div>
  );
};
