import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/common/Navbar';
import { Footer } from './components/common/Footer';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { StudentDashboard } from './pages/StudentDashboard';
import { ExamOnboardingPage } from './pages/ExamOnboardingPage';
import { ExamArenaPage } from './pages/ExamArenaPage';
import { ResultPage } from './pages/ResultPage';

// Admin Pages
import { AdminSidebar } from './components/admin/AdminSidebar';
import { AdminOverviewPage } from './pages/admin/AdminOverviewPage';
import { ExamManagementPage } from './pages/admin/ExamManagementPage';
import { QuestionBankPage } from './pages/admin/QuestionBankPage';
import { AttemptReviewPage } from './pages/admin/AttemptReviewPage';
import { ProctoringReportsPage } from './pages/admin/ProctoringReportsPage';
import { TwoFactorSetupModal } from './components/admin/TwoFactorSetupModal';
import { DatabaseManagementModal } from './components/admin/DatabaseManagementModal';
import { ShieldCheck, Sliders, CheckCircle2, Smartphone, ShieldAlert, KeyRound, Lock, AlertCircle, Database, Trash2 } from 'lucide-react';
import { authService } from './services/auth';

const AppContent: React.FC = () => {
  const { user, refreshUser, isLoading } = useAuth();
  const [currentView, setCurrentView] = useState<string>('landing');
  const [selectedExamId, setSelectedExamId] = useState<number | null>(null);
  const [selectedAttemptId, setSelectedAttemptId] = useState<number | null>(null);
  const [activeMediaStream, setActiveMediaStream] = useState<MediaStream | null>(null);
  const [adminTab, setAdminTab] = useState<string>('overview');

  // 2FA modal & state
  const [is2FAModalOpen, setIs2FAModalOpen] = useState<boolean>(false);
  const [disable2FACode, setDisable2FACode] = useState<string>('');
  const [isDisabling2FA, setIsDisabling2FA] = useState<boolean>(false);
  const [disable2FAError, setDisable2FAError] = useState<string | null>(null);

  // Database Management modal state
  const [isDbModalOpen, setIsDbModalOpen] = useState<boolean>(false);

  // Settings local state
  const [gracePeriod, setGracePeriod] = useState<number>(3);
  const [warningThreshold, setWarningThreshold] = useState<number>(8);
  const [snapshotCaptureEnabled, setSnapshotCaptureEnabled] = useState<boolean>(true);
  const [settingsSavedNotice, setSettingsSavedNotice] = useState<boolean>(false);

  // If in arena, render clean fullscreen without header/footer
  if (currentView === 'arena' && selectedExamId && activeMediaStream) {
    return (
      <ExamArenaPage
        examId={selectedExamId}
        mediaStream={activeMediaStream}
        onFinishExam={(attemptId) => {
          setSelectedAttemptId(attemptId);
          setCurrentView('result');
        }}
      />
    );
  }

  const handleDisable2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disable2FACode || disable2FACode.length < 6) {
      setDisable2FAError('Please enter current 6-digit code to disable.');
      return;
    }

    setIsDisabling2FA(true);
    setDisable2FAError(null);
    try {
      await authService.disable2FA(disable2FACode.trim());
      await refreshUser();
      setDisable2FACode('');
    } catch (err: any) {
      setDisable2FAError(err.message || 'Invalid code.');
    } finally {
      setIsDisabling2FA(false);
    }
  };

  const renderAdminTabContent = () => {
    switch (adminTab) {
      case 'overview':
        return (
          <AdminOverviewPage
            onNavigateTab={(tab) => setAdminTab(tab)}
            onViewAttempt={(attemptId) => {
              setSelectedAttemptId(attemptId);
              setCurrentView('result');
            }}
          />
        );
      case 'exams':
        return <ExamManagementPage />;
      case 'questions':
        return <QuestionBankPage />;
      case 'attempts':
        return (
          <AttemptReviewPage
            onViewAttemptResult={(attemptId) => {
              setSelectedAttemptId(attemptId);
              setCurrentView('result');
            }}
          />
        );
      case 'proctoring':
        return <ProctoringReportsPage />;
      case 'settings':
        return (
          <div className="p-6 sm:p-8 space-y-6 max-w-3xl">
            <div>
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Security & System Configuration</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage Two-Factor Authentication (Google Authenticator) and proctoring thresholds.
              </p>
            </div>

            {/* 2FA Security Card */}
            <div className="p-6 bg-white border border-slate-200 rounded-3xl space-y-4 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`p-3 rounded-2xl ${user?.is_2fa_enabled ? 'bg-emerald-50 border border-emerald-200 text-emerald-600' : 'bg-amber-50 border border-amber-200 text-amber-600'}`}>
                    <Smartphone className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                      <span>Two-Factor Authentication (2FA)</span>
                      {user?.is_2fa_enabled ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Active 🔒
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          Not Enabled
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Protect your admin account with Google Authenticator / TOTP time-based one-time codes.
                    </p>
                  </div>
                </div>
              </div>

              {disable2FAError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{disable2FAError}</span>
                </div>
              )}

              <div className="pt-2">
                {!user?.is_2fa_enabled ? (
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-slate-800">Google Authenticator Setup</p>
                      <p className="text-[11px] text-slate-500">
                        Scan the setup QR code to require a 6-digit code on every admin login.
                      </p>
                    </div>
                    <button
                      onClick={() => setIs2FAModalOpen(true)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-md shadow-blue-600/20 transition-all cursor-pointer shrink-0"
                    >
                      Setup 2FA
                    </button>
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                    <div className="flex items-center space-x-2 text-emerald-600 text-xs font-semibold">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Google Authenticator is actively securing your login.</span>
                    </div>
                    <form onSubmit={handleDisable2FA} className="flex items-center space-x-2 pt-1">
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={disable2FACode}
                        onChange={(e) => setDisable2FACode(e.target.value.replace(/\D/g, ''))}
                        placeholder="Enter 6-digit code to disable"
                        className="flex-1 bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-rose-500"
                      />
                      <button
                        type="submit"
                        disabled={isDisabling2FA || disable2FACode.length < 6}
                        className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-300 font-semibold text-xs rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0"
                      >
                        {isDisabling2FA ? 'Disabling...' : 'Disable 2FA'}
                      </button>
                    </form>
                  </div>
                )}
              </div>
            </div>

            {/* Proctoring Thresholds Card */}
            {settingsSavedNotice && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Threshold settings updated successfully.</span>
              </div>
            )}

            <div className="p-6 bg-white border border-slate-200 rounded-3xl space-y-5 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900">Proctoring Calibration & Sensitivity</h3>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Absence / No-Face Grace Period (Seconds)
                </label>
                <input
                  type="number"
                  min={1}
                  max={15}
                  value={gracePeriod}
                  onChange={(e) => setGracePeriod(Number(e.target.value))}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 font-mono focus:outline-none focus:border-blue-600"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Candidate absence under this threshold is treated as natural momentary movement.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Incident Violation Duration Trigger (Seconds)
                </label>
                <input
                  type="number"
                  min={5}
                  max={30}
                  value={warningThreshold}
                  onChange={(e) => setWarningThreshold(Number(e.target.value))}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 font-mono focus:outline-none focus:border-blue-600"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Duration beyond which absence or attention shift logs a formal high-severity incident.
                </span>
              </div>

              <label className="flex items-center space-x-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={snapshotCaptureEnabled}
                  onChange={(e) => setSnapshotCaptureEnabled(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 bg-white"
                />
                <div>
                  <p className="text-xs font-semibold text-slate-800">Capture Forensic Snapshot on High Severity</p>
                  <p className="text-[11px] text-slate-500">
                    Automatically stores annotated webcam frames when multiple faces or prolonged absence occurs.
                  </p>
                </div>
              </label>

              <div className="pt-3 border-t border-slate-200 flex justify-end">
                <button
                  onClick={() => {
                    setSettingsSavedNotice(true);
                    setTimeout(() => setSettingsSavedNotice(false), 3000);
                  }}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-md shadow-blue-600/20 transition-all cursor-pointer"
                >
                  Save Configuration
                </button>
              </div>
            </div>

            {/* Database Maintenance & Drop DB Card (Admin Only) */}
            {user?.role === 'admin' && (
              <div className="p-6 bg-white border-2 border-rose-200 rounded-3xl space-y-4 shadow-sm">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600">
                      <Database className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                        <span>Database Maintenance & Drop Operations</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 uppercase">
                          Admin Only
                        </span>
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Purge test attempts, reset to baseline seed data, or perform database collection drops.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setIsDbModalOpen(true)}
                    className="flex items-center space-x-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-xl shadow-md shadow-rose-600/20 transition-all cursor-pointer shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Drop / Reset DB</span>
                  </button>
                </div>
              </div>
            )}

            {/* 2FA Setup Modal */}
            <TwoFactorSetupModal
              isOpen={is2FAModalOpen}
              onClose={() => setIs2FAModalOpen(false)}
              onSuccess={async () => {
                await refreshUser();
              }}
            />

            {/* Database Management Modal */}
            {isDbModalOpen && (
              <DatabaseManagementModal
                isOpen={isDbModalOpen}
                onClose={() => setIsDbModalOpen(false)}
                onSuccess={() => {
                  // reload if needed
                }}
              />
            )}
          </div>
        );
      default:
        return <AdminOverviewPage onNavigateTab={(t) => setAdminTab(t)} onViewAttempt={(id) => { setSelectedAttemptId(id); setCurrentView('result'); }} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <Navbar
        currentView={currentView}
        onNavigate={(view) => {
          setCurrentView(view);
          if (view === 'admin-dashboard') setAdminTab('overview');
          if (view === 'admin-exams') { setCurrentView('admin-dashboard'); setAdminTab('exams'); }
          if (view === 'admin-questions') { setCurrentView('admin-dashboard'); setAdminTab('questions'); }
        }}
      />

      <main className="flex-1">
        {currentView === 'landing' && (
          <LandingPage
            onNavigate={(view) => {
              setCurrentView(view);
            }}
          />
        )}

        {currentView === 'login' && (
          <LoginPage
            onNavigate={(view) => {
              setCurrentView(view);
            }}
          />
        )}

        {currentView === 'register' && (
          <RegisterPage
            onNavigate={(view) => {
              setCurrentView(view);
            }}
          />
        )}

        {currentView === 'student-dashboard' && (
          <StudentDashboard
            onStartExam={(examId) => {
              setSelectedExamId(examId);
              setCurrentView('onboarding');
            }}
            onViewResult={(attemptId) => {
              setSelectedAttemptId(attemptId);
              setCurrentView('result');
            }}
          />
        )}

        {currentView === 'onboarding' && selectedExamId && (
          <ExamOnboardingPage
            examId={selectedExamId}
            onReadyToEnter={(stream) => {
              setActiveMediaStream(stream);
              setCurrentView('arena');
            }}
            onCancel={() => {
              setCurrentView('student-dashboard');
            }}
          />
        )}

        {currentView === 'result' && selectedAttemptId && (
          <ResultPage
            attemptId={selectedAttemptId}
            onBackToDashboard={() => {
              if (user && user.role === 'student') {
                setCurrentView('student-dashboard');
              } else {
                setCurrentView('admin-dashboard');
              }
            }}
          />
        )}

        {currentView === 'admin-dashboard' && (
          <div className="flex min-h-[calc(100vh-4rem)]">
            <AdminSidebar
              currentTab={adminTab}
              onSelectTab={(tab) => setAdminTab(tab)}
            />
            <div className="flex-1 overflow-y-auto bg-slate-50">
              {renderAdminTabContent()}
            </div>
          </div>
        )}
      </main>

      {currentView !== 'admin-dashboard' && <Footer />}
    </div>
  );
};

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: any }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("ExamShield Render Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-14 h-14 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-center text-rose-600 mb-4">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold mb-2 text-slate-900">Something went wrong</h1>
          <p className="text-xs text-slate-600 max-w-sm mb-6 font-mono">
            {this.state.error?.message || "An unexpected error occurred while loading the application."}
          </p>
          <button
            onClick={() => {
              localStorage.clear();
              window.location.reload();
            }}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl cursor-pointer"
          >
            Reload ExamShield
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;

