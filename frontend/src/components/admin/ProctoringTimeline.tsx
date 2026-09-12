import React, { useState } from 'react';
import { ProctoringEvent } from '../../types';
import { formatTimeOnly, formatDate, getSeverityBadgeClass } from '../../utils/formatters';
import {
  ShieldAlert,
  Eye,
  Maximize2,
  Lock,
  CameraOff,
  Users,
  Image,
  CheckCircle2,
  ExternalLink,
  Trash2,
} from 'lucide-react';
import { proctoringService } from '../../services/proctoring';
import { EvidenceViewerModal } from './EvidenceViewerModal';

interface ProctoringTimelineProps {
  events: ProctoringEvent[];
  onEventResolved?: (eventId: number) => void;
  onEventDeleted?: (eventId: number) => void;
  onCandidateKicked?: () => void;
}

const eventIconMap: Record<string, any> = {
  MULTIPLE_FACES_DETECTED: Users,
  NO_FACE_DETECTED: Eye,
  FACE_OUT_OF_FRAME: Eye,
  LOOKING_AWAY: Eye,
  TAB_SWITCH: Lock,
  FULLSCREEN_EXIT: Maximize2,
  CAMERA_DISCONNECTED: CameraOff,
  DEVTOOLS_SUSPECT: ShieldAlert,
};

export const ProctoringTimeline: React.FC<ProctoringTimelineProps> = ({
  events,
  onEventResolved,
  onEventDeleted,
  onCandidateKicked,
}) => {
  const [selectedSnapshot, setSelectedSnapshot] = useState<{
    event: ProctoringEvent;
  } | null>(null);

  const handleResolve = async (eventId: number) => {
    try {
      await proctoringService.resolveEvent(eventId);
      if (onEventResolved) onEventResolved(eventId);
    } catch (err) {
      console.error('Failed to resolve incident:', err);
    }
  };

  const handleDelete = async (eventId: number) => {
    if (!window.confirm('Are you sure you want to delete this proctoring incident log? This will update candidate metrics.')) {
      return;
    }
    try {
      await proctoringService.deleteEvent(eventId);
      if (onEventDeleted) onEventDeleted(eventId);
    } catch (err) {
      console.error('Failed to delete incident:', err);
      alert('Failed to delete incident: ' + (err as Error).message);
    }
  };

  if (events.length === 0) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 shadow-sm">
        <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
        <p className="text-sm font-semibold text-slate-900">No Proctoring Violations Recorded</p>
        <p className="text-xs text-slate-500 mt-1">This examination session maintained high integrity standards.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {events.map((ev) => {
        const Icon = eventIconMap[ev.event_type] || ShieldAlert;
        const severityClass = getSeverityBadgeClass(ev.severity);

        return (
          <div
            key={ev.id}
            className="p-4 bg-white border border-slate-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-slate-300 shadow-sm transition-colors"
          >
            <div className="flex items-start space-x-3.5 flex-1">
              <div
                className={`p-2.5 rounded-xl mt-0.5 shrink-0 ${
                  ev.severity === 'CRITICAL'
                    ? 'bg-rose-50 text-rose-600 border border-rose-200'
                    : ev.severity === 'HIGH'
                    ? 'bg-amber-50 text-amber-600 border border-amber-200'
                    : 'bg-blue-50 text-blue-600 border border-blue-200'
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>

              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-mono text-slate-500">{formatDate(ev.timestamp)}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${severityClass}`}
                  >
                    {ev.severity}
                  </span>
                  <span className="text-xs font-bold text-slate-900">{ev.event_type}</span>
                  {ev.student_name && (
                    <span className="text-xs text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                      Candidate: {ev.student_name}
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">{ev.description}</p>

                {ev.duration_seconds > 0 && (
                  <p className="text-[11px] text-slate-400 font-mono">
                    Incident Duration: {ev.duration_seconds}s
                  </p>
                )}
              </div>
            </div>

            {/* Actions / Evidence Badge */}
            <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center">
              {ev.screenshot_path && (
                <button
                  onClick={() => setSelectedSnapshot({ event: ev })}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Image className="w-3.5 h-3.5" />
                  <span>View Evidence</span>
                </button>
              )}

              {ev.resolved ? (
                <span className="flex items-center space-x-1 text-[11px] text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Reviewed</span>
                </span>
              ) : (
                <button
                  onClick={() => handleResolve(ev.id)}
                  className="px-3 py-1.5 bg-slate-50 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 text-slate-600 border border-slate-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  Mark Resolved
                </button>
              )}

              <button
                onClick={() => handleDelete(ev.id)}
                title="Delete this incident"
                className="p-1.5 bg-slate-50 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 text-slate-400 border border-slate-200 rounded-xl text-xs transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        );
      })}

      {/* Forensic Evidence Snapshot Modal */}
      {selectedSnapshot && (
        <EvidenceViewerModal
          isOpen={Boolean(selectedSnapshot)}
          onClose={() => setSelectedSnapshot(null)}
          event={selectedSnapshot.event}
          onResolve={() => {
            handleResolve(selectedSnapshot.event.id);
            setSelectedSnapshot(null);
          }}
          onDelete={() => {
            handleDelete(selectedSnapshot.event.id);
            setSelectedSnapshot(null);
          }}
          onCandidateKicked={() => {
            setSelectedSnapshot(null);
            if (onCandidateKicked) onCandidateKicked();
          }}
        />
      )}
    </div>
  );
};
