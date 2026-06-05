"""
NHAI SecureID — Face API (wraps vips725/NHAI_HACK InsightFace pipeline).
Run: uvicorn main:app --host 0.0.0.0 --port 8000

"""

from __future__ import annotations

import json
from typing import Any

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from face_engine import (
    VERIFY_THRESHOLD,
    check_spoof,
    decode_image_bytes,
    detect_faces,
    extract_embedding,
    verify_against_reference,
)

app = FastAPI(
    title="NHAI SecureID Face API",
    description="InsightFace embeddings + verify (from NHAI_HACK)",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health() -> dict[str, Any]:
    from face_engine import SPOOF_MODEL_PATH

    return {
        "status": "ok",
        "model": "insightface/buffalo_s",
        "verify_threshold": VERIFY_THRESHOLD,
        "anti_spoof": SPOOF_MODEL_PATH.is_file(),
        "source": "https://github.com/vips725/NHAI_HACK",
    }


@app.post("/api/detect")
async def detect_face(image: UploadFile = File(...)) -> dict[str, Any]:
    data = await image.read()
    try:
        bgr = decode_image_bytes(data)
        return detect_faces(bgr)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Model error: {e}") from e


@app.post("/api/embed")
async def embed_face(image: UploadFile = File(...)) -> dict[str, Any]:
    data = await image.read()
    try:
        bgr = decode_image_bytes(data)
        embedding = extract_embedding(bgr)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Model error: {e}") from e

    return {
        "embedding": embedding.tolist(),
        "dimensions": int(embedding.shape[0]),
    }


@app.post("/api/verify")
async def verify_face(
    image: UploadFile = File(...),
    reference_embedding: str = Form(...),
) -> dict[str, Any]:
    try:
        ref = json.loads(reference_embedding)
        if not isinstance(ref, list) or len(ref) < 8:
            raise ValueError("reference_embedding must be a JSON array")
    except (json.JSONDecodeError, ValueError) as e:
        raise HTTPException(status_code=400, detail=str(e)) from e

    data = await image.read()
    try:
        bgr = decode_image_bytes(data)
        result = verify_against_reference(bgr, ref)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Model error: {e}") from e

    return result


@app.post("/api/spoof")
async def spoof_check(image: UploadFile = File(...)) -> dict[str, Any]:
    data = await image.read()
    try:
        bgr = decode_image_bytes(data)
        return check_spoof(bgr)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e
