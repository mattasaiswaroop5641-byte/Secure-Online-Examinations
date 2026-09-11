import { useState, useEffect, useRef, useCallback } from 'react';
import { analyzeVideoFrame, captureVideoFrame, FaceDetectionResult } from '../utils/faceDetection';
import { proctoringService } from '../services/proctoring';
import { ProctoringEventType, ViolationSeverity } from '../types';

interface UseFaceProctorOptions {
  attemptId: number | null;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isActive: boolean;
  onViolation?: (event_type: ProctoringEventType, severity: ViolationSeverity) => void;
}

export function useFaceProctor({
  attemptId,
  videoRef,
  isActive,
  onViolation,
}: UseFaceProctorOptions) {
  const [detection, setDetection] = useState<FaceDetectionResult>({
    faceCount: 0,
    faceBox: null,
    isCentered: false,
    lookingDirection: 'CENTER',
    status: 'NO_FACE',
    confidence: 0,
  });

  const [trustScore, setTrustScore] = useState<number>(100);
  const [violationCount, setViolationCount] = useState<number>(0);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);

  // Consecutive counters in seconds (ticks every 0.75s)
  const noFaceDurationRef = useRef<number>(0);
  const lookingAwayDurationRef = useRef<number>(0);
  const multipleFacesDurationRef = useRef<number>(0);
  const outOfFrameDurationRef = useRef<number>(0);

  // Cooldown to prevent spamming backend (minimum 10 seconds between same incident reports)
  const lastReportedTimeRef = useRef<Record<string, number>>({});

  const reportViolation = useCallback(
    async (
      eventType: ProctoringEventType,
      severity: ViolationSeverity,
      duration: number,
      description: string
    ) => {
      if (!attemptId) return;

      const now = Date.now();
      const last = lastReportedTimeRef.current[eventType] || 0;
      if (now - last < 8000) {
        // Debounce reports of identical violation within 8s
        return;
      }
      lastReportedTimeRef.current[eventType] = now;

      // Capture screenshot snapshot
      let screenshotBase64 = '';
      if (videoRef.current) {
        screenshotBase64 = captureVideoFrame(videoRef.current);
      }

      try {
        await proctoringService.logEvent({
          attempt_id: attemptId,
          event_type: eventType,
          severity,
          duration_seconds: Math.round(duration * 10) / 10,
          description,
          screenshot_base64: screenshotBase64 || undefined,
        });

        // Deduct local trust score for instant feedback
        const deductions: Record<ViolationSeverity, number> = {
          CRITICAL: 15,
          HIGH: 10,
          MEDIUM: 4,
          LOW: 1.5,
        };
        setTrustScore((prev) => Math.max(0, Math.round((prev - (deductions[severity] || 3)) * 10) / 10));
        setViolationCount((prev) => prev + 1);

        if (onViolation) {
          onViolation(eventType, severity);
        }
      } catch (err) {
        console.error('Failed to log proctoring violation to server:', err);
      }
    },
    [attemptId, videoRef, onViolation]
  );

  useEffect(() => {
    if (!isActive || !videoRef.current) return;

    const intervalId = setInterval(() => {
      const video = videoRef.current;
      if (!video || video.readyState < 2) return;

      const res = analyzeVideoFrame(video);
      setDetection(res);

      const TICK_SEC = 0.75;

      // 1. NO_FACE check
      if (res.status === 'NO_FACE') {
        noFaceDurationRef.current += TICK_SEC;
        if (noFaceDurationRef.current >= 3 && noFaceDurationRef.current < 7) {
          setWarningMessage('Warning: No face detected. Please position your face inside the camera frame.');
        } else if (noFaceDurationRef.current >= 7) {
          setWarningMessage('Violation: Face missing for extended period.');
          reportViolation(
            'NO_FACE_DETECTED',
            'HIGH',
            noFaceDurationRef.current,
            'No candidate face detected in camera viewport for more than 7 seconds.'
          );
        }
      } else {
        noFaceDurationRef.current = 0;
      }

      // 2. MULTIPLE_FACES check
      if (res.status === 'MULTIPLE_FACES') {
        multipleFacesDurationRef.current += TICK_SEC;
        setWarningMessage('Critical: Multiple faces detected in camera view!');
        if (multipleFacesDurationRef.current >= 1.5) {
          reportViolation(
            'MULTIPLE_FACES_DETECTED',
            'CRITICAL',
            multipleFacesDurationRef.current,
            `Multiple individuals detected in exam area (${res.faceCount} faces identified).`
          );
        }
      } else {
        multipleFacesDurationRef.current = 0;
      }

      // 3. LOOKING_AWAY check
      if (res.status === 'LOOKING_AWAY') {
        lookingAwayDurationRef.current += TICK_SEC;
        if (lookingAwayDurationRef.current >= 3 && lookingAwayDurationRef.current < 7) {
          setWarningMessage(`Warning: Attention shifted (${res.lookingDirection.toLowerCase()}). Please keep your eyes on the screen.`);
        } else if (lookingAwayDurationRef.current >= 7) {
          reportViolation(
            'LOOKING_AWAY',
            'MEDIUM',
            lookingAwayDurationRef.current,
            `Candidate consistently looking away (${res.lookingDirection}) from exam screen.`
          );
        }
      } else {
        lookingAwayDurationRef.current = 0;
      }

      // 4. OUT_OF_FRAME check
      if (res.status === 'OUT_OF_FRAME') {
        outOfFrameDurationRef.current += TICK_SEC;
        if (outOfFrameDurationRef.current >= 3) {
          setWarningMessage('Warning: Face partially out of camera frame.');
          if (outOfFrameDurationRef.current >= 8) {
            reportViolation(
              'FACE_OUT_OF_FRAME',
              'MEDIUM',
              outOfFrameDurationRef.current,
              'Candidate face drifted near camera boundary or partially obstructed.'
            );
          }
        }
      } else {
        outOfFrameDurationRef.current = 0;
      }

      // If normal, clear warning message
      if (res.status === 'NORMAL') {
        setWarningMessage(null);
      }
    }, 750);

    return () => clearInterval(intervalId);
  }, [isActive, videoRef, reportViolation]);

  return {
    detection,
    trustScore,
    violationCount,
    warningMessage,
    clearWarning: () => setWarningMessage(null),
    reportViolation,
  };
}
