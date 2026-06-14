#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PORT="${MACRO_PORT:-8000}"

MACRO_PORT="$PORT" python3 "$ROOT_DIR/server.py"
