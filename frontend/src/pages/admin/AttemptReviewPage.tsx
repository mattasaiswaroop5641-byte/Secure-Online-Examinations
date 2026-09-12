import React, { useState, useEffect, useCallback } from 'react';
import { attemptService } from '../../services/attempts';
import { formatDate } from '../../utils/formatters';
import { LiveStreamControls } from '../../components/admin/LiveStreamControls';
import { KickCandidateModal } from '../../components/admin/KickCandidateModal';
import { LiveCandidateWatchModal } from '../../components/admin/LiveCandidateWatchModal';
import {
  Users,
  Search,
  Award,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  Clock,
  UserX,
  AlertTriangle,
  Eye,
} from 'lucide-react';

interface AttemptReviewPageProps {
  onViewAttemptResult: (attemptId: number) => void;
}

export const AttemptReviewPage: React.FC<AttemptReviewPageProps> = ({
  onViewAttemptResult,
}) => {
  const [attempts, setAttempts] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isLive, setIsLive] = useState(true);
  const [intervalSeconds, setIntervalSeconds] = useState<number>(3);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());
  const [selectedKickAttempt, setSelectedKickAttempt] = useState<{
    id: number;
    name?: string;
    exam?: string;
  } | null>(null);
  const [selectedLiveWatchAttempt, setSelectedLiveWatchAttempt] = useState<{
    id: number;
    name?: string;
  } | null>(null);

  const loadAttempts = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsSyncing(true);
    try {
      const data = await attemptService.listAttemptsAdmin();
      setAttempts(data);
      setLastSyncTime(new Date());
    } catch (err) {
      console.error('Failed to load attempts:', err);
    } finally {
      setIsLoading(false);
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    loadAttempts(false);
  }, [loadAttempts]);

  // Live Auto-Refresh Polling with configurable cadence
  useEffect(() => {
    if (!isLive) return;
    const intervalId = setInterval(() => {
      loadAttempts(true);
    }, intervalSeconds * 1000);

    return () => clearInterval(intervalId);
  }, [isLive, intervalSeconds, loadAttempts]);

  const filtered = attempts.filter(
    (a) =>
      a.student_name.toLowerCase().includes(search.toLowerCase()) ||
      a.exam_title.toLowerCase().includes(search.toLowerCase()) ||
      (a.student_code && a.student_code.toLowerCase().includes(search.toLowerCase()))
  );

  const inProgressCount = attempts.filter((a) => a.status === 'in_progress').length;

  return (
    <div className="p-6 sm:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">Candidate Attempts & Results</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Audit candidate submission records, scores, pass/fail status, and live proctoring telemetry.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <span className="text-xs font-mono text-slate-400 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl">
            {attempts.length} Total Submissions
          </span>
        </div>
      </div>

      {/* Live Stream Controls Bar */}
      <LiveStreamControls
        isLive={isLive}
        onToggleLive={() => setIsLive((prev) => !prev)}
        intervalSeconds={intervalSeconds}
        onChangeInterval={(sec) => setIntervalSeconds(sec)}
        onManualSync={() => loadAttempts(false)}
        isSyncing={isSyncing}
        lastSyncTime={lastSyncTime}
        activeCount={inProgressCount}
      />

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by candidate name, student ID, or exam..."
          className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
        />
      </div>

      {/* Attempts Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-800">
              <tr>
                <th className="p-4">Candidate</th>
                <th className="p-4">Examination</th>
                <th className="p-4">Status / Score</th>
                <th className="p-4">Outcome</th>
                <th className="p-4">Trust Score</th>
                <th className="p-4">Violations</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {isLoading && attempts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    Loading attempts data...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    No attempts found.
                  </td>
                </tr>
              ) : (
                filtered.map((att) => {
                  const isInProgress = att.status === 'in_progress';
                  const isTerminated = att.status === 'terminated';

                  return (
                    <tr key={att.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center space-x-2">
                          {isInProgress && (
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
                          )}
                          <div>
                            <p className="font-semibold text-white">{att.student_name}</p>
                            <p className="text-[11px] text-slate-400 font-mono">
                              {att.student_code || att.student_email}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="p-4">
                        <p className="font-semibold text-slate-200">{att.exam_title}</p>
                        <p className="text-[10px] text-slate-500">{formatDate(att.start_time)}</p>
                      </td>

                      <td className="p-4">
                        {isInProgress ? (
                          <div>
                            <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              <span>Writing Exam</span>
                            </span>
                            <p className="text-[10px] text-slate-500 mt-0.5 font-mono">Session Active</p>
                          </div>
                        ) : isTerminated ? (
                          <div>
                            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/40">
                              <ShieldAlert className="w-3 h-3" />
                              <span>Terminated</span>
                            </span>
                            {att.termination_reason && (
                              <p className="text-[10px] text-rose-400/80 mt-0.5 truncate max-w-[150px]" title={att.termination_reason}>
                                {att.termination_reason}
                              </p>
                            )}
                          </div>
                        ) : (
                          <div>
                            <span className="font-mono font-bold text-white text-sm">{att.score}</span>
                            <span className="text-slate-500 text-xs"> / {att.total_possible_marks}</span>
                            <p className="text-[10px] text-indigo-400 font-semibold">{att.percentage}%</p>
                          </div>
                        )}
                      </td>

                      <td className="p-4">
                        {isInProgress ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                            <Clock className="w-3 h-3" />
                            <span>In Progress</span>
                          </span>
                        ) : isTerminated ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-600/20 text-rose-300 border border-rose-500/40">
                            <XCircle className="w-3 h-3 text-rose-400" />
                            <span>Disqualified</span>
                          </span>
                        ) : att.is_passed ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Passed</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-500/10 text-rose-400 border border-rose-500/20">
                            <XCircle className="w-3 h-3" />
                            <span>Failed</span>
                          </span>
                        )}
                      </td>

                      <td className="p-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full font-mono text-[11px] font-bold border ${
                            att.proctoring_score >= 85
                              ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                              : att.proctoring_score >= 65
                              ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                              : 'text-rose-400 bg-rose-500/10 border-rose-500/20'
                          }`}
                        >
                          {att.proctoring_score}%
                        </span>
                      </td>

                      <td className="p-4 font-mono text-slate-300">
                        {att.violation_count > 0 ? (
                          <span className="text-rose-400 font-bold">{att.violation_count} Incident(s)</span>
                        ) : (
                          <span className="text-emerald-400">0</span>
                        )}
                      </td>

                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          {isInProgress && (
                            <>
                              <button
                                onClick={() => setSelectedLiveWatchAttempt({ id: att.id, name: att.student_name })}
                                className="inline-flex items-center space-x-1 px-2.5 py-1.5 bg-indigo-600/15 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 rounded-xl font-bold text-xs transition-colors cursor-pointer"
                                title="Silent Live Candidate Video Stream"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Watch</span>
                              </button>
                              <button
                                onClick={() => setSelectedKickAttempt({ id: att.id, name: att.student_name, exam: att.exam_title })}
                                className="inline-flex items-center space-x-1 px-2.5 py-1.5 bg-rose-600/15 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 rounded-xl font-bold text-xs transition-colors cursor-pointer"
                                title="Kick Candidate & Disqualify Exam"
                              >
                                <UserX className="w-3.5 h-3.5" />
                                <span>Kick</span>
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => onViewAttemptResult(att.id)}
                            className="inline-flex items-center space-x-1 px-3 py-1.5 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 rounded-xl font-semibold text-xs transition-colors cursor-pointer"
                          >
                            <span>{isInProgress ? 'Live Monitor' : 'Review Result'}</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Silent Live Candidate Watch Modal */}
      {selectedLiveWatchAttempt && (
        <LiveCandidateWatchModal
          isOpen={Boolean(selectedLiveWatchAttempt)}
          onClose={() => setSelectedLiveWatchAttempt(null)}
          attemptId={selectedLiveWatchAttempt.id}
          candidateName={selectedLiveWatchAttempt.name}
          onCandidateKicked={() => {
            setSelectedLiveWatchAttempt(null);
            loadAttempts(false);
          }}
        />
      )}

      {/* Kick Modal */}
      {selectedKickAttempt && (
        <KickCandidateModal
          isOpen={Boolean(selectedKickAttempt)}
          onClose={() => setSelectedKickAttempt(null)}
          attemptId={selectedKickAttempt.id}
          candidateName={selectedKickAttempt.name}
          examTitle={selectedKickAttempt.exam}
          onSuccess={() => {
            setSelectedKickAttempt(null);
            loadAttempts(false);
          }}
        />
      )}
    </div>
  );
};

