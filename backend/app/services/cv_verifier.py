import cv2
import numpy as np
import base64
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Tuple, List, Dict, Any, Optional
from app.config import settings

# Load OpenCV's built-in Haar Cascades for frontal face, profile face, and eye detection
FRONTAL_CASCADE_PATH = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
PROFILE_CASCADE_PATH = cv2.data.haarcascades + "haarcascade_profileface.xml"
EYE_CASCADE_PATH = cv2.data.haarcascades + "haarcascade_eye.xml"

frontal_cascade = cv2.CascadeClassifier(FRONTAL_CASCADE_PATH)
profile_cascade = cv2.CascadeClassifier(PROFILE_CASCADE_PATH)
eye_cascade = cv2.CascadeClassifier(EYE_CASCADE_PATH)

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

def detect_faces_in_image(image: np.ndarray) -> Tuple[int, List[Dict[str, int]], str, str, bool]:
    """
    Detects frontal and profile faces in the given OpenCV BGR image.
    Returns: (face_count, bounding_boxes, status, looking_direction, is_centered)
    """
    img_h, img_w = image.shape[:2]
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    gray = cv2.equalizeHist(gray)
    
    # 1. Detect frontal faces
    frontal_faces = frontal_cascade.detectMultiScale(
        gray,
        scaleFactor=1.1,
        minNeighbors=4,
        minSize=(32, 32)
    )
    
    bounding_boxes = []
    status = "OK"
    looking_direction = "CENTER"
    is_centered = True
    
    if len(frontal_faces) >= 2:
        for (x, y, w, h) in frontal_faces:
            bounding_boxes.append({"x": int(x), "y": int(y), "width": int(w), "height": int(h)})
        return len(frontal_faces), bounding_boxes, "MULTIPLE_FACES", "CENTER", False
        
    elif len(frontal_faces) == 1:
        x, y, w, h = frontal_faces[0]
        bounding_boxes.append({"x": int(x), "y": int(y), "width": int(w), "height": int(h)})
        
        # Check centering (normalized bounding box centroid)
        cx = (x + w / 2.0) / img_w
        cy = (y + h / 2.0) / img_h
        is_centered = bool(0.18 <= cx <= 0.82 and 0.12 <= cy <= 0.88)
        
        if not is_centered:
            status = "OUT_OF_FRAME"
            looking_direction = "RIGHT" if cx < 0.18 else "LEFT" if cx > 0.82 else "CENTER"
        else:
            status = "OK"
            looking_direction = "CENTER"
            
        return 1, bounding_boxes, status, looking_direction, is_centered
        
    # 2. If no frontal face detected, check for profile face (head turned left or right)
    profiles_right = profile_cascade.detectMultiScale(
        gray,
        scaleFactor=1.1,
        minNeighbors=4,
        minSize=(32, 32)
    )
    
    if len(profiles_right) >= 1:
        for (x, y, w, h) in profiles_right:
            bounding_boxes.append({"x": int(x), "y": int(y), "width": int(w), "height": int(h)})
        return len(profiles_right), bounding_boxes, "LOOKING_AWAY", "RIGHT", False
        
    # Check left profile by flipping horizontally
    gray_flipped = cv2.flip(gray, 1)
    profiles_left = profile_cascade.detectMultiScale(
        gray_flipped,
        scaleFactor=1.1,
        minNeighbors=4,
        minSize=(32, 32)
    )
    
    if len(profiles_left) >= 1:
        for (fx, fy, fw, fh) in profiles_left:
            # Revert flipped coordinates
            orig_x = img_w - fx - fw
            bounding_boxes.append({"x": int(orig_x), "y": int(fy), "width": int(fw), "height": int(fh)})
        return len(profiles_left), bounding_boxes, "LOOKING_AWAY", "LEFT", False
        
    # No face or profile detected
    return 0, [], "NO_FACE", "CENTER", False

