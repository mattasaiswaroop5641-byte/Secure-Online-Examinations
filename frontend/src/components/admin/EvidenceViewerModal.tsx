import React from 'react';
import { Modal } from '../common/Modal';
import { ProctoringEvent } from '../../types';
import { formatDate, getSeverityBadgeClass } from '../../utils/formatters';
import { ShieldAlert, CheckCircle2, Download, Info } from 'lucide-react';

interface EvidenceViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: ProctoringEvent;
  onResolve: () => void;
}

export const EvidenceViewerModal: React.FC<EvidenceViewerModalProps> = ({
  isOpen,
  onClose,
  event,
  onResolve,
}) => {
  const backendUrl = import.meta.env.VITE_API_BASE_URL
    ? import.meta.env.VITE_API_BASE_URL.replace('/api', '')
    : 'http://127.0.0.1:8000';

  const imageUrl = event.screenshot_path
    ? event.screenshot_path.startsWith('http')
      ? event.screenshot_path
      : `${backendUrl}${event.screenshot_path}`
    : '';

  const severityClass = getSeverityBadgeClass(event.severity);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Forensic Evidence Review"
      subtitle={`Incident Snapshot • Attempt #${event.attempt_id}`}
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

        {/* Snapshot Image Container */}
        <div className="relative aspect-video rounded-2xl overflow-hidden bg-black border border-slate-800 flex items-center justify-center shadow-inner">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt="Proctoring Incident Snapshot"
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="p-8 text-center text-slate-500">
              <ShieldAlert className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-xs">No screenshot frame attached to this incident.</p>
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
        <div className="flex items-center justify-between pt-3 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
          >
            Close
          </button>

          <div className="flex items-center space-x-3">
            {event.resolved ? (
              <span className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                <CheckCircle2 className="w-4 h-4" />
                <span>Incident Reviewed</span>
              </span>
            ) : (
              <button
                onClick={onResolve}
                className="flex items-center space-x-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl shadow-md transition-all"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Mark as Reviewed / Resolved</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};
