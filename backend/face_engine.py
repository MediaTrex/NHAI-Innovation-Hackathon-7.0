"""
Face engine adapted from https://github.com/vips725/NHAI_HACK
Uses InsightFace buffalo_s (enroll.py, login.py, load_model.py).
"""

from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path
from typing import Any

import cv2
import numpy as np

MODEL_NAME = "buffalo_s"
VERIFY_THRESHOLD = 0.5
SPOOF_MODEL_PATH = Path(__file__).parent / "models" / "antispoof.onnx"


@lru_cache(maxsize=1)
def get_face_app():
    from insightface.app import FaceAnalysis

    app = FaceAnalysis(name=MODEL_NAME)
    app.prepare(ctx_id=0)
    return app


@lru_cache(maxsize=1)
def get_spoof_session():
    if not SPOOF_MODEL_PATH.is_file():
        return None
    import onnxruntime as ort

    return ort.InferenceSession(str(SPOOF_MODEL_PATH))


def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    a = np.asarray(a, dtype=np.float32).flatten()
    b = np.asarray(b, dtype=np.float32).flatten()
    denom = float(np.linalg.norm(a) * np.linalg.norm(b))
    if denom == 0:
        return 0.0
    return float(np.dot(a, b) / denom)


def decode_image_bytes(data: bytes) -> np.ndarray:
    arr = np.frombuffer(data, dtype=np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Could not decode image")
    return img


def detect_faces(image_bgr: np.ndarray) -> dict[str, Any]:
    faces = get_face_app().get(image_bgr)
    if len(faces) == 0:
        return {"detected": False, "count": 0, "center_x": None}
    bbox = faces[0].bbox.astype(float)
    w = float(image_bgr.shape[1])
    center_x = round((bbox[0] + bbox[2]) / 2.0 / w, 4) if w else None
    return {"detected": True, "count": len(faces), "center_x": center_x}


def extract_embedding(image_bgr: np.ndarray) -> np.ndarray:
    faces = get_face_app().get(image_bgr)
    if len(faces) == 0:
        raise ValueError("No face detected")
    return faces[0].embedding.astype(np.float32)


def verify_against_reference(live_bgr: np.ndarray, reference: list[float]) -> dict[str, Any]:
    live_emb = extract_embedding(live_bgr)
    ref = np.asarray(reference, dtype=np.float32)
    score = cosine_similarity(live_emb, ref)
    return {
        "score": round(score, 4),
        "match": score > VERIFY_THRESHOLD,
        "threshold": VERIFY_THRESHOLD,
    }


def blink_liveness_from_frames(frames: list[np.ndarray]) -> dict[str, Any]:
    """
    Adapted from NHAI_HACK blink_test.py — intensity-based blink count across frames.
    """
    blink_count = 0
    eye_closed_frames = 0
    threshold = 25

    for frame in frames:
        faces = get_face_app().get(frame)
        if len(faces) == 0:
            continue
        x1, y1, x2, y2 = faces[0].bbox.astype(int)
        roi = frame[y1:y2, x1:x2]
        if roi.size == 0:
            continue
        gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
        avg = float(np.mean(gray))
        if avg < threshold:
            eye_closed_frames += 1
        else:
            if eye_closed_frames > 3:
                blink_count += 1
            eye_closed_frames = 0

    return {
        "blinks": blink_count,
        "passed": blink_count >= 1,
        "frames_analyzed": len(frames),
        "source": "blink_test.py",
    }


def check_spoof(image_bgr: np.ndarray) -> dict[str, Any]:
    session = get_spoof_session()
    if session is None:
        return {
            "available": False,
            "message": "Anti-spoof model not installed. Place antispoof.onnx in backend/models/",
        }

    faces = get_face_app().get(image_bgr)
    if len(faces) == 0:
        return {"available": True, "real": False, "message": "No face for spoof check"}

    bbox = faces[0].bbox.astype(int)
    x1, y1, x2, y2 = bbox
    face_img = image_bgr[y1:y2, x1:x2]
    if face_img.size == 0:
        return {"available": True, "real": False, "message": "Invalid face crop"}

    face_img = cv2.resize(face_img, (80, 80))
    face_img = face_img.astype(np.float32) / 255.0
    face_img = np.transpose(face_img, (2, 0, 1))
    face_img = np.expand_dims(face_img, axis=0)

    input_name = session.get_inputs()[0].name
    outputs = session.run(None, {input_name: face_img})
    scores = outputs[0][0]
    prob = np.exp(scores) / np.sum(np.exp(scores))
    pred = int(np.argmax(prob))
    real = pred == 1
    return {
        "available": True,
        "real": real,
        "probabilities": prob.tolist(),
        "prediction_class": pred,
    }
