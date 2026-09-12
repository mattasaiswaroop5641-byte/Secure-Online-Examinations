import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { proctoringService } from '../../services/proctoring';
import { KickCandidateModal } from './KickCandidateModal';
import {
  Eye,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  UserX,
  RefreshCw,
  Clock,
  Compass,
  User,
  Users,
  Radio,
} from 'lucide-react';
import { formatDate } from '../../utils/formatters';

interface LiveCandidateWatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  attemptId: number;
  candidateName?: string;
  onCandidateKicked?: () => void;
}

export const LiveCandidateWatchModal: React.FC<LiveCandidateWatchModalProps> = ({
  isOpen,
  onClose,
  attemptId,
  candidateName,
  onCandidateKicked,
}) => {
  const [feedData, setFeedData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isKickModalOpen, setIsKickModalOpen] = useState<boolean>(false);
  const [refreshInterval, setRefreshInterval] = useState<number>(1500); // 1.5s live polling

  const fetchLiveFrame = async () => {
    try {
      const data = await proctoringService.getLiveFeed(attemptId);
      setFeedData(data);
      setError(null);
    } catch (err: any) {
      console.warn('Live feed poll error:', err);
      setError(err.message || 'Could not reach candidate stream.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    fetchLiveFrame();
    const timer = setInterval(() => {
      fetchLiveFrame();
    }, refreshInterval);

    return () => clearInterval(timer);
  }, [isOpen, attemptId, refreshInterval]);

  const isStreamLive = feedData?.is_live ?? false;
  const imageSrc = feedData?.image_base64
    ? feedData.image_base64.startsWith('data:')
      ? feedData.image_base64
      : `data:image/jpeg;base64,${feedData.image_base64}`
    : null;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Silent Real-Time Candidate Video Stream"
        maxWidth="max-w-3xl"
      >
        <div className="space-y-5">
          {/* Stream Status & Info Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-slate-950 rounded-2xl border border-slate-800">
            <div className="flex items-center space-x-3">
              <div
                className={`flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
                  isStreamLive
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm shadow-emerald-500/20'
                    : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                }`}
              >
                <div
                  className={`w-2 h-2 rounded-full ${
                    isStreamLive ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'
                  }`}
                />
                <span>{isStreamLive ? 'Live Streaming' : 'Awaiting Frame Signal'}</span>
              </div>

              {feedData?.seconds_since_last_frame !== null && (
                <span className="text-[11px] text-slate-400 font-mono">
                  Latency: {feedData?.seconds_since_last_frame}s ago
                </span>
              )}
            </div>

            <div className="flex items-center space-x-3 text-xs">
              <span className="text-slate-400">Stream Cadence:</span>
              <select
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(Number(e.target.value))}
                className="bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded-xl px-2.5 py-1 focus:outline-none focus:border-indigo-500 font-mono"
              >
                <option value={1000}>1.0s (Ultra Fast)</option>
                <option value={1500}>1.5s (Standard)</option>
                <option value={3000}>3.0s (Eco)</option>
              </select>

              <button
                onClick={fetchLiveFrame}
                className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-slate-300 transition-colors cursor-pointer"
                title="Sync Frame"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Main Video Screen */}
          <div className="relative aspect-video bg-slate-950 rounded-3xl overflow-hidden border border-slate-800 flex items-center justify-center shadow-2xl">
            {imageSrc ? (
              <img
                src={imageSrc}
                alt="Candidate Live Stream"
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="text-center p-8 space-y-3">
                <Radio className="w-10 h-10 text-slate-600 animate-pulse mx-auto" />
                <p className="text-sm font-semibold text-slate-300">
                  {isLoading ? 'Connecting to candidate camera stream...' : 'No live frame signal received yet.'}
                </p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  The candidate's browser captures and quietly relays video frames every ~1.5 seconds.
                </p>
              </div>
            )}

            {/* In-Video Live HUD Overlay */}
            <div className="absolute top-3 left-3 flex items-center space-x-2">
              <span className="px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wider bg-slate-900/80 text-white border border-slate-700/80 backdrop-blur-md">
                CAM #1 • {feedData?.student_name || candidateName || 'Candidate'}
              </span>
            </div>

            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs font-semibold text-white bg-slate-900/80 backdrop-blur-md border border-slate-800/80 rounded-xl px-3 py-1.5">
              <div className="flex items-center space-x-4 text-[11px]">
                <span>
                  Trust Score:{' '}
                  <strong className="text-emerald-400 font-mono">
                    {feedData?.trust_score ?? 100}%
                  </strong>
                </span>
                <span>
                  Incidents:{' '}
                  <strong className="text-amber-400 font-mono">
                    {feedData?.violation_count ?? 0}
                  </strong>
                </span>
                <span>
                  Face Direction:{' '}
                  <strong className="text-indigo-300 font-mono">
                    {feedData?.looking_direction || 'CENTER'}
                  </strong>
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                Status: {feedData?.attempt_status || 'in_progress'}
              </span>
            </div>
          </div>

          {/* Privacy & Silent Monitoring Notice */}
          <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl text-[11px] text-indigo-300 flex items-center space-x-2.5">
            <ShieldCheck className="w-4 h-4 shrink-0 text-indigo-400" />
            <span>
              <strong>Silent Proctoring Active:</strong> The candidate's examination arena has zero notifications or popups regarding live viewing, allowing natural, undisturbed monitoring.
            </span>
          </div>

          {/* Candidate Meta & Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800">
            <div className="text-xs space-y-0.5">
              <p className="text-white font-bold">
                {feedData?.student_name || candidateName}
                {feedData?.student_code && (
                  <span className="text-slate-400 font-normal ml-1">
                    ({feedData.student_code})
                  </span>
                )}
              </p>
              <p className="text-[11px] text-slate-400 truncate max-w-md">
                {feedData?.exam_title || 'Examination Assessment'}
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Close Stream
              </button>

              <button
                type="button"
                onClick={() => setIsKickModalOpen(true)}
                className="flex items-center space-x-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-rose-600/20 transition-all cursor-pointer"
              >
                <UserX className="w-4 h-4" />
                <span>Kick Candidate</span>
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Kick Modal */}
      {isKickModalOpen && (
        <KickCandidateModal
          isOpen={isKickModalOpen}
          onClose={() => setIsKickModalOpen(false)}
          attemptId={attemptId}
          candidateName={feedData?.student_name || candidateName}
          onSuccess={() => {
            setIsKickModalOpen(false);
            if (onCandidateKicked) onCandidateKicked();
            onClose();
          }}
        />
      )}
    </>
  );
};
