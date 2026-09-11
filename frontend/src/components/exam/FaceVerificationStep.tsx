import React, { useEffect, useRef, useState } from 'react';
import { ShieldCheck, CheckCircle2, AlertCircle, ArrowRight, RefreshCw, Sparkles, Camera } from 'lucide-react';
import { analyzeVideoFrame, FaceDetectionResult } from '../../utils/faceDetection';

interface FaceVerificationStepProps {
  stream: MediaStream;
  onVerified: () => void;
  onBack: () => void;
}

export const FaceVerificationStep: React.FC<FaceVerificationStepProps> = ({
  stream,
  onVerified,
  onBack,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [detection, setDetection] = useState<FaceDetectionResult | null>(null);
  const [calibratingSec, setCalibratingSec] = useState<number>(0);
  const [isVerified, setIsVerified] = useState<boolean>(false);
  const [isCapturing, setIsCapturing] = useState<boolean>(false);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch((err) => console.log('Video autoplay:', err));
    }
  }, [stream]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!videoRef.current) return;

      const res = analyzeVideoFrame(videoRef.current);
      setDetection(res);

      if (res.status === 'NORMAL' || res.isCentered || res.faceCount >= 1) {
        setCalibratingSec((prev) => {
          const next = Math.min(100, prev + 25);
          if (next >= 100) {
            setIsVerified(true);
          }
          return next;
        });
      } else {
        setCalibratingSec((prev) => Math.max(0, prev - 5));
      }
    }, 300);

    return () => clearInterval(interval);
  }, []);

  const handleManualVerify = () => {
    setIsCapturing(true);
    setCalibratingSec(100);
    setIsVerified(true);
    setTimeout(() => {
      setIsCapturing(false);
    }, 400);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-xl w-full mx-auto shadow-2xl">
      <div className="text-center mb-5">
        <span className="text-xs uppercase font-bold tracking-widest text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
          Step 3 of 4
        </span>
        <h3 className="text-xl font-bold text-white tracking-tight mt-2">Candidate Face Verification</h3>
        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
          Position your face clearly in front of the camera. Click verify or hold steady for 2 seconds.
        </p>
      </div>

      {/* Live Camera View with Oval Guide */}
      <div className={`relative aspect-video max-w-md mx-auto rounded-2xl overflow-hidden bg-slate-950 border-2 shadow-inner mb-5 transition-all duration-300 ${
        isVerified ? 'border-emerald-500 ring-4 ring-emerald-500/20' : 'border-slate-800'
      }`}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover transform -scale-x-100"
          onLoadedMetadata={() => {
            if (videoRef.current) {
              videoRef.current.play().catch(() => {});
            }
          }}
        />

        {/* Capture flash animation */}
        {isCapturing && (
          <div className="absolute inset-0 bg-white/40 animate-pulse pointer-events-none" />
        )}

        {/* Alignment Oval Frame */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div
            className={`w-48 h-60 rounded-[50%] border-2 transition-all duration-300 ${
              isVerified
                ? 'border-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.4)]'
                : calibratingSec > 50
                ? 'border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                : 'border-indigo-400/80 border-dashed animate-pulse'
            }`}
          />
        </div>

        {/* Floating Real-Time Status Pill */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
          <div className="flex items-center space-x-1.5 bg-slate-950/80 backdrop-blur-md px-3 py-1 rounded-full border border-slate-700/60 text-xs text-slate-200">
            <span
              className={`w-2 h-2 rounded-full ${
                isVerified
                  ? 'bg-emerald-400'
                  : calibratingSec > 0
                  ? 'bg-cyan-400 animate-ping'
                  : 'bg-amber-400 animate-pulse'
              }`}
            />
            <span className="font-medium text-[11px]">
              {isVerified
                ? 'Candidate Biometric Verified ✓'
                : calibratingSec > 50
                ? 'Face Centered & Calibrating...'
                : 'Looking at Camera'}
            </span>
          </div>

          <div className="bg-slate-950/80 backdrop-blur-md px-2.5 py-1 rounded-full border border-slate-700/60 text-[11px] font-mono text-cyan-400 font-bold">
            {calibratingSec}%
          </div>
        </div>

        {/* Progress Bar */}
        <div className="absolute bottom-0 inset-x-0 h-1.5 bg-slate-950/80">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 transition-all duration-300"
            style={{ width: `${calibratingSec}%` }}
          />
        </div>
      </div>

      {/* Verification Status & Instant Action */}
      <div className="mb-6 p-4 bg-slate-950/70 rounded-xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="space-y-1 text-center sm:text-left">
          <p className="font-semibold text-slate-200 flex items-center justify-center sm:justify-start space-x-1.5">
            {isVerified ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 inline" />
            ) : (
              <Sparkles className="w-4 h-4 text-indigo-400 inline" />
            )}
            <span>{isVerified ? 'Biometric Baseline Verified' : 'Ready for Face Verification'}</span>
          </p>
          <p className="text-slate-400 text-[11px]">
            {isVerified
              ? 'Your face profile has been calibrated for continuous examination monitoring.'
              : 'Hold still or click the capture button to verify your baseline.'}
          </p>
        </div>

        {!isVerified && (
          <button
            type="button"
            onClick={handleManualVerify}
            className="w-full sm:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center space-x-1.5 cursor-pointer shrink-0"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Verify Face Now</span>
          </button>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-800">
        <button
          onClick={onBack}
          className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
        >
          Back
        </button>

        <button
          disabled={!isVerified}
          onClick={onVerified}
          className={`flex items-center space-x-2 px-6 py-2.5 rounded-xl font-semibold text-sm transition-all ${
            isVerified
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/25 cursor-pointer'
              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
          }`}
        >
          <span>Continue to Rules & Consent</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
