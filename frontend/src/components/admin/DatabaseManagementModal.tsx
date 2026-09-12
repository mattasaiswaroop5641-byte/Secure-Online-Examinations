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
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-start space-x-3">
          <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-bold text-rose-300 uppercase tracking-wider">
              High-Privilege Administrative Zone
            </p>
            <p className="text-slate-300 leading-relaxed">
              These operations directly modify or wipe collections in MongoDB Atlas. Actions cannot be undone. Please select your desired maintenance operation carefully.
            </p>
          </div>
        </div>

        {/* Action Selection Cards */}
        <div className="space-y-3">
          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
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
                ? 'bg-amber-500/10 border-amber-500/50 shadow-lg shadow-amber-500/5'
                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div
              className={`p-2.5 rounded-xl shrink-0 ${
                selectedAction === 'clear_attempts'
                  ? 'bg-amber-500/20 text-amber-300'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              <Trash2 className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-bold text-white">
                  Purge Candidate Attempts & Proctoring Incidents
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Recommended for Testing
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
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
                ? 'bg-indigo-500/10 border-indigo-500/50 shadow-lg shadow-indigo-500/5'
                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div
              className={`p-2.5 rounded-xl shrink-0 ${
                selectedAction === 'reset_and_reseed'
                  ? 'bg-indigo-500/20 text-indigo-300'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              <RotateCcw className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-bold text-white">
                  Reset & Re-Seed Default System
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Full Clean Slate
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Wipes all existing collections and re-seeds default admin (<code className="text-indigo-300">mattasaiswaroop5641@gmail.com</code>), examiner, demo questions, and sample proctored examination.
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
                ? 'bg-rose-500/10 border-rose-500/50 shadow-lg shadow-rose-500/5'
                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div
              className={`p-2.5 rounded-xl shrink-0 ${
                selectedAction === 'drop_database'
                  ? 'bg-rose-500/20 text-rose-400'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              <Database className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-bold text-rose-300">
                  Drop Database Collections
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  Danger
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Wipes all collections and re-initializes collection indexes and your primary admin account so you remain authenticated.
              </p>
            </div>
          </div>
        </div>

        {/* Confirmation Input */}
        <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
          <label className="block text-xs font-semibold text-slate-300">
            Type <span className="font-mono text-rose-400 font-bold">{getRequiredCode()}</span> to confirm:
          </label>
          <div className="flex items-center space-x-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={getRequiredCode()}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs font-mono text-white focus:outline-none focus:border-rose-500"
              />
            </div>
            {isCodeMatched && (
              <span className="text-emerald-400 flex items-center space-x-1 text-xs font-bold px-2 py-1 bg-emerald-500/10 rounded-lg">
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirmed</span>
              </span>
            )}
          </div>
        </div>

        {/* Error / Result Display */}
        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-xs flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {result && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-300 text-xs space-y-2">
            <div className="flex items-center space-x-2 font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{result.message}</span>
            </div>
            <pre className="p-2.5 bg-slate-950/80 rounded-xl text-[11px] font-mono text-slate-300 overflow-x-auto">
              {JSON.stringify(result.details, null, 2)}
            </pre>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
          >
            Close
          </button>

          <button
            type="button"
            onClick={handleExecuteAction}
            disabled={!isCodeMatched || isLoading}
            className="flex items-center space-x-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-rose-600/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
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
