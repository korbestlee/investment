#!/usr/bin/env python3
from __future__ import annotations

import json
from pathlib import Path

import server


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "data" / "live-market-data.json"


def main() -> None:
    data = server.build_market_data()
    data["source"] = {
        "provider": data.get("source", {}).get("provider", "pykrx + yfinance"),
        "mode": "live snapshot",
        "note": "Generated from live pykrx/yfinance data for GitHub Pages.",
    }
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with OUTPUT.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print(f"Wrote {OUTPUT}")


if __name__ == "__main__":
    main()
