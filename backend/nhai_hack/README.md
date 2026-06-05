# NHAI_HACK model mapping

Upstream: [vips725/NHAI_HACK](https://github.com/vips725/NHAI_HACK)

| Original script | SecureID API | App usage |
|-----------------|--------------|-----------|
| `enroll.py` | `POST /api/embed` | Enroll → Save offline |
| `login.py` | `POST /api/verify` | Authenticate Worker |
| `spoof_test.py` | `POST /api/spoof` | Anti-spoof after verify |
| `blink_test.py` | `POST /api/blink` | Liveness (2+ frames) |
| `load_model.py` / `app.py` | `buffalo_s` in `face_engine.py` | InsightFace |

Optional: copy `antispoof.onnx` from the NHAI_HACK repo into `backend/models/`.
