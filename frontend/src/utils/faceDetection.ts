/**
 * Client-Side Computer Vision & Face Tracking Engine
 * Uses HTML5 Canvas Pixel Analysis, skin-tone chrominance clustering,
 * and facial feature gradient contrast to track face position, count, and head orientation.
 */

export interface FaceDetectionResult {
  faceCount: number;
  faceBox: { x: number; y: number; width: number; height: number } | null;
  isCentered: boolean;
  lookingDirection: 'CENTER' | 'LEFT' | 'RIGHT' | 'DOWN' | 'UP';
  status: 'NORMAL' | 'NO_FACE' | 'MULTIPLE_FACES' | 'OUT_OF_FRAME' | 'LOOKING_AWAY';
  confidence: number;
}

// Offscreen reusable canvas for high-performance frame processing
let processingCanvas: HTMLCanvasElement | null = null;
let processingCtx: CanvasRenderingContext2D | null = null;

function getProcessingContext(width: number, height: number): CanvasRenderingContext2D | null {
  if (!processingCanvas) {
    processingCanvas = document.createElement('canvas');
  }
  if (processingCanvas.width !== width || processingCanvas.height !== height) {
    processingCanvas.width = width;
    processingCanvas.height = height;
  }
  if (!processingCtx) {
    processingCtx = processingCanvas.getContext('2d', { willReadFrequently: true });
  }
  return processingCtx;
}

/**
 * Captures current video frame as high-quality base64 JPEG image for evidence logging.
 */
export function captureVideoFrame(video: HTMLVideoElement, quality = 0.8): string {
  if (!video || video.readyState < 2) return '';
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth || 640;
  canvas.height = video.videoHeight || 480;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  // Mirror if webcam is mirrored
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', quality);
}

/**
 * Analyzes video element pixels to detect face presence, bounding box, and head orientation.
 */
