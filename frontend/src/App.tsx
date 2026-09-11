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
import { ShieldCheck, Sliders, CheckCircle2 } from 'lucide-react';

const AppContent: React.FC = () => {
  const { user, isLoading } = useAuth();
  const [currentView, setCurrentView] = useState<string>('landing');
  const [selectedExamId, setSelectedExamId] = useState<number | null>(null);
  const [selectedAttemptId, setSelectedAttemptId] = useState<number | null>(null);
  const [activeMediaStream, setActiveMediaStream] = useState<MediaStream | null>(null);
  const [adminTab, setAdminTab] = useState<string>('overview');

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
              <h2 className="text-2xl font-extrabold text-white tracking-tight">Proctoring Thresholds & Configuration</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Tune biometric calibration sensitivity, grace periods, and snapshot evidence triggers.
              </p>
            </div>

            {settingsSavedNotice && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-300 text-xs flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Threshold settings updated successfully.</span>
              </div>
            )}

            <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Absence / No-Face Grace Period (Seconds)
                </label>
                <input
                  type="number"
                  min={1}
                  max={15}
                  value={gracePeriod}
                  onChange={(e) => setGracePeriod(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white font-mono"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Candidate absence under this threshold is treated as natural momentary movement.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Incident Violation Duration Trigger (Seconds)
                </label>
                <input
                  type="number"
                  min={5}
                  max={30}
                  value={warningThreshold}
                  onChange={(e) => setWarningThreshold(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white font-mono"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Duration beyond which absence or attention shift logs a formal high-severity incident.
                </span>
              </div>

              <label className="flex items-center space-x-3 p-3.5 bg-slate-950/80 rounded-xl border border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={snapshotCaptureEnabled}
                  onChange={(e) => setSnapshotCaptureEnabled(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-700 bg-slate-900"
                />
                <div>
                  <p className="text-xs font-semibold text-slate-200">Capture Forensic Snapshot on High Severity</p>
                  <p className="text-[11px] text-slate-500">
                    Automatically stores annotated webcam frames when multiple faces or prolonged absence occurs.
                  </p>
                </div>
              </label>

              <div className="pt-3 border-t border-slate-800 flex justify-end">
                <button
                  onClick={() => {
                    setSettingsSavedNotice(true);
                    setTimeout(() => setSettingsSavedNotice(false), 3000);
                  }}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
                >
                  Save Configuration
                </button>
              </div>
            </div>
          </div>
        );
      default:
        return <AdminOverviewPage onNavigateTab={(t) => setAdminTab(t)} onViewAttempt={(id) => { setSelectedAttemptId(id); setCurrentView('result'); }} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
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
            <div className="flex-1 overflow-y-auto bg-slate-950">
              {renderAdminTabContent()}
            </div>
          </div>
        )}
      </main>

      {currentView !== 'admin-dashboard' && <Footer />}
    </div>
  );
};

export function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
