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
    <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-2xl w-full mx-auto shadow-xl">
      <div className="text-center mb-6">
        <span className="text-xs uppercase font-bold tracking-widest text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
          Step 4 of 5
        </span>
        <h3 className="text-xl font-bold text-slate-900 tracking-tight mt-2">Examination Rules & Privacy Notice</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
          Please review the academic integrity standards and continuous monitoring disclosure for {examTitle}.
        </p>
      </div>

      {/* Rules Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-start space-x-3">
          <div className="p-2 rounded-lg bg-blue-50 text-blue-600 shrink-0 border border-blue-100">
            <Eye className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900">Continuous Face Visibility</h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Your face must remain clearly visible and centered. Looking away for prolonged intervals will be flagged.
            </p>
          </div>
        </div>

        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-start space-x-3">
          <div className="p-2 rounded-lg bg-purple-50 text-purple-600 shrink-0 border border-purple-100">
            <Maximize2 className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900">Mandatory Fullscreen</h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              The test runs in locked fullscreen. Exiting fullscreen or resizing the window registers an incident.
            </p>
          </div>
        </div>

        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-start space-x-3">
          <div className="p-2 rounded-lg bg-rose-50 text-rose-600 shrink-0 border border-rose-100">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900">No Secondary Persons</h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Multiple people appearing on camera triggers an immediate critical security alert.
            </p>
          </div>
        </div>

        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-start space-x-3">
          <div className="p-2 rounded-lg bg-amber-50 text-amber-600 shrink-0 border border-amber-100">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900">No Tab Switching or Copying</h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Clipboard operations and tab switching are locked. Server-authoritative timer submits on expiry.
            </p>
          </div>
        </div>
      </div>

      {/* Privacy Notice Box */}
      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 mb-6 space-y-2 text-xs text-slate-600 leading-relaxed">
        <p className="font-semibold text-slate-900 flex items-center space-x-1.5">
          <ShieldCheck className="w-4 h-4 text-blue-600 inline" />
          <span>Biometric & Proctoring Privacy Disclosure</span>
        </p>
        <p className="text-[11px]">
          Webcam stream processing is performed securely for examination integrity. Still-image evidence frames are
          captured solely when significant suspicious activity (e.g. multiple faces or prolonged absence) is detected.
          Images and audit records are strictly confidential and accessible only to authorized examination staff.
        </p>
      </div>

      {/* Consent Checkbox */}
      <label className="flex items-start space-x-3 p-3.5 bg-blue-50 border border-blue-200 rounded-xl cursor-pointer hover:bg-blue-100/50 transition-colors mb-6">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-0.5 w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 bg-white"
        />
        <span className="text-xs text-slate-800 font-medium leading-normal select-none">
          I have read and agree to the examination rules. I understand and consent to continuous webcam proctoring,
          forensic event logging, and screenshot evidence capture as described above.
        </span>
      </label>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-200">
        <button
          onClick={onBack}
          className="px-4 py-2 text-sm text-slate-500 hover:text-slate-800 transition-colors"
        >
          Back
        </button>

        <button
          disabled={!agreed}
          onClick={onConsent}
          className={`flex items-center space-x-2 px-6 py-2.5 rounded-xl font-semibold text-sm transition-all ${
            agreed
              ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20 cursor-pointer'
              : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
          }`}
        >
          <Maximize2 className="w-4 h-4" />
          <span>Enter Fullscreen & Begin Exam</span>
        </button>
      </div>
    </div>
  );
};
