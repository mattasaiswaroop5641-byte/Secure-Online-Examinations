import React from 'react';
import { Modal } from '../common/Modal';
import { AlertTriangle, CheckCircle2, Bookmark, HelpCircle } from 'lucide-react';

interface SubmitConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isSubmitting: boolean;
  totalQuestions: number;
  answeredCount: number;
  unansweredCount: number;
  markedCount: number;
}

export const SubmitConfirmModal: React.FC<SubmitConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isSubmitting,
  totalQuestions,
  answeredCount,
  unansweredCount,
  markedCount,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Confirm Final Examination Submission"
      subtitle="Once submitted, your answers will be finalized and evaluated."
      maxWidth="max-w-md"
    >
      <div className="space-y-5">
        {/* Statistics breakdown */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center">
            <div className="flex items-center justify-center text-emerald-400 mb-1">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <p className="text-xl font-bold text-emerald-300">{answeredCount}</p>
            <p className="text-[11px] text-emerald-400/80 font-medium">Answered</p>
          </div>

          <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl text-center">
            <div className="flex items-center justify-center text-purple-400 mb-1">
              <Bookmark className="w-4 h-4" />
            </div>
            <p className="text-xl font-bold text-purple-300">{markedCount}</p>
            <p className="text-[11px] text-purple-400/80 font-medium">Marked</p>
          </div>

          <div className="p-3 bg-slate-800/80 border border-slate-700 rounded-xl text-center">
            <div className="flex items-center justify-center text-slate-400 mb-1">
              <HelpCircle className="w-4 h-4" />
            </div>
            <p className="text-xl font-bold text-slate-300">{unansweredCount}</p>
            <p className="text-[11px] text-slate-400 font-medium">Unanswered</p>
          </div>
        </div>

        {/* Warning if unanswered */}
        {unansweredCount > 0 && (
          <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start space-x-2.5 text-xs text-amber-300">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">You have {unansweredCount} unanswered questions!</span>
              <p className="mt-0.5 text-amber-400/80">
                Are you sure you want to finish now? Any unanswered questions will receive 0 points.
              </p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-3 pt-2">
          <button
            disabled={isSubmitting}
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
          >
            Return to Exam
          </button>

          <button
            disabled={isSubmitting}
            onClick={onConfirm}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/20 transition-all flex items-center space-x-2"
          >
            {isSubmitting ? (
              <span>Submitting & Evaluating...</span>
            ) : (
              <span>Yes, Submit Examination</span>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};
