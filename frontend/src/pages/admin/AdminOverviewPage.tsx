import React, { useState, useEffect, useCallback } from 'react';
import { analyticsService } from '../../services/analytics';
import { DashboardMetrics } from '../../types';
import { StatsCard } from '../../components/admin/StatsCard';
import { LiveStreamControls } from '../../components/admin/LiveStreamControls';
import { KickCandidateModal } from '../../components/admin/KickCandidateModal';
import { LiveCandidateWatchModal } from '../../components/admin/LiveCandidateWatchModal';
import { formatDate } from '../../utils/formatters';
import {
  Users,
  Layers,
  Award,
  ShieldAlert,
  Clock,
  CheckCircle2,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  Activity,
  UserX,
  Eye,
} from 'lucide-react';

interface AdminOverviewPageProps {
  onNavigateTab: (tab: string) => void;
  onViewAttempt: (attemptId: number) => void;
}

export const AdminOverviewPage: React.FC<AdminOverviewPageProps> = ({
  onNavigateTab,
  onViewAttempt,
}) => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLive, setIsLive] = useState<boolean>(true);
  const [intervalSeconds, setIntervalSeconds] = useState<number>(3);
  const [lastSync, setLastSync] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [selectedKickAttempt, setSelectedKickAttempt] = useState<{
    id: number;
    name?: string;
    exam?: string;
  } | null>(null);
  const [selectedLiveWatchAttempt, setSelectedLiveWatchAttempt] = useState<{
    id: number;
    name?: string;
  } | null>(null);

  const loadMetrics = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsRefreshing(true);
    try {
      const data = await analyticsService.getDashboardMetrics();
      setMetrics(data);
      setLastSync(new Date());
    } catch (err) {
      console.error('Failed to load dashboard analytics:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadMetrics(false);
  }, [loadMetrics]);

  // Live Auto-Refresh Polling Interval
  useEffect(() => {
    if (!isLive) return;
    const intervalId = setInterval(() => {
      loadMetrics(true);
    }, intervalSeconds * 1000);

    return () => clearInterval(intervalId);
  }, [isLive, intervalSeconds, loadMetrics]);

  if (isLoading && !metrics) {
    return (
      <div className="p-8 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-32 bg-slate-900 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const kpis = metrics?.kpis;

  return (
    <div className="p-6 sm:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">Institutional Overview</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time assessment telemetry, active candidate sessions, and proctoring forensic alerts.
          </p>
        </div>
      </div>

      {/* Live Stream Controls Bar */}
      <LiveStreamControls
        isLive={isLive}
        onToggleLive={() => setIsLive((prev) => !prev)}
        intervalSeconds={intervalSeconds}
        onChangeInterval={(sec) => setIntervalSeconds(sec)}
        onManualSync={() => loadMetrics(false)}
        isSyncing={isRefreshing}
        lastSyncTime={lastSync}
        activeCount={kpis?.active_attempts}
      />

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatsCard
          title="Active Test-Takers"
          value={kpis?.active_attempts ?? 0}
          subtitle="Currently writing exams"
          icon={Activity}
          color={kpis?.active_attempts && kpis.active_attempts > 0 ? 'emerald' : 'indigo'}
        />

        <StatsCard
          title="Total Candidates"
          value={kpis?.total_students ?? 0}
          subtitle="Registered student profiles"
          icon={Users}
          color="indigo"
        />

        <StatsCard
          title="Active Exams"
          value={kpis?.active_exams ?? 0}
          subtitle={`${kpis?.total_exams ?? 0} total assessments`}
          icon={Layers}
          color="cyan"
        />

        <StatsCard
          title="Average Score"
          value={`${kpis?.average_score ?? 0}%`}
          subtitle={`${kpis?.completed_attempts ?? 0} completed submissions`}
          icon={Award}
          color="emerald"
        />

        <StatsCard
          title="Flagged Attempts"
          value={kpis?.suspicious_attempts ?? 0}
          subtitle={`${kpis?.total_violations ?? 0} total violations`}
          icon={ShieldAlert}
          color={kpis?.suspicious_attempts && kpis.suspicious_attempts > 0 ? 'rose' : 'emerald'}
        />
      </div>

      {/* Two Column Layout: Violation Distribution & Real-Time Attempts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Violation Distribution Breakdown */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white tracking-tight uppercase flex items-center space-x-2">
                <span>Violation Distribution</span>
                {isLive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                )}
              </h3>
              <button
                onClick={() => onNavigateTab('proctoring')}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center space-x-1 cursor-pointer"
              >
                <span>View Incident Center</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3">
              {metrics?.violation_breakdown && Object.keys(metrics.violation_breakdown).length > 0 ? (
                Object.entries(metrics.violation_breakdown).map(([eventType, count]) => {
                  const total = kpis?.total_violations || 1;
                  const percentage = Math.round((count / total) * 100);

                  return (
                    <div key={eventType} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-300">{eventType}</span>
                        <span className="font-mono text-slate-400">
                          {count} events ({percentage}%)
                        </span>
                      </div>
                      <div className="h-2 bg-slate-950 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-indigo-500 via-amber-500 to-rose-500 rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-10 space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto opacity-80" />
                  <p className="text-xs text-slate-400">No violations recorded. 100% integrity baseline maintained.</p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 font-mono">
            <span>Last Synchronized: {lastSync.toLocaleTimeString()}</span>
            <span>Total Events: {kpis?.total_violations ?? 0}</span>
          </div>
        </div>

        {/* Live Submissions & In-Progress Candidates Table */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-bold text-white tracking-tight uppercase">Live Candidate Sessions</h3>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                Real-Time
              </span>
            </div>

            <button
              onClick={() => onNavigateTab('attempts')}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center space-x-1 cursor-pointer"
            >
              <span>All Submissions</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 uppercase text-[10px] font-bold">
                <tr>
                  <th className="p-2.5 rounded-l-lg">Candidate</th>
                  <th className="p-2.5">Exam</th>
                  <th className="p-2.5">Status</th>
                  <th className="p-2.5">Score</th>
                  <th className="p-2.5">Trust</th>
                  <th className="p-2.5 rounded-r-lg text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {metrics?.recent_attempts && metrics.recent_attempts.length > 0 ? (
                  metrics.recent_attempts.slice(0, 6).map((att) => {
                    const isInProgress = att.status === 'in_progress';
                    const isTerminated = att.status === 'terminated';

                    return (
                      <tr key={att.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="p-2.5">
                          <p className="font-semibold text-slate-200">{att.student_name}</p>
                          <p className="text-[10px] text-slate-500 font-mono">
                            {att.student_code || att.student_email}
                          </p>
                        </td>
                        <td className="p-2.5 text-slate-300 max-w-[130px] truncate">{att.exam_title}</td>
                        <td className="p-2.5">
                          {isInProgress ? (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 animate-pulse">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                              <span>Live</span>
                            </span>
                          ) : isTerminated ? (
                            <span className="text-[10px] font-bold text-rose-300 uppercase bg-rose-500/20 border border-rose-500/40 px-2 py-0.5 rounded-md">
                              Terminated
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-slate-400 uppercase bg-slate-800 px-2 py-0.5 rounded-md">
                              {att.status}
                            </span>
                          )}
                        </td>
                        <td className="p-2.5">
                          <span className="font-bold text-white">{att.score}</span>
                          <span className="text-slate-500 text-[10px]"> ({att.percentage}%)</span>
                        </td>
                        <td className="p-2.5">
                          <span
                            className={`px-2 py-0.5 rounded-full font-mono text-[10px] font-bold border ${
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
                        <td className="p-2.5 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            {isInProgress && (
                              <>
                                <button
                                  onClick={() => setSelectedLiveWatchAttempt({ id: att.id, name: att.student_name })}
                                  className="flex items-center space-x-1 px-2 py-1 bg-indigo-600/15 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                                  title="Silent Live Candidate Video Stream"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>Watch</span>
                                </button>
                                <button
                                  onClick={() => setSelectedKickAttempt({ id: att.id, name: att.student_name, exam: att.exam_title })}
                                  className="px-2 py-1 bg-rose-600/15 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                                  title="Kick Candidate"
                                >
                                  Kick
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => onViewAttempt(att.id)}
                              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-indigo-400 hover:text-indigo-300 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                            >
                              Review
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-slate-500">
                      No candidate sessions recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
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
            loadMetrics(false);
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
            loadMetrics(false);
          }}
        />
      )}
    </div>
  );
};

