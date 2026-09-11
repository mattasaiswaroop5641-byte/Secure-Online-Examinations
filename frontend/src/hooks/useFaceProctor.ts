import { useState, useEffect, useRef, useCallback } from 'react';
import { analyzeVideoFrame, captureVideoFrame, FaceDetectionResult } from '../utils/faceDetection';
import { proctoringService } from '../services/proctoring';
import { ProctoringEventType, ViolationSeverity } from '../types';

interface UseFaceProctorOptions {
  attemptId: number | null;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isActive: boolean;
  onViolation?: (event_type: ProctoringEventType, severity: ViolationSeverity) => void;
  onAutoTerminate?: (reason: string) => void;
  maxViolationsAllowed?: number;
}

export function useFaceProctor({
  attemptId,
  videoRef,
  isActive,
  onViolation,
  onAutoTerminate,
  maxViolationsAllowed = 3,
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

  // Cooldown to prevent spamming backend (minimum 6 seconds between same incident reports)
  const lastReportedTimeRef = useRef<Record<string, number>>({});
  const isTerminatedRef = useRef<boolean>(false);

  const reportViolation = useCallback(
    async (
      eventType: ProctoringEventType,
      severity: ViolationSeverity,
      duration: number,
      description: string
    ) => {
      if (!attemptId || isTerminatedRef.current) return;

      const now = Date.now();
      const last = lastReportedTimeRef.current[eventType] || 0;
      if (now - last < 6000) {
        // Debounce reports of identical violation within 6s
        return;
      }
      lastReportedTimeRef.current[eventType] = now;

      // Capture screenshot snapshot
      let screenshotBase64 = '';
      if (videoRef.current) {
        screenshotBase64 = captureVideoFrame(videoRef.current, 0.75);
      }

      try {
        await proctoringService.logEvent({
          attempt_id: attemptId,
          event_type: eventType,
          severity,
          duration_seconds: Math.round(duration * 10) / 10,
          description,
          screenshot_base64: screenshotBase64 || undefined,
          timestamp: new Date().toISOString(),
        });


        // Deduct local trust score for instant feedback
        const deductions: Record<ViolationSeverity, number> = {
          CRITICAL: 20,
          HIGH: 12,
          MEDIUM: 6,
          LOW: 2,
        };

        const newScore = Math.max(0, Math.round((trustScore - (deductions[severity] || 5)) * 10) / 10);
        const newCount = violationCount + 1;

        setTrustScore(newScore);
        setViolationCount(newCount);

        if (onViolation) {
          onViolation(eventType, severity);
        }

        // Check if auto-kick threshold reached
        if (newCount >= maxViolationsAllowed || newScore <= 40) {
          isTerminatedRef.current = true;
          if (onAutoTerminate) {
            onAutoTerminate(
              `Maximum allowed proctoring violations exceeded (${newCount}/${maxViolationsAllowed}). Integrity score dropped to ${newScore}%. Examination terminated.`
            );
          }
        }
      } catch (err) {
        console.error('Failed to log proctoring violation to server:', err);
      }
    },
    [attemptId, videoRef, onViolation, onAutoTerminate, trustScore, violationCount, maxViolationsAllowed]
  );

  useEffect(() => {
    if (!isActive || !videoRef.current) return;

    const intervalId = setInterval(() => {
      const video = videoRef.current;
      if (!video || (video.readyState < 2 && video.videoWidth === 0)) return;

      const res = analyzeVideoFrame(video);
      setDetection(res);

      const TICK_SEC = 0.75;

      // 1. NO_FACE check (Calibrated: Grace = 3s, Warning = 6s, Violation = 10s)
      if (res.status === 'NO_FACE') {
        noFaceDurationRef.current += TICK_SEC;
        if (noFaceDurationRef.current >= 3 && noFaceDurationRef.current < 6) {
          setWarningMessage('⚠️ Warning: Face not visible. Position your face in front of the camera.');
        } else if (noFaceDurationRef.current >= 6 && noFaceDurationRef.current < 10) {
          setWarningMessage('🚨 Alert: Prolonged absence detected! Face must be visible.');
        } else if (noFaceDurationRef.current >= 10) {
          setWarningMessage('❌ Violation Logged: Prolonged absence from exam camera.');
          reportViolation(
            'NO_FACE_DETECTED',
            'HIGH',
            noFaceDurationRef.current,
            'No candidate face detected in camera viewport for more than 10 seconds.'
          );
        }
      } else {
        noFaceDurationRef.current = 0;
      }

      // 2. MULTIPLE_FACES check (Critical violation immediately)
      if (res.status === 'MULTIPLE_FACES') {
        multipleFacesDurationRef.current += TICK_SEC;
        setWarningMessage('🚨 Critical: Multiple faces detected in exam view!');
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

      // 3. LOOKING_AWAY check (Grace = 3s, Warning = 5s, Violation = 8s)
      if (res.status === 'LOOKING_AWAY') {
        lookingAwayDurationRef.current += TICK_SEC;
        if (lookingAwayDurationRef.current >= 3 && lookingAwayDurationRef.current < 8) {
          setWarningMessage(`⚠️ Attention shifted (${res.lookingDirection.toLowerCase()}). Please focus on your exam screen.`);
        } else if (lookingAwayDurationRef.current >= 8) {
          setWarningMessage('❌ Violation Logged: Suspicious head pose / gaze deflection.');
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
          setWarningMessage('⚠️ Warning: Face partially out of camera frame.');
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
