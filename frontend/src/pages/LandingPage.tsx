import React, { useState } from 'react';
import {
  ShieldCheck,
  Eye,
  Lock,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';

interface LandingPageProps {
  onNavigate: (view: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => {
  const [simStatus, setSimStatus] = useState<'NORMAL' | 'LOOKING_AWAY' | 'MULTIPLE_FACES' | 'NO_FACE'>('NORMAL');
  const [simTrust, setSimTrust] = useState<number>(98);

  const handleSimulate = (status: 'NORMAL' | 'LOOKING_AWAY' | 'MULTIPLE_FACES' | 'NO_FACE') => {
    setSimStatus(status);
    if (status === 'NORMAL') setSimTrust(98);
    else if (status === 'LOOKING_AWAY') setSimTrust(94);
    else if (status === 'NO_FACE') setSimTrust(88);
    else if (status === 'MULTIPLE_FACES') setSimTrust(76);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Hero Section */}
      <section className="relative pt-20 pb-24 overflow-hidden border-b border-slate-900">
        {/* Background glow effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[350px] bg-indigo-600/15 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute top-1/3 right-1/4 w-[350px] h-[250px] bg-cyan-600/10 blur-[100px] rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          {/* Badge */}
          <div className="inline-flex items-center space-x-2 bg-indigo-500/10 border border-indigo-500/20 px-4 py-1.5 rounded-full text-xs font-semibold text-indigo-300 mb-6 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Autonomous Local Computer Vision • Zero Paid APIs</span>
          </div>

          {/* Heading */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-[1.1]">
            Secure Online Examinations.{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-cyan-400 to-emerald-400">
              Smarter Proctoring.
            </span>
          </h1>

          <p className="mt-6 text-base sm:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed font-normal">
            Conduct reliable online assessments with continuous face monitoring, anti-cheating browser lockdowns,
            and real-time examination integrity controls.
          </p>

          {/* User-Defined Call-To-Action Portal Access */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={() => onNavigate('register')}
              className="px-6 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-xl shadow-indigo-600/25 transition-all flex items-center space-x-2 cursor-pointer"
            >
              <span>Create Candidate Account</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => onNavigate('login')}
              className="px-6 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 font-bold text-sm transition-all cursor-pointer"
            >
              <span>Sign In to Your Account</span>
            </button>
          </div>
        </div>
      </section>

      {/* Interactive Live Proctoring Simulator Section */}
      <section className="py-16 bg-slate-900/40 border-b border-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <span className="text-xs font-bold uppercase tracking-widest text-cyan-400 bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-500/20">
              Interactive Proctoring Simulator
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-3">
              How ExamShield Continuous Vision Works
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-xl mx-auto">
              Simulate candidate actions below to preview the real-time biometric detection engine and forensic incident reporting.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center max-w-5xl mx-auto">
            {/* Left: Interactive Controls */}
            <div className="lg:col-span-5 space-y-3">
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-2">Simulate Candidate Action</h3>

              <button
                onClick={() => handleSimulate('NORMAL')}
                className={`w-full p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between ${
                  simStatus === 'NORMAL'
                    ? 'bg-emerald-950/30 border-emerald-500 text-emerald-300 shadow-md shadow-emerald-500/10'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div>
                  <p className="text-xs font-bold text-slate-200">Normal Candidate Behavior</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Face centered, looking directly at screen</p>
                </div>
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              </button>

              <button
                onClick={() => handleSimulate('LOOKING_AWAY')}
                className={`w-full p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between ${
                  simStatus === 'LOOKING_AWAY'
                    ? 'bg-amber-950/30 border-amber-500 text-amber-300 shadow-md shadow-amber-500/10'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div>
                  <p className="text-xs font-bold text-slate-200">Candidate Looking Away</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Yaw/pitch deviation indicates attention shift</p>
                </div>
                <Eye className="w-5 h-5 text-amber-400" />
              </button>

              <button
                onClick={() => handleSimulate('NO_FACE')}
                className={`w-full p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between ${
                  simStatus === 'NO_FACE'
                    ? 'bg-orange-950/30 border-orange-500 text-orange-300 shadow-md shadow-orange-500/10'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div>
                  <p className="text-xs font-bold text-slate-200">No Face Detected</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Candidate leaves desk or covers webcam</p>
                </div>
                <AlertTriangle className="w-5 h-5 text-orange-400" />
              </button>

              <button
                onClick={() => handleSimulate('MULTIPLE_FACES')}
                className={`w-full p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between ${
                  simStatus === 'MULTIPLE_FACES'
                    ? 'bg-rose-950/30 border-rose-500 text-rose-300 shadow-md shadow-rose-500/10'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div>
                  <p className="text-xs font-bold text-slate-200">Multiple People on Camera</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Secondary person enters exam area</p>
                </div>
                <ShieldAlert className="w-5 h-5 text-rose-400" />
              </button>
            </div>

            {/* Right: Real-Time Simulation Feed Visualizer */}
            <div className="lg:col-span-7">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl p-4">
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800 text-xs">
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="font-bold text-slate-200">Continuous Vision Feed Simulator</span>
                  </div>
                  <div className="flex items-center space-x-1.5 font-mono">
                    <span className="text-slate-400">Integrity Trust:</span>
                    <span
                      className={`font-bold ${
                        simTrust >= 85 ? 'text-emerald-400' : simTrust >= 70 ? 'text-amber-400' : 'text-rose-400'
                      }`}
                    >
                      {simTrust}%
                    </span>
                  </div>
                </div>

                <div className="relative aspect-video rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center">
                  {/* Visual Simulation Display */}
                  <div className="text-center p-6">
                    {simStatus === 'NORMAL' && (
                      <div className="space-y-2">
                        <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/10 border-2 border-emerald-500/60 flex items-center justify-center text-emerald-400 animate-pulse">
                          <CheckCircle2 className="w-8 h-8" />
                        </div>
                        <p className="text-xs font-bold text-emerald-300">Single Face Centered & Calibrated</p>
                        <p className="text-[11px] text-slate-400">Eye gaze aligned with exam interface</p>
                      </div>
                    )}

                    {simStatus === 'LOOKING_AWAY' && (
                      <div className="space-y-2">
                        <div className="w-16 h-16 mx-auto rounded-full bg-amber-500/10 border-2 border-amber-500/80 flex items-center justify-center text-amber-400 animate-bounce">
                          <Eye className="w-8 h-8" />
                        </div>
                        <p className="text-xs font-bold text-amber-300">Attention Shifted (Gaze Deviation)</p>
                        <p className="text-[11px] text-slate-400">Facial landmark yaw indicates candidate looking sideways</p>
                      </div>
                    )}

                    {simStatus === 'NO_FACE' && (
                      <div className="space-y-2">
                        <div className="w-16 h-16 mx-auto rounded-full bg-orange-500/10 border-2 border-orange-500/80 flex items-center justify-center text-orange-400">
                          <AlertTriangle className="w-8 h-8" />
                        </div>
                        <p className="text-xs font-bold text-orange-300">No Face Detected in Viewport</p>
                        <p className="text-[11px] text-slate-400">Candidate absent from camera frame</p>
                      </div>
                    )}

                    {simStatus === 'MULTIPLE_FACES' && (
                      <div className="space-y-2">
                        <div className="w-16 h-16 mx-auto rounded-full bg-rose-500/10 border-2 border-rose-500 flex items-center justify-center text-rose-400 animate-pulse">
                          <ShieldAlert className="w-8 h-8" />
                        </div>
                        <p className="text-xs font-bold text-rose-300">CRITICAL: Multiple Faces Detected (2 Faces)</p>
                        <p className="text-[11px] text-slate-400">Secondary person detected • High severity incident recorded</p>
                      </div>
                    )}
                  </div>

                  {/* Forensic Top Watermark */}
                  <div className="absolute top-2 left-2 right-2 flex items-center justify-between text-[10px] font-mono bg-slate-950/80 px-2.5 py-1 rounded-lg border border-slate-800 text-slate-400">
                    <span>[ExamShield CV v1.0]</span>
                    <span className="uppercase text-cyan-400 font-bold">{simStatus}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Features Grid */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-extrabold text-white">Full-Spectrum Examination Integrity</h2>
          <p className="text-sm text-slate-400 mt-2 max-w-xl mx-auto">
            Engineered with layered client-side and server-authoritative defenses to safeguard academic and technical evaluations.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-4">
              <Eye className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">Continuous Face Monitoring</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Detects face absence, multiple people, out-of-frame movement, and head orientation deviations in real time using local computer vision.
            </p>
          </div>

          <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mb-4">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">Anti-Cheating Lockdown</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Enforces locked fullscreen mode, detects tab switching & browser window minimization, blocks clipboard operations and devtools hotkeys.
            </p>
          </div>

          <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4">
              <Clock className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">Server-Authoritative Clock</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Exam timers are locked to the server and immune to client device clock tampering. Auto-submits seamlessly when the time window expires.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
