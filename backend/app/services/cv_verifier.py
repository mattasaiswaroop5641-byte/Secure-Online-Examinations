import cv2
import numpy as np
import base64
import os
from datetime import datetime
from pathlib import Path
from typing import Tuple, List, Dict, Any
from app.config import settings

# Load OpenCV's built-in Haar Cascade for frontal face detection
CASCADE_PATH = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
face_cascade = cv2.CascadeClassifier(CASCADE_PATH)

def decode_base64_image(image_base64: str) -> np.ndarray:
    """Decodes a base64 encoded image string (with or without data URI prefix) into an OpenCV BGR image."""
    if "," in image_base64:
        image_base64 = image_base64.split(",", 1)[1]
    image_bytes = base64.b64decode(image_base64)
    np_arr = np.frombuffer(image_bytes, np.uint8)
    image = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError("Failed to decode image from base64 string")
    return image

def detect_faces_in_image(image: np.ndarray) -> Tuple[int, List[Dict[str, int]]]:
    """Detects frontal faces in the given OpenCV BGR image."""
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    # Equalize histogram for improved contrast in varied lighting
    gray = cv2.equalizeHist(gray)
    
    faces = face_cascade.detectMultiScale(
        gray,
        scaleFactor=1.1,
        minNeighbors=5,
        minSize=(40, 40)
    )
    
    bounding_boxes = []
    for (x, y, w, h) in faces:
        bounding_boxes.append({
            "x": int(x),
            "y": int(y),
            "width": int(w),
            "height": int(h)
        })
    
    return len(faces), bounding_boxes

def verify_frame_base64(image_base64: str) -> Dict[str, Any]:
    """Inspects a frame uploaded as base64 and returns verification outcome."""
    try:
        image = decode_base64_image(image_base64)
        face_count, boxes = detect_faces_in_image(image)
        
        if face_count == 1:
            status = "OK"
            message = "Single face verified."
            confidence = 0.95
        elif face_count == 0:
            status = "NO_FACE"
            message = "No face detected in camera view."
            confidence = 0.90
        else:
            status = "MULTIPLE_FACES"
            message = f"Multiple faces detected ({face_count} faces found)."
            confidence = 0.85
            
        return {
            "face_count": face_count,
            "status": status,
            "confidence": confidence,
            "message": message,
            "bounding_boxes": boxes
        }
    except Exception as e:
        return {
            "face_count": 0,
            "status": "ERROR",
            "confidence": 0.0,
            "message": f"Frame verification failed: {str(e)}",
            "bounding_boxes": []
        }

def save_evidence_snapshot(
    image_base64: str,
    attempt_id: int,
    event_type: str,
    severity: str
) -> str:
    """
    Decodes an evidence frame, draws forensic bounding box annotations and a timestamp watermark,
    returns a high-reliability watermarked base64 Data URI stored directly in MongoDB Atlas,
    and also writes to disk if available.
    """
    try:
        image = decode_base64_image(image_base64)
        face_count, boxes = detect_faces_in_image(image)
        
        # Color coding for bounding boxes based on event/severity
        # BGR format: Red for multiple/high, Orange for warning, Green for single
        box_color = (0, 0, 255) if severity in ["HIGH", "CRITICAL"] else (0, 165, 255)
        for box in boxes:
            x, y, w, h = box["x"], box["y"], box["width"], box["height"]
            cv2.rectangle(image, (x, y), (x + w, y + h), box_color, 2)
        
        # Timestamp and watermark banner
        timestamp_str = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")
        banner_text = f"[ExamShield Forensic] {event_type} | {severity} | {timestamp_str}"
        
        # Draw background bar for text
        cv2.rectangle(image, (0, 0), (image.shape[1], 28), (20, 20, 20), -1)
        cv2.putText(
            image,
            banner_text,
            (10, 18),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.45,
            (255, 255, 255),
            1,
            cv2.LINE_AA
        )
        
        # Save to disk if writable
        try:
            filename = f"attempt_{attempt_id}_{event_type.lower()}_{int(datetime.utcnow().timestamp())}.jpg"
            file_path = settings.EVIDENCE_DIR / filename
            cv2.imwrite(str(file_path), image)
        except Exception:
            pass

        # Return self-contained watermarked Data URI for permanent Atlas storage
        success, buffer = cv2.imencode('.jpg', image, [cv2.IMWRITE_JPEG_QUALITY, 75])
        if success:
            b64_str = base64.b64encode(buffer).decode('utf-8')
            return f"data:image/jpeg;base64,{b64_str}"
            
        return ""
    except Exception as e:
        print(f"Error saving evidence snapshot: {e}")
        return ""

