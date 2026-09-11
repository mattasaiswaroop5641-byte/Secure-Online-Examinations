import React, { useState } from 'react';
import { ShieldCheck, Check, AlertTriangle, Eye, Lock, Maximize2, ShieldAlert } from 'lucide-react';

interface RulesConsentStepProps {
  examTitle: string;
  durationMinutes: number;
  totalMarks: number;
  negativeMarking: boolean;
  onConsent: () => void;
  onBack: () => void;
}

export const RulesConsentStep: React.FC<RulesConsentStepProps> = ({
  examTitle,
  durationMinutes,
  totalMarks,
  negativeMarking,
  onConsent,
  onBack,
}) => {
  const [agreed, setAgreed] = useState<boolean>(false);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-2xl w-full mx-auto shadow-2xl">
      <div className="text-center mb-6">
        <span className="text-xs uppercase font-bold tracking-widest text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
          Step 4 of 5
        </span>
        <h3 className="text-xl font-bold text-white tracking-tight mt-2">Examination Rules & Privacy Notice</h3>
        <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
          Please review the academic integrity standards and continuous monitoring disclosure for {examTitle}.
        </p>
      </div>

      {/* Rules Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800 flex items-start space-x-3">
          <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 shrink-0">
            <Eye className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-200">Continuous Face Visibility</h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Your face must remain clearly visible and centered. Looking away for prolonged intervals will be flagged.
            </p>
          </div>
        </div>

        <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800 flex items-start space-x-3">
          <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 shrink-0">
            <Maximize2 className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-200">Mandatory Fullscreen</h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              The test runs in locked fullscreen. Exiting fullscreen or resizing the window registers an incident.
            </p>
          </div>
        </div>

        <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800 flex items-start space-x-3">
          <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 shrink-0">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-200">No Secondary Persons</h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Multiple people appearing on camera triggers an immediate critical security alert.
            </p>
          </div>
        </div>

        <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800 flex items-start space-x-3">
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 shrink-0">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-200">No Tab Switching or Copying</h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Clipboard operations and tab switching are locked. Server-authoritative timer submits on expiry.
            </p>
          </div>
        </div>
      </div>

      {/* Privacy Notice Box */}
      <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 mb-6 space-y-2 text-xs text-slate-400 leading-relaxed">
        <p className="font-semibold text-slate-300 flex items-center space-x-1.5">
          <ShieldCheck className="w-4 h-4 text-cyan-400 inline" />
          <span>Biometric & Proctoring Privacy Disclosure</span>
        </p>
        <p className="text-[11px]">
          Webcam stream processing is performed securely for examination integrity. Still-image evidence frames are
          captured solely when significant suspicious activity (e.g. multiple faces or prolonged absence) is detected.
          Images and audit records are strictly confidential and accessible only to authorized examination staff.
        </p>
      </div>

      {/* Consent Checkbox */}
      <label className="flex items-start space-x-3 p-3.5 bg-indigo-950/30 border border-indigo-500/30 rounded-xl cursor-pointer hover:bg-indigo-950/40 transition-colors mb-6">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-0.5 w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-700 bg-slate-900"
        />
        <span className="text-xs text-slate-200 font-medium leading-normal select-none">
          I have read and agree to the examination rules. I understand and consent to continuous webcam proctoring,
          forensic event logging, and screenshot evidence capture as described above.
        </span>
      </label>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-800">
        <button
          onClick={onBack}
          className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
        >
          Back
        </button>

        <button
          disabled={!agreed}
          onClick={onConsent}
          className={`flex items-center space-x-2 px-6 py-2.5 rounded-xl font-semibold text-sm transition-all ${
            agreed
              ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/25 cursor-pointer'
              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
          }`}
        >
          <Maximize2 className="w-4 h-4" />
          <span>Enter Fullscreen & Begin Exam</span>
        </button>
      </div>
    </div>
  );
};
