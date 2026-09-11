import React, { useState, useEffect } from 'react';
import { analyticsService } from '../../services/analytics';
import { DashboardMetrics } from '../../types';
import { StatsCard } from '../../components/admin/StatsCard';
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

  useEffect(() => {
    async function loadMetrics() {
      try {
        const data = await analyticsService.getDashboardMetrics();
        setMetrics(data);
      } catch (err) {
        console.error('Failed to load dashboard analytics:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadMetrics();
  }, []);

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
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
          <p className="text-xs text-slate-400 mt-0.5">Real-time metrics, active assessments, and incident alerts.</p>
        </div>

        <div className="flex items-center space-x-2 text-xs font-mono text-slate-400 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Proctoring Ingestion Live</span>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Candidates"
          value={kpis?.total_students ?? 0}
          subtitle="Registered student profiles"
          icon={Users}
          color="indigo"
        />

        <StatsCard
          title="Active Examinations"
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
          subtitle={`${kpis?.total_violations ?? 0} total violations recorded`}
          icon={ShieldAlert}
          color={kpis?.suspicious_attempts && kpis.suspicious_attempts > 0 ? 'rose' : 'emerald'}
        />
      </div>

      {/* Two Column Layout: Violation Distribution & Recent Attempts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Violation Distribution Breakdown */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white tracking-tight uppercase">Violation Distribution</h3>
            <button
              onClick={() => onNavigateTab('proctoring')}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center space-x-1"
            >
              <span>View All</span>
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
                      <span className="font-mono text-slate-400">{count} events ({percentage}%)</span>
                    </div>
                    <div className="h-2 bg-slate-950 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-rose-500 rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-slate-500 text-center py-8">No violations recorded to date.</p>
            )}
          </div>
        </div>

        {/* Recent Attempts Table */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white tracking-tight uppercase">Recent Submissions</h3>
            <button
              onClick={() => onNavigateTab('attempts')}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center space-x-1"
            >
              <span>All Attempts</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 uppercase text-[10px] font-bold">
                <tr>
                  <th className="p-2.5 rounded-l-lg">Candidate</th>
                  <th className="p-2.5">Exam</th>
                  <th className="p-2.5">Score</th>
                  <th className="p-2.5">Trust Score</th>
                  <th className="p-2.5 rounded-r-lg">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {metrics?.recent_attempts.slice(0, 5).map((att) => (
                  <tr key={att.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="p-2.5">
                      <p className="font-semibold text-slate-200">{att.student_name}</p>
                      <p className="text-[10px] text-slate-500 font-mono">{att.student_code || att.student_email}</p>
                    </td>
                    <td className="p-2.5 text-slate-300 max-w-[150px] truncate">{att.exam_title}</td>
                    <td className="p-2.5">
                      <span className="font-bold text-white">{att.score}</span>
                      <span className="text-slate-500 text-[10px]"> ({att.percentage}%)</span>
                    </td>
                    <td className="p-2.5">
                      <span
                        className={`px-2 py-0.5 rounded-full font-mono text-[10px] font-bold ${
                          att.proctoring_score >= 85
                            ? 'text-emerald-400 bg-emerald-500/10'
                            : 'text-rose-400 bg-rose-500/10'
                        }`}
                      >
                        {att.proctoring_score}%
                      </span>
                    </td>
                    <td className="p-2.5">
                      <button
                        onClick={() => onViewAttempt(att.id)}
                        className="text-xs font-semibold text-indigo-400 hover:text-indigo-300"
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
