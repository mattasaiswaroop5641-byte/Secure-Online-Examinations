import { useEffect, useCallback, useState, useRef } from 'react';
import { ProctoringEventType, ViolationSeverity } from '../types';

interface AntiCheatingOptions {
  isActive: boolean;
  onViolation: (eventType: ProctoringEventType, severity: ViolationSeverity, desc: string) => void;
}

export function useAntiCheating({ isActive, onViolation }: AntiCheatingOptions) {
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [fullscreenWarning, setFullscreenWarning] = useState<boolean>(false);
  const tabLeaveTimeRef = useRef<number | null>(null);

  const requestFullscreen = useCallback(async () => {
    try {
      const docEl = document.documentElement as any;
      if (docEl.requestFullscreen) {
        await docEl.requestFullscreen();
      } else if (docEl.webkitRequestFullscreen) {
        await docEl.webkitRequestFullscreen();
      } else if (docEl.msRequestFullscreen) {
        await docEl.msRequestFullscreen();
      }
      setIsFullscreen(true);
      setFullscreenWarning(false);
    } catch (err) {
      console.warn('Fullscreen request rejected or blocked by browser gesture policy:', err);
    }
  }, []);

  const exitFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement && document.exitFullscreen) {
        await document.exitFullscreen();
      }
      setIsFullscreen(false);
    } catch (err) {
      console.warn('Exit fullscreen error:', err);
    }
  }, []);

  useEffect(() => {
    if (!isActive) return;

    // 1. Fullscreen changes
    const handleFullscreenChange = () => {
      const isNowFs = Boolean(document.fullscreenElement);
      setIsFullscreen(isNowFs);
      if (!isNowFs && isActive) {
        setFullscreenWarning(true);
        onViolation(
          'FULLSCREEN_EXIT',
          'HIGH',
          'Candidate exited required fullscreen examination mode.'
        );
      }
    };

    // 2. Tab switch & visibility
    const handleVisibilityChange = () => {
      if (document.hidden) {
        tabLeaveTimeRef.current = Date.now();
        onViolation(
          'TAB_SWITCH',
          'HIGH',
          'Browser tab switch detected. Candidate minimized or switched away from the examination window.'
        );
      } else {
        if (tabLeaveTimeRef.current) {
          const awaySec = Math.round((Date.now() - tabLeaveTimeRef.current) / 1000);
          tabLeaveTimeRef.current = null;
        }
      }
    };

    // 3. Right-click context menu suppression
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    // 4. Copy / Cut / Paste suppression
    const handleCopyCutPaste = (e: ClipboardEvent) => {
      e.preventDefault();
    };

    // 5. Prohibited hotkeys
    const handleKeyDown = (e: KeyboardEvent) => {
      // F12 (DevTools)
      if (e.key === 'F12') {
        e.preventDefault();
        onViolation('DEVTOOLS_SUSPECT', 'HIGH', 'Attempted to open Developer Tools via F12.');
      }
      // Ctrl+C, Ctrl+V, Ctrl+U, Ctrl+Shift+I, Ctrl+Shift+J
      if (e.ctrlKey || e.metaKey) {
        if (['c', 'v', 'x', 'u', 'a', 'p'].includes(e.key.toLowerCase())) {
          e.preventDefault();
        }
        if (e.shiftKey && ['i', 'j', 'c'].includes(e.key.toLowerCase())) {
          e.preventDefault();
          onViolation('DEVTOOLS_SUSPECT', 'HIGH', 'Attempted developer console shortcut.');
        }
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('copy', handleCopyCutPaste);
    document.addEventListener('cut', handleCopyCutPaste);
    document.addEventListener('paste', handleCopyCutPaste);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('copy', handleCopyCutPaste);
      document.removeEventListener('cut', handleCopyCutPaste);
      document.removeEventListener('paste', handleCopyCutPaste);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isActive, onViolation]);

  return {
    isFullscreen,
    fullscreenWarning,
    requestFullscreen,
    exitFullscreen,
    dismissFullscreenWarning: () => setFullscreenWarning(false),
  };
}
