import React from 'react';
import { Radio, RefreshCw, Activity, Clock, Sliders } from 'lucide-react';

interface LiveStreamControlsProps {
  isLive: boolean;
  onToggleLive: () => void;
  intervalSeconds: number;
  onChangeInterval: (seconds: number) => void;
  onManualSync: () => void;
  isSyncing: boolean;
  lastSyncTime?: Date;
  activeCount?: number;
}

export const LiveStreamControls: React.FC<LiveStreamControlsProps> = ({
  isLive,
  onToggleLive,
  intervalSeconds,
  onChangeInterval,
  onManualSync,
  isSyncing,
  lastSyncTime,
  activeCount,
}) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-sm text-xs">
      {/* Left: Live Toggle Badge & Active Count */}
      <div className="flex items-center space-x-3">
        <button
          onClick={onToggleLive}
          className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl border font-semibold transition-all cursor-pointer ${
            isLive
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.15)]'
              : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-300'
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
          <span>{isLive ? `Live Stream Active (${intervalSeconds}s)` : 'Live Stream Paused'}</span>
        </button>

        {activeCount !== undefined && activeCount > 0 && (
          <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-mono text-[11px] font-semibold">
            <Activity className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
            <span>{activeCount} Active Session{activeCount > 1 ? 's' : ''}</span>
          </div>
        )}
      </div>

      {/* Right: Cadence Interval Selector & Manual Sync */}
      <div className="flex items-center space-x-2.5">
        {/* Interval Selector */}
        <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px]">
          <span className="text-slate-500 px-1.5 font-medium flex items-center space-x-1">
            <Sliders className="w-3 h-3" />
            <span className="hidden md:inline">Rate:</span>
          </span>
          {[2, 5, 10].map((sec) => (
            <button
              key={sec}
              onClick={() => onChangeInterval(sec)}
              className={`px-2 py-0.5 rounded-lg font-mono font-semibold transition-colors cursor-pointer ${
                intervalSeconds === sec
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              {sec}s
            </button>
          ))}
        </div>

        {/* Sync Button */}
        <button
          onClick={onManualSync}
          disabled={isSyncing}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-xl font-semibold transition-colors cursor-pointer disabled:opacity-50"
          title="Manual Force Refresh"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-cyan-400' : ''}`} />
          <span className="hidden sm:inline">Sync</span>
        </button>

        {lastSyncTime && (
          <span className="hidden lg:inline text-[10px] text-slate-500 font-mono">
            {lastSyncTime.toLocaleTimeString()}
          </span>
        )}
      </div>
    </div>
  );
};
