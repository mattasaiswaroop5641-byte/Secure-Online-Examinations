import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { ProctoringEvent } from '../../types';
import { formatDate, getSeverityBadgeClass } from '../../utils/formatters';
import { ShieldAlert, CheckCircle2, Download, Info, Camera, AlertTriangle, Trash2, UserX } from 'lucide-react';
import { KickCandidateModal } from './KickCandidateModal';

interface EvidenceViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: ProctoringEvent;
  onResolve: () => void;
  onDelete?: () => void;
  onCandidateKicked?: () => void;
}

export const EvidenceViewerModal: React.FC<EvidenceViewerModalProps> = ({
  isOpen,
  onClose,
  event,
  onResolve,
  onDelete,
  onCandidateKicked,
}) => {

  const [imageFailed, setImageFailed] = useState<boolean>(false);
  const [isKickModalOpen, setIsKickModalOpen] = useState<boolean>(false);

  const backendUrl = import.meta.env.VITE_API_BASE_URL
    ? import.meta.env.VITE_API_BASE_URL.replace('/api', '')
    : 'http://127.0.0.1:8000';

  const imageUrl = event.screenshot_path
    ? event.screenshot_path.startsWith('http') || event.screenshot_path.startsWith('data:')
      ? event.screenshot_path
      : `${backendUrl}${event.screenshot_path}`
    : '';

  const severityClass = getSeverityBadgeClass(event.severity);

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Forensic Evidence Review"
        subtitle={`Incident Snapshot • Attempt #${event.attempt_id}${event.student_name ? ` • Candidate: ${event.student_name}` : ''}`}
        maxWidth="max-w-3xl"
      >
        <div className="space-y-4">
          {/* Event Meta Details Header */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-xs">
            <div className="flex items-center space-x-2">
              <span
                className={`px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider border ${severityClass}`}
              >
                {event.severity}
              </span>
              <span className="font-bold text-slate-200 text-sm">{event.event_type}</span>
            </div>

            <div className="text-slate-400 font-mono">
              {formatDate(event.timestamp)}
            </div>
          </div>

          {/* Snapshot Image Container with Forensic Fallback */}
          <div className="relative aspect-video rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center shadow-inner">
            {imageUrl && !imageFailed ? (
              <img
                src={imageUrl}
                alt="Proctoring Incident Snapshot"
                onError={() => setImageFailed(true)}
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="w-full h-full p-6 flex flex-col justify-between bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden">
                {/* Simulated Forensic Watermark Header */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-2.5 flex items-center justify-between text-[11px] font-mono text-slate-300">
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                    <span className="font-bold text-white">[ExamShield Forensic Audit]</span>
                    <span>{event.event_type}</span>
                  </div>
                  <span className="text-slate-400">{formatDate(event.timestamp)}</span>
                </div>

                {/* Central Forensics Illustration */}
                <div className="text-center my-auto space-y-2 py-4">
                  <div className="inline-flex p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
                    <ShieldAlert className="w-8 h-8" />
                  </div>
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                    {event.event_type.replace(/_/g, ' ')} INCIDENT RECORDED
                  </h4>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    {event.description || 'Continuous computer vision monitoring flagged anomalous candidate activity during this session.'}
                  </p>
                </div>

                {/* Footer Audit Stamp */}
                <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono border-t border-slate-800/80 pt-2">
                  <span>Attempt ID: #{event.attempt_id}</span>
                  <span>Severity: {event.severity}</span>
                  <span>Duration: {event.duration_seconds ? `${event.duration_seconds}s` : 'Instant'}</span>
                </div>
              </div>
            )}
          </div>

          {/* Description & Computer Vision Forensics Note */}
          <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 space-y-2 text-xs">
            <p className="font-semibold text-slate-200 flex items-center space-x-1.5">
              <Info className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>Incident Description</span>
            </p>
            <p className="text-slate-300 leading-relaxed">{event.description}</p>
            <p className="text-[11px] text-slate-500 italic">
              Note: Bounding boxes and timestamps are watermarked onto the frame at time of capture by the OpenCV computer vision analysis engine.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800">
            <div className="flex items-center space-x-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              >
                Close
              </button>
              {onDelete && (
                <button
                  onClick={onDelete}
                  className="flex items-center space-x-1.5 px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-semibold text-xs rounded-xl transition-all cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Record</span>
                </button>
              )}
            </div>

            <div className="flex items-center space-x-2.5">
              {/* Kick / Disqualify Button */}
              <button
                onClick={() => setIsKickModalOpen(true)}
                className="flex items-center space-x-1.5 px-4 py-2 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 font-bold text-xs rounded-xl transition-all cursor-pointer shadow-sm"
              >
                <UserX className="w-4 h-4" />
                <span>Kick Candidate</span>
              </button>

              {event.resolved ? (
                <span className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Reviewed</span>
                </span>
              ) : (
                <button
                  onClick={onResolve}
                  className="flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl shadow-md transition-all cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Mark Resolved</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </Modal>

      {/* Kick Confirmation Modal */}
      {isKickModalOpen && (
        <KickCandidateModal
          isOpen={isKickModalOpen}
          onClose={() => setIsKickModalOpen(false)}
          attemptId={event.attempt_id}
          candidateName={event.student_name || undefined}
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
