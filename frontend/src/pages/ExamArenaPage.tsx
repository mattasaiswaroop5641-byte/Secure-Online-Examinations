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
    isActive: !isLoading && Boolean(examData),
  });

  // Anti-Cheating & Fullscreen Lockdown Hook
  const {
    isFullscreen,
    fullscreenWarning,
    requestFullscreen,
    exitFullscreen,
    dismissFullscreenWarning,
  } = useAntiCheating({
    isActive: !isLoading && Boolean(examData),
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
    if (!examData) return;
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
    if (!examData) return;
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

  // Submission handler
  const handleFinalSubmit = useCallback(async () => {
    if (!examData || isSubmitting) return;
    setIsSubmitting(true);

    try {
      // Stop webcam stream tracks
      if (mediaStream) {
        mediaStream.getTracks().forEach((t) => t.stop());
      }
      // Exit fullscreen mode
      await exitFullscreen();

      // Authoritative evaluation on backend
      const result = await attemptService.submitExam(examData.attempt_id);
      onFinishExam(result.attempt_id);
    } catch (err: any) {
      console.error('Submission failed:', err);
      setErrorMessage(err.message || 'Failed to submit examination.');
      setIsSubmitting(false);
    }
  }, [examData, isSubmitting, mediaStream, exitFullscreen, onFinishExam]);

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
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold"
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
      {/* Hidden/Hardware Video Element for CV tracking */}
      <video ref={videoRef} autoPlay playsInline muted className="hidden" />

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
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
          >
            Submit Exam
          </button>
        </div>
      </header>

      {/* Auto-Submit Notice Overlay Banner */}
      {autoSubmitNotice && (
        <div className="bg-rose-600 text-white px-4 py-2.5 text-center text-xs font-bold animate-pulse flex items-center justify-center space-x-2">
          <AlertTriangle className="w-4 h-4" />
          <span>{autoSubmitNotice}</span>
        </div>
      )}

      {/* Urgent Fullscreen Exit Recovery Overlay */}
      {fullscreenWarning && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-900 border-2 border-rose-500 rounded-3xl p-6 text-center space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center mx-auto">
              <Maximize2 className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-white">Fullscreen Mode Exited!</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Exiting fullscreen violates the secure testing environment. This incident has been logged.
              Please re-enter fullscreen immediately to continue your assessment.
            </p>
            <button
              onClick={() => {
                requestFullscreen();
                dismissFullscreenWarning();
              }}
              className="w-full py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm shadow-lg shadow-rose-600/25 transition-all cursor-pointer"
            >
              Resume Fullscreen Examination
            </button>
          </div>
        </div>
      )}

      {/* MAIN ARENA WORKSPACE */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden">
        {/* Left / Center Area: Question Card */}
        <div className="lg:col-span-8 flex flex-col h-full min-h-[500px]">
          <QuestionCard
            question={currentQ}
            currentIndex={currentQuestionIndex}
            totalQuestions={examData.questions.length}
            currentAnswer={answers[currentQ.id]}
            onSelectOption={handleSelectOption}
            onToggleMarkReview={handleToggleMarkReview}
            onPrevious={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
            onNext={() => {
              if (currentQuestionIndex < examData.questions.length - 1) {
                setCurrentQuestionIndex((prev) => prev + 1);
              } else {
                setIsSubmitModalOpen(true);
              }
            }}
            hasPrevious={currentQuestionIndex > 0}
            hasNext={currentQuestionIndex < examData.questions.length - 1}
          />
        </div>

        {/* Right Area: Question Palette & Floating Proctoring Feed */}
        <div className="lg:col-span-4 flex flex-col gap-5 h-full">
          {/* Continuous Proctoring Live Webcam PiP */}
          <div className="shrink-0">
            <ProctoringFeed
              videoRef={videoRef}
              detection={detection}
              trustScore={trustScore}
              violationCount={violationCount}
              warningMessage={warningMessage}
            />
          </div>

          {/* Question Navigator Palette */}
          <div className="flex-1 min-h-[280px]">
            <QuestionPalette
              questions={examData.questions}
              currentIndex={currentQuestionIndex}
              answers={answers}
              onSelectQuestion={(idx) => setCurrentQuestionIndex(idx)}
            />
          </div>
        </div>
      </div>

      {/* Submission Confirmation Modal */}
      <SubmitConfirmModal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        onConfirm={handleFinalSubmit}
        isSubmitting={isSubmitting}
        totalQuestions={examData.questions.length}
        answeredCount={answeredCount}
        unansweredCount={unansweredCount}
        markedCount={markedCount}
      />
    </div>
  );
};
