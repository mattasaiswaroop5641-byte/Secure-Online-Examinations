import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';
import { formatSeconds } from '../../utils/formatters';
import { attemptService } from '../../services/attempts';

interface ExamTimerProps {
  initialSeconds: number;
  attemptId: number;
  onExpire: () => void;
}

export const ExamTimer: React.FC<ExamTimerProps> = ({ initialSeconds, attemptId, onExpire }) => {
  const [secondsLeft, setSecondsLeft] = useState<number>(initialSeconds);

  // Local second-by-second countdown
  useEffect(() => {
    if (secondsLeft <= 0) {
      onExpire();
      return;
    }

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onExpire();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [secondsLeft, onExpire]);

  // Periodic authoritative synchronization with server (every 25 seconds)
  useEffect(() => {
    const syncInterval = setInterval(async () => {
      try {
        const res = await attemptService.getTimeRemaining(attemptId);
        if (res.is_expired) {
          setSecondsLeft(0);
          onExpire();
        } else {
          setSecondsLeft(res.remaining_seconds);
        }
      } catch (err) {
        console.warn('Timer server sync check failed, using local countdown:', err);
      }
    }, 25000);

    return () => clearInterval(syncInterval);
  }, [attemptId, onExpire]);

  // Color dynamics
  const isCritical = secondsLeft < 120; // under 2 mins
  const isWarning = secondsLeft < 300 && !isCritical; // under 5 mins

  return (
    <div
      className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl border font-mono font-bold text-sm tracking-wider transition-all ${
        isCritical
          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse shadow-lg shadow-rose-500/20'
          : isWarning
          ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
          : 'bg-slate-950/80 text-emerald-400 border-emerald-500/30'
      }`}
    >
      {isCritical ? (
        <AlertTriangle className="w-4 h-4 text-rose-400 animate-bounce" />
      ) : (
        <Clock className="w-4 h-4" />
      )}
      <span>{formatSeconds(secondsLeft)}</span>
    </div>
  );
};
