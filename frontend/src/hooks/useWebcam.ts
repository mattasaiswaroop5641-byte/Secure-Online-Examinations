import { useState, useEffect, useRef, useCallback } from 'react';

export type CameraStatus = 'idle' | 'prompting' | 'granted' | 'denied' | 'error';

export function useWebcam() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [status, setStatus] = useState<CameraStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const startCamera = useCallback(async () => {
    setStatus('prompting');
    setErrorMessage(null);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Your browser does not support webcam media access.');
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
        audio: false,
      });

      setStream(mediaStream);
      setStatus('granted');

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play().catch(() => {});
      }
      return mediaStream;
    } catch (err: any) {
      console.error('Camera access error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setStatus('denied');
        setErrorMessage('Camera access was denied. Please allow camera permissions in your browser to proceed.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setStatus('error');
        setErrorMessage('No camera device found on your system.');
      } else {
        setStatus('error');
        setErrorMessage(err.message || 'Unable to access camera.');
      }
      return null;
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setStatus('idle');
  }, [stream]);

  // Attach stream to video whenever ref or stream changes
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }
  }, [stream]);

  return {
    videoRef,
    stream,
    status,
    errorMessage,
    startCamera,
    stopCamera,
    isReady: status === 'granted' && stream !== null,
  };
}
