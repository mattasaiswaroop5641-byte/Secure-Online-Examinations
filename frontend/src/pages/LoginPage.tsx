import React, { useState } from 'react';
import { ShieldCheck, Lock, Mail, ArrowRight, AlertCircle, Smartphone, ArrowLeft, KeyRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface LoginPageProps {
  onNavigate: (view: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onNavigate }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [is2FAStep, setIs2FAStep] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await login(email, password);
      if (res.requires_2fa) {
        setIs2FAStep(true);
      } else if (res.user) {
        if (res.user.role === 'student') {
          onNavigate('student-dashboard');
        } else {
          onNavigate('admin-dashboard');
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Incorrect email or password.');
    } finally {
      setIsLoading(false);
    }
  };

  const handle2FASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || otpCode.length < 6) {
      setErrorMessage('Please enter the full 6-digit verification code.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await login(email, password, otpCode.trim());
      if (res.user) {
        if (res.user.role === 'student') {
          onNavigate('student-dashboard');
        } else {
          onNavigate('admin-dashboard');
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid or expired 2FA code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-blue-50/50 via-slate-50 to-white">
      <div className="max-w-md w-full bg-white border border-slate-200 rounded-3xl p-8 shadow-xl relative overflow-hidden">
        {/* Subtle glow */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500/10 blur-3xl rounded-full pointer-events-none" />

        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex p-3 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 mb-3 shadow-md shadow-blue-500/10">
            {is2FAStep ? <Smartphone className="w-8 h-8 text-emerald-600" /> : <ShieldCheck className="w-8 h-8 text-blue-600" />}
          </div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            {is2FAStep ? 'Two-Factor Verification' : 'Sign In to ExamShield'}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {is2FAStep
              ? 'Enter the 6-digit code from Google Authenticator.'
              : 'Access proctored examinations or manage institutional assessments.'}
          </p>
        </div>

        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs mb-4 flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {!is2FAStep ? (
          /* Step 1: Email and Password Form */
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-white border border-slate-300 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-blue-600 transition-colors shadow-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-white border border-slate-300 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-blue-600 transition-colors shadow-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-md shadow-blue-600/25 transition-all flex items-center justify-center space-x-2 cursor-pointer mt-2"
            >
              {isLoading ? (
                <span>Verifying Credentials...</span>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        ) : (
          /* Step 2: 2FA Google Authenticator Code Form */
          <form onSubmit={handle2FASubmit} className="space-y-4">
            <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-2xl text-center">
              <div className="flex items-center justify-center space-x-2 text-blue-700 text-xs font-semibold mb-1">
                <KeyRound className="w-4 h-4" />
                <span>Google Authenticator / TOTP</span>
              </div>
              <p className="text-[11px] text-slate-600">
                Securing account for <span className="text-slate-900 font-mono font-bold">{email}</span>
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 text-center">
                6-Digit Authentication Code
              </label>
              <input
                type="text"
                autoFocus
                inputMode="numeric"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                className="w-full bg-white border border-blue-400 rounded-2xl py-3 text-center text-2xl tracking-[0.3em] font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:tracking-normal placeholder:text-slate-400 shadow-sm"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || otpCode.length < 6}
              className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm shadow-md shadow-emerald-600/25 transition-all flex items-center justify-center space-x-2 cursor-pointer"
            >
              {isLoading ? (
                <span>Authenticating 2FA...</span>
              ) : (
                <>
                  <span>Verify & Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setIs2FAStep(false);
                setOtpCode('');
                setErrorMessage(null);
              }}
              className="w-full py-2 text-xs text-slate-500 hover:text-slate-800 flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to password</span>
            </button>
          </form>
        )}

        <div className="mt-6 text-center text-xs text-slate-500">
          Don't have an account?{' '}
          <button
            onClick={() => onNavigate('register')}
            className="font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
          >
            Register as Candidate
          </button>
        </div>
      </div>
    </div>
  );
};
