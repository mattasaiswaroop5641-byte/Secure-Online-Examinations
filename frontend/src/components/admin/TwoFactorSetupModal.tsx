import React, { useState, useEffect } from 'react';
import { ShieldCheck, Smartphone, Copy, Check, AlertCircle, X, QrCode } from 'lucide-react';
import { authService } from '../../services/auth';
import { TwoFactorSetupResponse } from '../../types';

interface TwoFactorSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const TwoFactorSetupModal: React.FC<TwoFactorSetupModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [setupData, setSetupData] = useState<TwoFactorSetupResponse | null>(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadSetupData();
    } else {
      setSetupData(null);
      setVerifyCode('');
      setErrorMessage(null);
      setSuccessMessage(null);
      setCopied(false);
    }
  }, [isOpen]);

  const loadSetupData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await authService.setup2FA();
      setSetupData(data);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to initialize 2FA setup.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopySecret = () => {
    if (setupData?.secret) {
      navigator.clipboard.writeText(setupData.secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleVerifyAndEnable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyCode || verifyCode.length < 6) {
      setErrorMessage('Please enter the full 6-digit code from Google Authenticator.');
      return;
    }

    setIsVerifying(true);
    setErrorMessage(null);
    try {
      const res = await authService.enable2FA(verifyCode.trim());
      setSuccessMessage(res.message || 'Google Authenticator 2FA activated successfully!');
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (err: any) {
      setErrorMessage(err.message || 'Verification failed. Please ensure the code is current.');
    } finally {
      setIsVerifying(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-3xl p-6 sm:p-8 shadow-2xl relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center space-x-3 mb-5">
          <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl text-indigo-400">
            <Smartphone className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white tracking-tight">Setup Google Authenticator (2FA)</h3>
            <p className="text-xs text-slate-400">Enhance admin portal security with Time-based One-Time Passwords.</p>
          </div>
        </div>

        {errorMessage && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-xs mb-4 flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-300 text-xs mb-4 flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successMessage}</span>
          </div>
        )}

        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-3 text-slate-400">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs">Generating secure authenticator QR code...</p>
          </div>
        ) : setupData ? (
          <div className="space-y-5">
            {/* Step 1: Scan QR */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-center space-x-2 text-xs font-semibold text-slate-200">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white inline-flex items-center justify-center text-[10px]">
                  1
                </span>
                <span>Scan QR code with Google Authenticator or Microsoft Authenticator:</span>
              </div>

              <div className="flex flex-col sm:flex-row items-center sm:space-x-4 space-y-3 sm:space-y-0 pt-1">
                <div className="bg-white p-2.5 rounded-2xl shadow-lg shrink-0">
                  <img src={setupData.qr_code} alt="2FA QR Code" className="w-36 h-36 object-contain" />
                </div>
                <div className="space-y-2 text-left">
                  <p className="text-[11px] text-slate-400">
                    Can't scan the QR code? You can manually type this secret key into your authenticator app:
                  </p>
                  <div className="flex items-center space-x-2 bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 font-mono text-xs text-indigo-300 select-all">
                    <span className="truncate">{setupData.secret}</span>
                    <button
                      type="button"
                      onClick={handleCopySecret}
                      className="p-1 text-slate-400 hover:text-white rounded transition-colors shrink-0"
                      title="Copy Key"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 2: Confirm 6-digit Code */}
            <form onSubmit={handleVerifyAndEnable} className="space-y-3">
              <div className="flex items-center space-x-2 text-xs font-semibold text-slate-200">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white inline-flex items-center justify-center text-[10px]">
                  2
                </span>
                <span>Enter 6-digit verification code from the app:</span>
              </div>

              <div className="flex space-x-3">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  className="flex-1 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-center text-lg tracking-[0.25em] font-mono text-white focus:outline-none transition-colors"
                />
                <button
                  type="submit"
                  disabled={isVerifying || verifyCode.length < 6}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-xs rounded-xl shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
                >
                  {isVerifying ? 'Verifying...' : 'Enable 2FA'}
                </button>
              </div>
            </form>
          </div>
        ) : null}
      </div>
    </div>
  );
};
