#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PORT="${MACRO_PORT:-8137}"
LOG_FILE="${TMPDIR:-/tmp}/macro_verify_${PORT}.log"
BODY_FILE="${TMPDIR:-/tmp}/macro_verify_${PORT}.json"

rm -f "$LOG_FILE" "$BODY_FILE"

cleanup() {
  if [[ -n "${SERVER_PID:-}" ]] && kill -0 "$SERVER_PID" 2>/dev/null; then
    kill "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi
}

trap cleanup EXIT

MACRO_PORT="$PORT" python3 "$ROOT_DIR/server.py" >"$LOG_FILE" 2>&1 &
SERVER_PID=$!

for _ in {1..30}; do
  if curl -s "http://127.0.0.1:${PORT}/api/market-data" -o "$BODY_FILE"; then
    if [[ -s "$BODY_FILE" ]]; then
      break
    fi
  fi
  sleep 1
done

if [[ ! -s "$BODY_FILE" ]]; then
  echo "Failed to collect live market data from http://127.0.0.1:${PORT}/api/market-data" >&2
  echo "Server log:" >&2
  cat "$LOG_FILE" >&2
  exit 1
fi

python3 - <<'PY' "$BODY_FILE" "$PORT"
import json
import sys
from pathlib import Path

body_path = Path(sys.argv[1])
port = sys.argv[2]
obj = json.loads(body_path.read_text(encoding="utf-8"))

print(f"URL: http://127.0.0.1:{port}")
print(f"Source: {obj.get('source', {}).get('provider')} ({obj.get('source', {}).get('mode')})")
print(f"Date: {obj.get('date')}")
print(f"Market: {obj.get('signals', [{}])[0].get('value')}")
print("Freshness:")
for key, value in (obj.get("freshness") or {}).items():
    print(f"  - {key}: {value}")
print("Top line:")
print(f"  {obj.get('topLine')}")
PY
