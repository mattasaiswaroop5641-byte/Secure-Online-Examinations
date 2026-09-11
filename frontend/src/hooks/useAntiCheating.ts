import { useEffect, useCallback, useState, useRef } from 'react';
import { ProctoringEventType, ViolationSeverity } from '../types';

interface AntiCheatingOptions {
  isActive: boolean;
  onViolation: (eventType: ProctoringEventType, severity: ViolationSeverity, desc: string) => void;
}

export function useAntiCheating({ isActive, onViolation }: AntiCheatingOptions) {
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [fullscreenWarning, setFullscreenWarning] = useState<boolean>(false);
  const [windowBlurWarning, setWindowBlurWarning] = useState<string | null>(null);
  const lastBlurTimeRef = useRef<number>(0);

  const onViolationRef = useRef(onViolation);
  onViolationRef.current = onViolation;

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
        onViolationRef.current(
          'FULLSCREEN_EXIT',
          'HIGH',
          'Candidate exited required fullscreen examination mode.'
        );
      }
    };

    // 2. Alt+Tab / App Switch & Window Blur Detection
    const triggerSwitchViolation = (trigger: string) => {
      const now = Date.now();
      // Debounce trigger within 2 seconds
      if (now - lastBlurTimeRef.current < 2000) {
        return;
      }
      lastBlurTimeRef.current = now;
      setWindowBlurWarning(`Security Alert: Application Switch Detected (${trigger})`);
      setTimeout(() => setWindowBlurWarning(null), 5000);

      onViolationRef.current(
        'TAB_SWITCH',
        'HIGH',
        `Application Switch Detected (${trigger}). Candidate navigated away from active examination window.`
      );
    };

    const handleWindowBlur = () => {
      triggerSwitchViolation('Alt+Tab / Window Focus Lost');
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        triggerSwitchViolation('Tab / Browser Minimized');
      }
    };

    const handlePageHide = () => {
      triggerSwitchViolation('Page Minimized / Hidden');
    };

    // 3. Right-click context menu suppression
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    // 4. Copy / Cut / Paste suppression
    const handleCopyCutPaste = (e: ClipboardEvent) => {
      e.preventDefault();
      onViolationRef.current('DEVTOOLS_SUSPECT', 'MEDIUM', 'Prohibited clipboard operation (copy/cut/paste) attempted.');
    };

    // 5. Prohibited hotkeys & DevTools prevention
    const handleKeyDown = (e: KeyboardEvent) => {
      // F12 (DevTools)
      if (e.key === 'F12') {
        e.preventDefault();
        onViolationRef.current('DEVTOOLS_SUSPECT', 'HIGH', 'Attempted to open Developer Tools via F12.');
      }
      // Alt key tracking (Alt+Tab, Alt+F4, Alt+Space)
      if (e.altKey || e.key === 'Alt') {
        if (e.key === 'Tab' || e.key === 'Escape' || e.key === 'F4') {
          triggerSwitchViolation('Alt+Tab / Task Switch Shortcut');
        }
      }
      // Ctrl+C, Ctrl+V, Ctrl+U, Ctrl+Shift+I, Ctrl+Shift+J
      if (e.ctrlKey || e.metaKey) {
        if (['c', 'v', 'x', 'u', 'a', 'p', 'w'].includes(e.key.toLowerCase())) {
          e.preventDefault();
        }
        if (e.shiftKey && ['i', 'j', 'c'].includes(e.key.toLowerCase())) {
          e.preventDefault();
          onViolationRef.current('DEVTOOLS_SUSPECT', 'HIGH', 'Attempted developer console shortcut.');
        }
      }
    };

    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('copy', handleCopyCutPaste);
    document.addEventListener('cut', handleCopyCutPaste);
    document.addEventListener('paste', handleCopyCutPaste);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('copy', handleCopyCutPaste);
      document.removeEventListener('cut', handleCopyCutPaste);
      document.removeEventListener('paste', handleCopyCutPaste);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isActive]);

  return {
    isFullscreen,
    fullscreenWarning,
    windowBlurWarning,
    requestFullscreen,
    exitFullscreen,
    dismissFullscreenWarning: () => setFullscreenWarning(false),
  };
}

