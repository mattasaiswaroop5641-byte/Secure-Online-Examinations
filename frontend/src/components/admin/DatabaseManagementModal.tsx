import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { adminDbService, DatabaseActionResponse } from '../../services/admin_db';
import {
  Database,
  AlertTriangle,
  Trash2,
  RotateCcw,
  ShieldAlert,
  CheckCircle2,
  Lock,
  RefreshCw,
} from 'lucide-react';

interface DatabaseManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const DatabaseManagementModal: React.FC<DatabaseManagementModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [selectedAction, setSelectedAction] = useState<
    'clear_attempts' | 'reset_and_reseed' | 'drop_database'
  >('clear_attempts');
  const [confirmText, setConfirmText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DatabaseActionResponse | null>(null);

  const getRequiredCode = () => {
    if (selectedAction === 'drop_database') return 'DROP_DATABASE';
    return 'CONFIRM_DATABASE_RESET';
  };

  const isCodeMatched = confirmText.trim().toUpperCase() === getRequiredCode();

  const handleExecuteAction = async () => {
    if (!isCodeMatched || isLoading) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await adminDbService.performAction(selectedAction, confirmText.trim());
      setResult(res);
      setConfirmText('');
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.message || 'Database operation failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Database Maintenance & System Reset"
      maxWidth="max-w-2xl"
    >
      <div className="space-y-6">
        {/* Warning Alert */}
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start space-x-3">
          <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-bold text-rose-700 uppercase tracking-wider">
              High-Privilege Administrative Zone
            </p>
            <p className="text-slate-600 leading-relaxed">
              These operations directly modify or wipe collections in MongoDB Atlas. Actions cannot be undone. Please select your desired maintenance operation carefully.
            </p>
          </div>
        </div>

        {/* Action Selection Cards */}
        <div className="space-y-3">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Select Database Action:
          </label>

          {/* Option 1: Clear Attempts */}
          <div
            onClick={() => {
              setSelectedAction('clear_attempts');
              setResult(null);
              setError(null);
            }}
            className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-start space-x-3.5 ${
              selectedAction === 'clear_attempts'
                ? 'bg-amber-50 border-amber-400 shadow-sm'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <div
              className={`p-2.5 rounded-xl shrink-0 ${
                selectedAction === 'clear_attempts'
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              <Trash2 className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-bold text-slate-900">
                  Purge Candidate Attempts & Proctoring Incidents
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                  Recommended for Testing
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Clears all candidate test attempts, answer logs, and proctoring incidents. Preserves all user accounts, exams, and the question bank intact.
              </p>
            </div>
          </div>

          {/* Option 2: Reset & Re-Seed */}
          <div
            onClick={() => {
              setSelectedAction('reset_and_reseed');
              setResult(null);
              setError(null);
            }}
            className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-start space-x-3.5 ${
              selectedAction === 'reset_and_reseed'
                ? 'bg-blue-50 border-blue-400 shadow-sm'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <div
              className={`p-2.5 rounded-xl shrink-0 ${
                selectedAction === 'reset_and_reseed'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              <RotateCcw className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-bold text-slate-900">
                  Reset & Re-Seed Default System
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                  Full Clean Slate
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Wipes all existing collections and re-seeds default admin (<code className="text-blue-700 font-semibold">mattasaiswaroop5641@gmail.com</code>), examiner, demo questions, and sample proctored examination.
              </p>
            </div>
          </div>

          {/* Option 3: Drop Database */}
          <div
            onClick={() => {
              setSelectedAction('drop_database');
              setResult(null);
              setError(null);
            }}
            className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-start space-x-3.5 ${
              selectedAction === 'drop_database'
                ? 'bg-rose-50 border-rose-400 shadow-sm'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <div
              className={`p-2.5 rounded-xl shrink-0 ${
                selectedAction === 'drop_database'
                  ? 'bg-rose-100 text-rose-700'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              <Database className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-bold text-rose-700">
                  Drop Database Collections
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                  Danger
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Wipes all collections and re-initializes collection indexes and your primary admin account so you remain authenticated.
              </p>
            </div>
          </div>
        </div>

        {/* Confirmation Input */}
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
          <label className="block text-xs font-semibold text-slate-700">
            Type <span className="font-mono text-rose-600 font-bold">{getRequiredCode()}</span> to confirm:
          </label>
          <div className="flex items-center space-x-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={getRequiredCode()}
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-rose-500 placeholder:text-slate-400"
              />
            </div>
            {isCodeMatched && (
              <span className="text-emerald-700 flex items-center space-x-1 text-xs font-bold px-2 py-1 bg-emerald-50 border border-emerald-200 rounded-lg">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Confirmed</span>
              </span>
            )}
          </div>
        </div>

        {/* Error / Result Display */}
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {result && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs space-y-2">
            <div className="flex items-center space-x-2 font-bold text-emerald-700">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{result.message}</span>
            </div>
            <pre className="p-2.5 bg-white border border-emerald-200 rounded-xl text-[11px] font-mono text-slate-700 overflow-x-auto">
              {JSON.stringify(result.details, null, 2)}
            </pre>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer border border-slate-200"
          >
            Close
          </button>

          <button
            type="button"
            onClick={handleExecuteAction}
            disabled={!isCodeMatched || isLoading}
            className="flex items-center space-x-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-md shadow-rose-600/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Executing Maintenance...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                <span>Execute Database Operation</span>
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};