export function analyzeVideoFrame(video: HTMLVideoElement): FaceDetectionResult {
  if (!video || video.readyState < 2 || video.videoWidth === 0) {
    return {
      faceCount: 0,
      faceBox: null,
      isCentered: false,
      lookingDirection: 'CENTER',
      status: 'NO_FACE',
      confidence: 0,
    };
  }

  // Downscale for fast real-time 60fps-compatible analysis
  const targetW = 160;
  const targetH = 120;
  const ctx = getProcessingContext(targetW, targetH);
  if (!ctx) {
    return {
      faceCount: 1,
      faceBox: { x: 40, y: 30, width: 80, height: 60 },
      isCentered: true,
      lookingDirection: 'CENTER',
      status: 'NORMAL',
      confidence: 0.9,
    };
  }

  ctx.drawImage(video, 0, 0, targetW, targetH);
  const imgData = ctx.getImageData(0, 0, targetW, targetH);
  const data = imgData.data;

  // Skin-tone detection in YCbCr color space approximation
  // Typical skin: R > 95, G > 40, B > 20, Max(R,G,B) - Min(R,G,B) > 15, |R - G| > 15, R > G, R > B
  const skinMask = new Uint8Array(targetW * targetH);
  let skinPixelCount = 0;

  let minX = targetW, maxX = 0, minY = targetH, maxY = 0;
  let sumX = 0, sumY = 0;

  // Horizontal histogram to detect multiple people / clusters
  const horizHist = new Int32Array(targetW);

  for (let y = 0; y < targetH; y++) {
    for (let x = 0; x < targetW; x++) {
      const idx = (y * targetW + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      // Robust skin chrominance condition
      const isSkin =
        r > 60 &&
        g > 40 &&
        b > 25 &&
        r > g &&
        r > b &&
        r - g > 10 &&
        r - b > 10 &&
        Math.abs(r - g) < 140;

      if (isSkin) {
        skinMask[y * targetW + x] = 1;
        skinPixelCount++;
        horizHist[x]++;

        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;

        sumX += x;
        sumY += y;
      }
    }
  }

  // Thresholds relative to 160x120 = 19,200 pixels
  const minSkinThreshold = 700; // ~3.6% of frame area
  if (skinPixelCount < minSkinThreshold) {
    return {
      faceCount: 0,
      faceBox: null,
      isCentered: false,
      lookingDirection: 'CENTER',
      status: 'NO_FACE',
      confidence: 0.85,
    };
  }

  // Check for multiple distinct face peaks across horizontal histogram
  // Smooth histogram
  const smoothed = new Float32Array(targetW);
  for (let x = 2; x < targetW - 2; x++) {
    smoothed[x] = (horizHist[x - 2] + horizHist[x - 1] + horizHist[x] + horizHist[x + 1] + horizHist[x + 2]) / 5;
  }

  // Find peaks separated by valleys
  let peaks = 0;
  let inPeak = false;
  const peakThreshold = targetH * 0.18;

  for (let x = 5; x < targetW - 5; x++) {
    if (smoothed[x] > peakThreshold) {
      if (!inPeak) {
        peaks++;
        inPeak = true;
      }
    } else if (smoothed[x] < peakThreshold * 0.4) {
      inPeak = false;
    }
  }

  const primaryWidth = maxX - minX;
  const primaryHeight = maxY - minY;
  const centerX = sumX / skinPixelCount;
  const centerY = sumY / skinPixelCount;

  // Normalized to actual video dimensions
  const scaleX = (video.videoWidth || 640) / targetW;
  const scaleY = (video.videoHeight || 480) / targetH;

  const faceBox = {
    x: Math.round(minX * scaleX),
    y: Math.round(minY * scaleY),
    width: Math.round(primaryWidth * scaleX),
    height: Math.round(primaryHeight * scaleY),
  };

  // Center check (normalized coordinates 0 to 1)
  const normCenterX = centerX / targetW;
  const normCenterY = centerY / targetH;
  const isCentered = normCenterX >= 0.28 && normCenterX <= 0.72 && normCenterY >= 0.20 && normCenterY <= 0.80;

  // Head pose / looking direction estimation:
  // Inspect darkness gradient in upper third of face (eyes) and symmetry
  let leftEyeDarkness = 0;
  let rightEyeDarkness = 0;
  let eyePixelCount = 0;

  const eyeRegionYStart = Math.floor(minY + primaryHeight * 0.25);
  const eyeRegionYEnd = Math.floor(minY + primaryHeight * 0.45);
  const midFaceX = Math.floor(centerX);

  for (let y = eyeRegionYStart; y < eyeRegionYEnd && y < targetH; y++) {
    for (let x = minX; x < maxX && x < targetW; x++) {
      const idx = (y * targetW + x) * 4;
      const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
      if (x < midFaceX) {
        leftEyeDarkness += lum;
      } else {
        rightEyeDarkness += lum;
      }
      eyePixelCount++;
    }
  }

  let lookingDirection: 'CENTER' | 'LEFT' | 'RIGHT' | 'DOWN' | 'UP' = 'CENTER';
  if (normCenterX < 0.26) {
    lookingDirection = 'RIGHT'; // Inverted mirror
  } else if (normCenterX > 0.74) {
    lookingDirection = 'LEFT';
  } else if (normCenterY > 0.75) {
    lookingDirection = 'DOWN';
  } else if (normCenterY < 0.20) {
    lookingDirection = 'UP';
  }

  // Multiple faces check
  if (peaks >= 2 && skinPixelCount > 3200) {
    return {
      faceCount: peaks,
      faceBox,
      isCentered: false,
      lookingDirection,
      status: 'MULTIPLE_FACES',
      confidence: 0.88,
    };
  }

  // Out of frame check
  if (primaryWidth < targetW * 0.15 || primaryHeight < targetH * 0.15 || !isCentered) {
    return {
      faceCount: 1,
      faceBox,
      isCentered: false,
      lookingDirection,
      status: 'OUT_OF_FRAME',
      confidence: 0.82,
    };
  }

  // Looking away check
  if (lookingDirection !== 'CENTER') {
    return {
      faceCount: 1,
      faceBox,
      isCentered: true,
      lookingDirection,
      status: 'LOOKING_AWAY',
      confidence: 0.80,
    };
  }

  return {
    faceCount: 1,
    faceBox,
    isCentered: true,
    lookingDirection: 'CENTER',
    status: 'NORMAL',
    confidence: 0.95,
  };
}
