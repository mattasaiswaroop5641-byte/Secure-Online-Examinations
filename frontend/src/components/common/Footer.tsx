import React from 'react';
import { ShieldCheck, Lock, Eye, Cpu, CheckCircle2 } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-950 border-t border-slate-900 py-12 text-slate-400 text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4 text-indigo-400" />
              </div>
              <span className="font-bold text-white text-base tracking-tight">ExamShield</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Enterprise-grade online examination platform with real-time continuous face proctoring,
              anti-cheating browser lockdowns, and automated evaluation.
            </p>
            <p className="text-[11px] text-slate-500">
              Zero paid APIs required. Local OpenCV & Computer Vision driven.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-3">Core Capabilities</h4>
            <ul className="space-y-2 text-xs">
              <li className="flex items-center space-x-1.5 text-slate-400">
                <Eye className="w-3.5 h-3.5 text-cyan-400" />
                <span>Continuous Face Verification</span>
              </li>
              <li className="flex items-center space-x-1.5 text-slate-400">
                <Lock className="w-3.5 h-3.5 text-indigo-400" />
                <span>Fullscreen & Tab Lockdowns</span>
              </li>
              <li className="flex items-center space-x-1.5 text-slate-400">
                <Cpu className="w-3.5 h-3.5 text-emerald-400" />
                <span>Head Pose & Gaze Estimation</span>
              </li>
              <li className="flex items-center space-x-1.5 text-slate-400">
                <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />
                <span>Authoritative Server Grading</span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-3">Security & Privacy</h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li>Candidate Informed Consent</li>
              <li>Local Frame Analysis</li>
              <li>Incident-Triggered Snapshot Evidence</li>
              <li>Encrypted JWT Session Auth</li>
              <li>Role-Based Access Control</li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-3">System Verification</h4>
            <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Local CV Engine</span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Active
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Server Time Lock</span>
                <span className="text-emerald-400 font-semibold">Synchronized</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Forensic Audit Log</span>
                <span className="text-cyan-400 font-semibold">Enabled</span>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-900/80 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500">
          <p>© 2026 ExamShield. Secure Assessments. Trusted Results.</p>
          <p className="mt-2 sm:mt-0">Built for Engineering Competitions, Academic Institutions & Rigorous Evaluations.</p>
        </div>
      </div>
    </footer>
  );
};
