import React, { useState, useEffect, useCallback } from 'react';
import { ProctoringEvent, ViolationSeverity } from '../../types';
import { ProctoringTimeline } from '../../components/admin/ProctoringTimeline';
import { proctoringService } from '../../services/proctoring';
import { apiRequest } from '../../services/api';
import { ShieldAlert, Filter, Search, CheckCircle2, AlertTriangle, Trash2, RefreshCw, Radio } from 'lucide-react';

export const ProctoringReportsPage: React.FC = () => {
  const [events, setEvents] = useState<ProctoringEvent[]>([]);
  const [selectedSeverity, setSelectedSeverity] = useState<string>('');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isLive, setIsLive] = useState(true);
  const [isClearing, setIsClearing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const loadEvents = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsSyncing(true);
    try {
      // Fetch all attempts to gather all events
      const attempts = await apiRequest<any[]>('/attempts');
      const allEvents: ProctoringEvent[] = [];

      // Fetch proctoring summary for each attempt
      for (const att of attempts) {
        try {
          const summary = await apiRequest<any>(`/proctoring/${att.id}`);
          if (summary.events) {
            allEvents.push(...summary.events);
          }
        } catch (e) {
          // ignore individual attempt summary fetch errors
        }
      }

      // Sort descending by timestamp
      allEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setEvents(allEvents);
    } catch (err) {
      console.error('Failed to load proctoring reports:', err);
    } finally {
      setIsLoading(false);
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    loadEvents(false);
  }, [loadEvents]);

  // Live Auto-Refresh Stream (every 3.0s)
  useEffect(() => {
    if (!isLive) return;
    const intervalId = setInterval(() => {
      loadEvents(true);
    }, 3000);

    return () => clearInterval(intervalId);
  }, [isLive, loadEvents]);

  const handleClearAll = async () => {
    if (events.length === 0) return;
    if (
      !window.confirm(
        'Are you sure you want to permanently delete ALL recorded proctoring incidents across all candidates? This cannot be undone.'
      )
    ) {
      return;
    }

    setIsClearing(true);
    try {
      await proctoringService.clearEvents();
      setEvents([]);
    } catch (err) {
      console.error('Failed to clear proctoring events:', err);
      alert('Failed to clear incidents: ' + (err as Error).message);
    } finally {
      setIsClearing(false);
    }
  };

  const filteredEvents = events.filter((ev) => {
    const matchesSeverity = !selectedSeverity || ev.severity === selectedSeverity;
    const matchesSearch =
      !search ||
      ev.event_type.toLowerCase().includes(search.toLowerCase()) ||
      (ev.student_name && ev.student_name.toLowerCase().includes(search.toLowerCase())) ||
      (ev.description && ev.description.toLowerCase().includes(search.toLowerCase()));
    return matchesSeverity && matchesSearch;
  });

  return (
    <div className="p-6 sm:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">Proctoring Incident Center</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Continuous webcam audit records, computer vision forensic alerts, and screenshot evidence.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {/* Live Ingestion Switch Badge */}
          <button
            onClick={() => setIsLive((prev) => !prev)}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
              isLive
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.15)]'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-300'
            }`}
          >
            <span className="relative flex h-2 w-2">
              {isLive && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
              )}
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  isLive ? 'bg-rose-500' : 'bg-slate-500'
                }`}
              />
            </span>
            <span>{isLive ? 'Live Ingestion (3s)' : 'Live Polling Paused'}</span>
          </button>

          <button
            onClick={() => loadEvents(false)}
            disabled={isSyncing}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-xl text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
            title="Refresh Incident Log"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-cyan-400' : ''}`} />
            <span>Sync</span>
          </button>

          {events.length > 0 && (
            <button
              onClick={handleClearAll}
              disabled={isClearing}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isClearing ? 'Clearing...' : 'Clear All Incidents'}</span>
            </button>
          )}

          <span className="text-xs font-mono text-rose-400 bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 rounded-xl font-semibold">
            {events.length} Total Incident(s) Logged
          </span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search incidents by event type, candidate, or keyword..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-slate-500" />
          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none"
          >
            <option value="">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>
      </div>

      {/* Timeline */}
      {isLoading && events.length === 0 ? (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-24 bg-slate-900 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <ProctoringTimeline
          events={filteredEvents}
          onEventResolved={(id) => {
            setEvents((prev) =>
              prev.map((e) => (e.id === id ? { ...e, resolved: true } : e))
            );
          }}
          onEventDeleted={(id) => {
            setEvents((prev) => prev.filter((e) => e.id !== id));
          }}
        />
      )}
    </div>
  );
};


