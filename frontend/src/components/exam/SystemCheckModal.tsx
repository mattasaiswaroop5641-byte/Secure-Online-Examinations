import React, { useState, useEffect } from 'react';
import { Camera, Monitor, CheckCircle2, AlertCircle, RefreshCw, ArrowRight } from 'lucide-react';
import { useWebcam } from '../../hooks/useWebcam';

interface SystemCheckModalProps {
  onPass: (stream: MediaStream) => void;
  onCancel: () => void;
}

export const SystemCheckModal: React.FC<SystemCheckModalProps> = ({ onPass, onCancel }) => {
  const { videoRef, stream, status, errorMessage, startCamera } = useWebcam();
  const [browserOk, setBrowserOk] = useState<boolean>(true);
  const [fullscreenOk, setFullscreenOk] = useState<boolean>(true);

  useEffect(() => {
    // Check browser mediaDevices support
    const hasMedia = Boolean(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    setBrowserOk(hasMedia);

    // Check Fullscreen API support
    const hasFullscreen = Boolean(
      document.documentElement.requestFullscreen ||
      (document.documentElement as any).webkitRequestFullscreen
    );
    setFullscreenOk(hasFullscreen);

    // Prompt for camera immediately
    startCamera();
  }, [startCamera]);

  const allPassed = status === 'granted' && browserOk && fullscreenOk && stream !== null;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-xl w-full mx-auto shadow-xl">
      <div className="text-center mb-6">
        <div className="inline-flex p-3 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 mb-3 shadow-sm">
          <Monitor className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-slate-900 tracking-tight">System Compatibility Verification</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
          ExamShield requires your system to satisfy hardware and browser security standards before starting the assessment.
        </p>
      </div>

      {/* Checklist Cards */}
      <div className="space-y-3 mb-6">
        {/* 1. Camera Support */}
        <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Webcam Availability & Permission</p>
              <p className="text-xs text-slate-500">Continuous face proctoring requires video feed</p>
            </div>
          </div>
          <div>
            {status === 'granted' ? (
              <span className="flex items-center space-x-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Granted</span>
              </span>
            ) : status === 'prompting' ? (
              <span className="flex items-center space-x-1 text-xs text-amber-600">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Checking...</span>
              </span>
            ) : (
              <span className="flex items-center space-x-1.5 text-xs font-semibold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Denied</span>
              </span>
            )}
          </div>
        </div>

        {/* 2. Browser Compatibility */}
        <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600">
              <Monitor className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Browser Security API Support</p>
              <p className="text-xs text-slate-500">HTML5 Canvas, Visibility & Media APIs</p>
            </div>
          </div>
          <div>
            {browserOk ? (
              <span className="flex items-center space-x-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Compatible</span>
              </span>
            ) : (
              <span className="flex items-center space-x-1.5 text-xs font-semibold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Unsupported</span>
              </span>
            )}
          </div>
        </div>

        {/* 3. Fullscreen Capability */}
        <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600">
              <Monitor className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Fullscreen Examination Lock</p>
              <p className="text-xs text-slate-500">Enforces full-screen focus during test</p>
            </div>
          </div>
          <div>
            {fullscreenOk ? (
              <span className="flex items-center space-x-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Supported</span>
              </span>
            ) : (
              <span className="flex items-center space-x-1.5 text-xs font-semibold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Blocked</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Hidden/preview video element to initialize hardware stream */}
      <video ref={videoRef} autoPlay playsInline muted className="hidden" />

      {errorMessage && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs mb-4 flex items-start space-x-2">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Camera Access Required</p>
            <p className="mt-0.5">{errorMessage}</p>
            <button
              onClick={() => startCamera()}
              className="mt-2 inline-flex items-center space-x-1 text-xs font-bold text-rose-700 underline hover:text-rose-800"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Retry Permission</span>
            </button>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-200">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm text-slate-500 hover:text-slate-800 transition-colors"
        >
          Cancel
        </button>

        <button
          disabled={!allPassed}
          onClick={() => {
            if (stream) onPass(stream);
          }}
          className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${
            allPassed
              ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20 cursor-pointer'
              : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
          }`}
        >
          <span>Continue to Face Verification</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
