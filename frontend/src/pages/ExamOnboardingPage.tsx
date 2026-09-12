import React, { useState, useEffect } from 'react';
import { examService } from '../services/exams';
import { Exam } from '../types';
import { SystemCheckModal } from '../components/exam/SystemCheckModal';
import { FaceVerificationStep } from '../components/exam/FaceVerificationStep';
import { RulesConsentStep } from '../components/exam/RulesConsentStep';
import {
  Clock,
  Award,
  AlertCircle,
  ShieldCheck,
  CheckCircle2,
  Maximize2,
  ArrowRight,
  BookOpen,
} from 'lucide-react';

interface ExamOnboardingPageProps {
  examId: number;
  onReadyToEnter: (stream: MediaStream) => void;
  onCancel: () => void;
}

type OnboardingStep = 'overview' | 'system_check' | 'face_verification' | 'rules_consent';

export const ExamOnboardingPage: React.FC<ExamOnboardingPageProps> = ({
  examId,
  onReadyToEnter,
  onCancel,
}) => {
  const [exam, setExam] = useState<Exam | null>(null);
  const [step, setStep] = useState<OnboardingStep>('overview');
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadExam() {
      try {
        const data = await examService.getExam(examId);
        setExam(data);
      } catch (err: any) {
        setErrorMessage(err.message || 'Unable to load examination configuration.');
      } finally {
        setIsLoading(false);
      }
    }
    loadExam();
  }, [examId]);

  // Handle system check pass
  const handleSystemPassed = (stream: MediaStream) => {
    setMediaStream(stream);
    setStep('face_verification');
  };

  // Handle face verification pass
  const handleFaceVerified = () => {
    setStep('rules_consent');
  };

  // Handle final consent and launch
  const handleLaunch = () => {
    if (mediaStream) {
      onReadyToEnter(mediaStream);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500">Preparing examination environment...</p>
        </div>
      </div>
    );
  }

  if (errorMessage || !exam) {
    return (
      <div className="max-w-md mx-auto my-16 p-6 bg-white border border-slate-200 shadow-lg rounded-3xl text-center">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-900">Examination Unavailable</h3>
        <p className="text-xs text-slate-500 mt-1">{errorMessage || 'Could not find exam details.'}</p>
        <button
          onClick={onCancel}
          className="mt-5 px-4 py-2 rounded-xl bg-slate-100 text-xs font-semibold text-slate-700 hover:bg-slate-200 border border-slate-200"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      {/* Step Indicator Header */}
      <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-200">
        <div>
          <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">
            Verification Workflow
          </span>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight mt-1">
            {exam.title}
          </h2>
        </div>

        <div className="hidden sm:flex items-center space-x-2">
          {['Overview', 'System Check', 'Face Verification', 'Rules & Consent'].map((label, idx) => {
            const stepIndex =
              step === 'overview'
                ? 0
                : step === 'system_check'
                ? 1
                : step === 'face_verification'
                ? 2
                : 3;
            const isDone = idx < stepIndex;
            const isCurrent = idx === stepIndex;

            return (
              <div key={label} className="flex items-center space-x-1.5 text-xs">
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] ${
                    isDone
                      ? 'bg-emerald-600 text-white'
                      : isCurrent
                      ? 'bg-blue-600 text-white ring-2 ring-blue-400/40'
                      : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {isDone ? '✓' : idx + 1}
                </span>
                {idx < 3 && <div className="w-4 h-0.5 bg-slate-200" />}
              </div>
            );
          })}
        </div>
      </div>

      {/* STEP 1: Overview */}
      {step === 'overview' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm space-y-6">
          <div>
            <span className="text-xs uppercase font-bold text-slate-500 tracking-wider">
              Subject: {exam.subject}
            </span>
            <h3 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
              Examination Instructions & Scope
            </h3>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              {exam.description || 'Continuous computer vision proctoring is enforced throughout this evaluation.'}
            </p>
          </div>

          {/* Key Parameters */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
            <div className="space-y-0.5">
              <p className="text-slate-500">Duration</p>
              <p className="text-base font-bold text-slate-900">{exam.duration_minutes} Mins</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-slate-500">Total Marks</p>
              <p className="text-base font-bold text-emerald-600">{exam.total_marks}</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-slate-500">Passing Mark</p>
              <p className="text-base font-bold text-slate-900">{exam.passing_marks}</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-slate-500">Negative Mark</p>
              <p className="text-base font-bold text-amber-600">
                {exam.negative_marking ? `-${exam.negative_mark_value}` : 'None'}
              </p>
            </div>
          </div>

          {/* Detailed Instructions Box */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center space-x-1.5">
              <BookOpen className="w-4 h-4 text-blue-600" />
              <span>Assessment Rules</span>
            </h4>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-700 whitespace-pre-line leading-relaxed font-sans">
              {exam.instructions ||
                `1. Keep face visible at all times.\n2. Do not leave the examination screen or switch tabs.\n3. Continuous webcam proctoring is active.\n4. Server-authoritative timer will automatically submit when time expires.`}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm text-slate-500 hover:text-slate-800 transition-colors"
            >
              Cancel & Return
            </button>

            <button
              onClick={() => setStep('system_check')}
              className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-md shadow-blue-600/20 transition-all cursor-pointer"
            >
              <span>Begin System Verification</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: System Check */}
      {step === 'system_check' && (
        <SystemCheckModal
          onPass={handleSystemPassed}
          onCancel={() => setStep('overview')}
        />
      )}

      {/* STEP 3: Face Verification */}
      {step === 'face_verification' && (
        <FaceVerificationStep
          stream={mediaStream}
          onStreamUpdate={(s) => setMediaStream(s)}
          onVerified={handleFaceVerified}
          onBack={() => setStep('system_check')}
        />
      )}


      {/* STEP 4: Rules & Consent */}
      {step === 'rules_consent' && (
        <RulesConsentStep
          examTitle={exam.title}
          durationMinutes={exam.duration_minutes}
          totalMarks={exam.total_marks}
          negativeMarking={exam.negative_marking}
          onConsent={handleLaunch}
          onBack={() => setStep('face_verification')}
        />
      )}
    </div>
  );
};
