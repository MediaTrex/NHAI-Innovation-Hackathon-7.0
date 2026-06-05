#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/backend"

if [[ ! -d .venv ]]; then
  python3 -m venv .venv
  source .venv/bin/activate
  pip install -r requirements.txt
else
  source .venv/bin/activate
fi

echo "NHAI_HACK Face API → http://0.0.0.0:8000"
echo "Set this URL in the app: Settings → Face API URL"
exec uvicorn main:app --host 0.0.0.0 --port 8000 --reload
