import React from 'react';
import { ShieldCheck, AlertCircle, Eye, ShieldAlert } from 'lucide-react';
import { FaceDetectionResult } from '../../utils/faceDetection';

interface ProctoringFeedProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  detection: FaceDetectionResult;
  trustScore: number;
  violationCount: number;
  warningMessage?: string | null;
}

export const ProctoringFeed: React.FC<ProctoringFeedProps> = ({
  videoRef,
  detection,
  trustScore,
  violationCount,
  warningMessage,
}) => {
  const isSuspicious = detection.status !== 'NORMAL';

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl flex flex-col">
      {/* Top Banner */}
      <div className="px-3.5 py-2.5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between text-xs">
        <div className="flex items-center space-x-2">
          <span className="relative flex h-2 w-2">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                isSuspicious ? 'bg-rose-400' : 'bg-emerald-400'
              }`}
            />
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${
                isSuspicious ? 'bg-rose-500' : 'bg-emerald-500'
              }`}
            />
          </span>
          <span className="font-semibold text-slate-200 text-[11px] tracking-wide uppercase">
            Continuous Proctor
          </span>
        </div>

        {/* Live Integrity Trust Meter */}
        <div className="flex items-center space-x-1.5">
          <span className="text-[10px] text-slate-400">Trust:</span>
          <span
            className={`font-mono font-bold text-xs ${
              trustScore >= 85
                ? 'text-emerald-400'
                : trustScore >= 65
                ? 'text-amber-400'
                : 'text-rose-400'
            }`}
          >
            {trustScore}%
          </span>
        </div>
      </div>

      {/* Video Container */}
      <div className="relative aspect-video bg-slate-950 overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          onLoadedMetadata={(e) => {
            (e.target as HTMLVideoElement).play().catch(() => {});
          }}
          className="w-full h-full object-cover transform -scale-x-100"
        />


        {/* Subtle Scanning Radar Beam */}
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent via-cyan-500/10 to-transparent h-12 w-full animate-scan" />

        {/* Target Bounding Box Guide */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div
            className={`w-28 h-36 rounded-2xl border transition-all duration-300 ${
              detection.status === 'NORMAL'
                ? 'border-emerald-500/60 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                : detection.status === 'MULTIPLE_FACES'
                ? 'border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.4)]'
                : 'border-amber-400/80 border-dashed'
            }`}
          />
        </div>

        {/* Floating Real-Time Status Pill */}
        <div className="absolute bottom-2 inset-x-2 flex items-center justify-between pointer-events-none">
          <span
            className={`px-2 py-0.5 rounded-md text-[10px] font-bold backdrop-blur-md border ${
              detection.status === 'NORMAL'
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/30'
                : detection.status === 'MULTIPLE_FACES'
                ? 'bg-rose-950/90 text-rose-200 border-rose-500/50'
                : 'bg-amber-950/80 text-amber-200 border-amber-500/40'
            }`}
          >
            {detection.status === 'NORMAL'
              ? 'Candidate Centered'
              : detection.status === 'NO_FACE'
              ? 'No Face Visible'
              : detection.status === 'MULTIPLE_FACES'
              ? 'Multiple Faces!'
              : detection.status === 'LOOKING_AWAY'
              ? `Looking Away (${detection.lookingDirection})`
              : 'Out of Position'}
          </span>

          {violationCount > 0 && (
            <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-900/90 text-slate-300 border border-slate-700">
              Violations: {violationCount}
            </span>
          )}
        </div>
      </div>

      {/* Warning Notice Ribbon if warning active */}
      {warningMessage && (
        <div className="p-2 bg-rose-500/15 border-t border-rose-500/30 text-rose-300 text-[11px] font-medium flex items-center space-x-1.5 animate-pulse">
          <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
          <span className="leading-tight">{warningMessage}</span>
        </div>
      )}
    </div>
  );
};