def verify_frame_base64(image_base64: str) -> Dict[str, Any]:
    """Inspects a frame uploaded as base64 and returns verification outcome."""
    try:
        image = decode_base64_image(image_base64)
        face_count, boxes, status, looking_direction, is_centered = detect_faces_in_image(image)
        
        if status == "OK":
            message = "Single candidate face verified and centered."
            confidence = 0.98
        elif status == "NO_FACE":
            message = "No face detected in camera viewport."
            confidence = 0.95
        elif status == "LOOKING_AWAY":
            message = f"Candidate turned head / looking {looking_direction.lower()}."
            confidence = 0.90
        elif status == "OUT_OF_FRAME":
            message = "Candidate face partially out of camera frame."
            confidence = 0.92
        elif status == "MULTIPLE_FACES":
            message = f"Multiple individuals detected ({face_count} faces found)."
            confidence = 0.95
        else:
            message = f"Status: {status}"
            confidence = 0.85
            
        return {
            "face_count": face_count,
            "status": status,
            "confidence": confidence,
            "message": message,
            "is_centered": is_centered,
            "looking_direction": looking_direction,
            "bounding_boxes": boxes
        }
    except Exception as e:
        return {
            "face_count": 0,
            "status": "ERROR",
            "confidence": 0.0,
            "message": f"Frame verification failed: {str(e)}",
            "is_centered": False,
            "looking_direction": "CENTER",
            "bounding_boxes": []
        }

def save_evidence_snapshot(
    image_base64: str,
    attempt_id: int,
    event_type: str,
    severity: str,
    event_time: Optional[datetime] = None
) -> str:
    """
    Decodes an evidence frame, draws forensic bounding box annotations and an accurate timestamp watermark,
    returns a high-reliability watermarked base64 Data URI stored directly in MongoDB Atlas,
    and also writes to disk if available.
    """
    try:
        image = decode_base64_image(image_base64)
        face_count, boxes, _, _, _ = detect_faces_in_image(image)
        
        # Color coding for bounding boxes based on event/severity
        # BGR format: Red for multiple/high, Orange for warning, Green for single
        box_color = (0, 0, 255) if severity in ["HIGH", "CRITICAL"] else (0, 165, 255)
        for box in boxes:
            x, y, w, h = box["x"], box["y"], box["width"], box["height"]
            cv2.rectangle(image, (x, y), (x + w, y + h), box_color, 2)
            cv2.putText(
                image,
                f"Face #{face_count}",
                (x, max(18, y - 6)),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.45,
                box_color,
                1,
                cv2.LINE_AA
            )
        
        # Timestamp resolution
        ts = event_time if event_time else datetime.now(timezone.utc)
        if ts.tzinfo is None:
            ts = ts.replace(tzinfo=timezone.utc)
        timestamp_str = ts.astimezone(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
        
        # Forensic top banner
        img_h, img_w = image.shape[:2]
        banner_h = 30
        cv2.rectangle(image, (0, 0), (img_w, banner_h), (18, 20, 26), -1)
        
        # Recording indicator circle
        cv2.circle(image, (14, int(banner_h / 2)), 4, (0, 0, 255), -1)
        
        banner_text = f"EXAM PROCTOR AUDIT | {event_type} | {severity} | {timestamp_str}"
        cv2.putText(
            image,
            banner_text,
            (26, 20),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.40,
            (255, 255, 255),
            1,
            cv2.LINE_AA
        )
        
        # Save to disk if writable
        try:
            filename = f"attempt_{attempt_id}_{event_type.lower()}_{int(ts.timestamp())}.jpg"
            file_path = settings.EVIDENCE_DIR / filename
            cv2.imwrite(str(file_path), image)
        except Exception:
            pass

        # Return self-contained watermarked Data URI for permanent Atlas storage
        success, buffer = cv2.imencode('.jpg', image, [cv2.IMWRITE_JPEG_QUALITY, 80])
        if success:
            b64_str = base64.b64encode(buffer).decode('utf-8')
            return f"data:image/jpeg;base64,{b64_str}"
            
        return ""
    except Exception as e:
        print(f"Error saving evidence snapshot: {e}")
        return ""


