import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { attemptService } from '../../services/attempts';
import { ShieldAlert, AlertTriangle, CheckCircle2, UserX, X } from 'lucide-react';

interface KickCandidateModalProps {
  isOpen: boolean;
  onClose: () => void;
  attemptId: number;
  candidateName?: string;
  examTitle?: string;
  onSuccess: () => void;
}

const PRESET_REASONS = [
  'Severe proctoring violation: Multiple individuals / secondary face detected in exam area.',
  'Severe proctoring violation: Candidate persistent absence / camera obstruction.',
  'Severe anti-cheating violation: Repeated unauthorized application switching (Alt+Tab) / DevTools suspect.',
  'Academic dishonesty confirmed after forensic snapshot evidence review.',
];

export const KickCandidateModal: React.FC<KickCandidateModalProps> = ({
  isOpen,
  onClose,
  attemptId,
  candidateName,
  examTitle,
  onSuccess,
}) => {
  const [selectedPreset, setSelectedPreset] = useState<string>(PRESET_REASONS[0]);
  const [customReason, setCustomReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleKick = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalReason = customReason.trim() ? customReason.trim() : selectedPreset;
    if (!finalReason) {
      setErrorMessage('Please provide a termination justification.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await attemptService.kickAttempt(attemptId, finalReason);
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to kick candidate. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Disqualify & Kick Candidate"
      subtitle={`Attempt #${attemptId} ${candidateName ? `• Candidate: ${candidateName}` : ''}`}
      maxWidth="max-w-xl"
    >
      <form onSubmit={handleKick} className="space-y-5">
        {/* Warning Banner */}
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start space-x-3 text-rose-700 text-xs">
          <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold text-rose-800">Immediate Examination Termination</p>
            <p className="text-slate-600 leading-relaxed">
              This action will instantly lock the candidate's active exam session, disqualify their submission, mark the attempt as failed, and record a critical proctor violation audit record.
            </p>
          </div>
        </div>

        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Reason Presets */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-700">
            Violation Reason Preset
          </label>
          <div className="space-y-2">
            {PRESET_REASONS.map((preset) => (
              <label
                key={preset}
                className={`flex items-start space-x-3 p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                  selectedPreset === preset
                    ? 'bg-blue-50 border-blue-400 text-slate-900 font-medium'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="preset_reason"
                  checked={selectedPreset === preset}
                  onChange={() => setSelectedPreset(preset)}
                  className="w-4 h-4 mt-0.5 text-blue-600 focus:ring-blue-500 border-slate-300 bg-white"
                />
                <span className="leading-snug">{preset}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Custom Reason Overwrite */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Custom Notes / Specific Justification (Optional)
          </label>
          <textarea
            rows={2}
            value={customReason}
            onChange={(e) => setCustomReason(e.target.value)}
            placeholder="Additional details, timestamp reference, or custom instructions..."
            className="w-full bg-white border border-slate-300 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:border-rose-500 font-mono placeholder:text-slate-400"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center space-x-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md shadow-rose-600/20 transition-all cursor-pointer disabled:opacity-50"
          >
            <UserX className="w-4 h-4" />
            <span>{isSubmitting ? 'Terminating Exam...' : 'Confirm Kick & Disqualify'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
