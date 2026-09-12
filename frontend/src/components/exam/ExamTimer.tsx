import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';
import { formatSeconds } from '../../utils/formatters';
import { attemptService } from '../../services/attempts';

interface ExamTimerProps {
  initialSeconds: number;
  attemptId: number;
  onExpire: () => void;
  onTerminated?: (reason: string) => void;
}

export const ExamTimer: React.FC<ExamTimerProps> = ({ initialSeconds, attemptId, onExpire, onTerminated }) => {
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

  // Periodic fast authoritative synchronization with server (every 3.5 seconds)
  useEffect(() => {
    const syncInterval = setInterval(async () => {
      try {
        const res: any = await attemptService.getTimeRemaining(attemptId);
        if (res.status === 'terminated') {
          setSecondsLeft(0);
          if (onTerminated) {
            onTerminated(res.termination_reason || 'Examination terminated by administrator/proctor.');
          } else {
            onExpire();
          }
        } else if (res.is_expired) {
          setSecondsLeft(0);
          onExpire();
        } else {
          setSecondsLeft(res.remaining_seconds);
        }
      } catch (err) {
        console.warn('Timer server sync check failed, using local countdown:', err);
      }
    }, 3500);

    return () => clearInterval(syncInterval);
  }, [attemptId, onExpire, onTerminated]);

  // Color dynamics
  const isCritical = secondsLeft < 120; // under 2 mins
  const isWarning = secondsLeft < 300 && !isCritical; // under 5 mins

  return (
    <div
      className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl border font-mono font-bold text-sm tracking-wider transition-all shadow-sm ${
        isCritical
          ? 'bg-rose-50 text-rose-700 border-rose-300 animate-pulse'
          : isWarning
          ? 'bg-amber-50 text-amber-800 border-amber-300'
          : 'bg-blue-50 text-blue-700 border-blue-200'
      }`}
    >
      {isCritical ? (
        <AlertTriangle className="w-4 h-4 text-rose-600 animate-bounce" />
      ) : (
        <Clock className="w-4 h-4 text-blue-600" />
      )}
      <span>{formatSeconds(secondsLeft)}</span>
    </div>
  );
};
