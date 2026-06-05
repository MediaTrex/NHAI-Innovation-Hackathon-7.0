# NHAI SecureID — Face API

Python backend wrapping the [NHAI_HACK](https://github.com/vips725/NHAI_HACK) InsightFace pipeline for the React Native app.

## Setup (Mac)

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

First run downloads the **buffalo_s** InsightFace model (~100MB).

### Optional anti-spoof

From `spoof_test.py`, place `antispoof.onnx` at:

```
backend/models/antispoof.onnx
```

## Run

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

- Health: http://localhost:8000/api/health
- Docs: http://localhost:8000/docs

## Phone connection

Use your Mac’s LAN IP (same Wi‑Fi as iPhone), e.g. `http://192.168.1.5:8000`.

Set in the app under **Settings → Face API URL**.

## Endpoints

| Endpoint | Purpose |
|----------|---------|
| `GET /api/health` | Backend status |
| `POST /api/embed` | Image → face embedding (enroll) |
| `POST /api/verify` | Live image + stored embedding → match score |
| `POST /api/spoof` | Anti-spoof check (if model present) |

Verify threshold: **0.5** (same as `login.py` in NHAI_HACK).
