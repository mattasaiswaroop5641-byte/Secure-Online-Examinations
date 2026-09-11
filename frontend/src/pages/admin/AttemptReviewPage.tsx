import React, { useState, useEffect, useCallback } from 'react';
import { attemptService } from '../../services/attempts';
import { formatDate } from '../../utils/formatters';
import {
  Users,
  Search,
  Award,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  RefreshCw,
  Radio,
  Activity,
  Clock,
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
  const [isSyncing, setIsSyncing] = useState(false);

  const loadAttempts = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsSyncing(true);
    try {
      const data = await attemptService.listAttemptsAdmin();
      setAttempts(data);
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

  // Live Auto-Refresh Polling (every 3.5s)
  useEffect(() => {
    if (!isLive) return;
    const intervalId = setInterval(() => {
      loadAttempts(true);
    }, 3500);

    return () => clearInterval(intervalId);
  }, [isLive, loadAttempts]);

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
          {/* Live Stream Switch Badge */}
          <button
            onClick={() => setIsLive((prev) => !prev)}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
              isLive
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.15)]'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-300'
            }`}
          >
            <span className="relative flex h-2 w-2">
              {isLive && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              )}
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  isLive ? 'bg-emerald-500' : 'bg-slate-500'
                }`}
              />
            </span>
            <span>{isLive ? 'Live Submissions (3.5s)' : 'Live Polling Paused'}</span>
          </button>

          <button
            onClick={() => loadAttempts(false)}
            disabled={isSyncing}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-xl text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
            title="Manual Sync"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-cyan-400' : ''}`} />
            <span>Sync</span>
          </button>

          {inProgressCount > 0 && (
            <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl font-semibold animate-pulse">
              {inProgressCount} Candidate(s) Live Now
            </span>
          )}

          <span className="text-xs font-mono text-slate-400 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl">
            {attempts.length} Total Submissions
          </span>
        </div>
      </div>

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
                        <button
                          onClick={() => onViewAttemptResult(att.id)}
                          className="inline-flex items-center space-x-1 px-3 py-1.5 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 rounded-xl font-semibold text-xs transition-colors cursor-pointer"
                        >
                          <span>{isInProgress ? 'Live Monitor' : 'Review Result'}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

