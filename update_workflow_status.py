#!/usr/bin/env python3
from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parent
STATUS_OUTPUT = ROOT / "data" / "workflow-status.json"
SNAPSHOT_PATH = ROOT / "data" / "live-market-data.json"


def load_snapshot_collected_at() -> str:
    if not SNAPSHOT_PATH.exists():
        return ""
    with SNAPSHOT_PATH.open("r", encoding="utf-8") as file:
        payload = json.load(file)
    return str(payload.get("collectedAt") or "")


def main() -> None:
    outcome = (os.environ.get("REFRESH_OUTCOME") or "unknown").strip().lower()
    if outcome not in {"success", "failure", "cancelled"}:
        outcome = "unknown"
    now = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    if outcome == "success":
        message = "Snapshot refresh succeeded."
    elif outcome == "failure":
        message = "Snapshot refresh failed."
    elif outcome == "cancelled":
        message = "Snapshot refresh cancelled."
    else:
        message = "Snapshot refresh status unavailable."
    status_payload = {
        "workflow": "refresh-live-snapshot",
        "status": outcome,
        "message": message,
        "updatedAt": now,
        "runId": os.environ.get("GITHUB_RUN_ID", ""),
        "runNumber": os.environ.get("GITHUB_RUN_NUMBER", ""),
        "runAttempt": os.environ.get("GITHUB_RUN_ATTEMPT", ""),
        "branch": os.environ.get("GITHUB_REF_NAME", ""),
        "commitSha": os.environ.get("GITHUB_SHA", ""),
        "snapshotCollectedAt": load_snapshot_collected_at(),
        "schedule": [
            {"label": "한국장 중간", "timezone": "Asia/Seoul", "time": "12:00", "days": "1-5"},
            {"label": "한국장 종료 후", "timezone": "Asia/Seoul", "time": "15:40", "days": "1-5"},
            {"label": "미국장 종료 후", "timezone": "America/New_York", "time": "16:10", "days": "1-5"},
        ],
    }
    STATUS_OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with STATUS_OUTPUT.open("w", encoding="utf-8") as file:
        json.dump(status_payload, file, ensure_ascii=False, indent=2)
        file.write("\n")
    print(f"Wrote {STATUS_OUTPUT}")


if __name__ == "__main__":
    main()
