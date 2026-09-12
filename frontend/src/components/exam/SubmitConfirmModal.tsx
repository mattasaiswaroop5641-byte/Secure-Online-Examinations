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
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
            <div className="flex items-center justify-center text-emerald-600 mb-1">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <p className="text-xl font-bold text-emerald-700">{answeredCount}</p>
            <p className="text-[11px] text-emerald-600 font-medium">Answered</p>
          </div>

          <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-center">
            <div className="flex items-center justify-center text-purple-600 mb-1">
              <Bookmark className="w-4 h-4" />
            </div>
            <p className="text-xl font-bold text-purple-700">{markedCount}</p>
            <p className="text-[11px] text-purple-600 font-medium">Marked</p>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
            <div className="flex items-center justify-center text-slate-500 mb-1">
              <HelpCircle className="w-4 h-4" />
            </div>
            <p className="text-xl font-bold text-slate-800">{unansweredCount}</p>
            <p className="text-[11px] text-slate-500 font-medium">Unanswered</p>
          </div>
        </div>

        {/* Warning if unanswered */}
        {unansweredCount > 0 && (
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start space-x-2.5 text-xs text-amber-800">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">You have {unansweredCount} unanswered questions!</span>
              <p className="mt-0.5 text-amber-700">
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
            className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
          >
            Return to Exam
          </button>

          <button
            disabled={isSubmitting}
            onClick={onConfirm}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-md shadow-blue-600/20 transition-all flex items-center space-x-2 cursor-pointer"
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
