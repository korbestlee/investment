#!/usr/bin/env python3
from __future__ import annotations

import concurrent.futures
import copy
import json
import os
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from zoneinfo import ZoneInfo
from urllib.error import HTTPError, URLError
from urllib.parse import urlparse

import requests
import yfinance as yf


ROOT = Path(__file__).resolve().parent
SAMPLE_PATH = ROOT / "data" / "market-data.sample.json"
HOST = os.environ.get("MACRO_HOST", "127.0.0.1")
PORT = int(os.environ.get("MACRO_PORT", "8000"))
SEOUL_TZ = ZoneInfo("Asia/Seoul")


def load_sample() -> dict:
    with SAMPLE_PATH.open("r", encoding="utf-8") as f:
        return json.load(f)


def format_pct(value: float | None) -> str:
    if value is None:
        return "N/A"
    sign = "+" if value >= 0 else ""
    return f"{sign}{value:.2f}%"


def compact_headline(title: str, summary: str = "") -> str:
    raw_title = " ".join((title or "").split()).strip()
    if not raw_title:
        return "Untitled headline"
    cleaned = raw_title
    for prefix in ("Dow Jones Futures", "Stock Market Today", "Market Watch", "Opinion", "Analysis", "Breaking"):
        if cleaned.lower().startswith(prefix.lower() + ":"):
            cleaned = cleaned[len(prefix) + 1 :].strip()
            break
    if cleaned.lower().startswith("why "):
        cleaned = cleaned[4:].strip()
    cleaned = cleaned.split("|", 1)[0].strip()
    cleaned = cleaned.split(" - ", 1)[0].strip()
    primary = cleaned.split(":", 1)[0].split("—", 1)[0].split("–", 1)[0].strip()
    if len(primary) <= 36:
        return primary
    words = primary.split()
    if len(words) > 1:
        text = ""
        for word in words:
            next_text = f"{text} {word}".strip()
            if len(next_text) > 36:
                break
            text = next_text
        if text:
            return text
    summary_text = " ".join((summary or "").split()).strip()
    if summary_text:
        return summary_text[:36].rstrip()
    return primary[:36].rstrip()


def build_yfinance_series(symbol: str) -> dict:
    ticker = yf.Ticker(symbol)
    history = ticker.history(period="5d", interval="1m", auto_adjust=False)
    if history is None or history.empty:
        raise RuntimeError(f"No yfinance history for {symbol}")

    closes = [float(value) for value in history["Close"].dropna().tolist() if value is not None]
    if not closes:
        raise RuntimeError(f"No close values for {symbol}")

    latest = closes[-1]
    previous = closes[-2] if len(closes) > 1 else None
    change_pct = None
    if latest is not None and previous not in (None, 0):
        change_pct = ((latest - previous) / previous) * 100

    market_time = history.index[-1]
    if hasattr(market_time, "to_pydatetime"):
        market_time = market_time.to_pydatetime()
    freshness = "intraday chart"
    if market_time:
        if not hasattr(market_time, "tzinfo") or market_time.tzinfo is None:
            market_time = market_time.replace(tzinfo=timezone.utc)
        freshness = market_time.astimezone(SEOUL_TZ).strftime("%Y-%m-%d %H:%M KST")

    return {
        "symbol": symbol,
        "latest": latest,
        "previous": previous,
        "change_pct": change_pct,
        "points": closes[-60:],
        "freshness": freshness,
        "meta": {
            "provider": "yfinance",
            "symbol": symbol,
        },
    }


def build_krx_series(index_code: str, fallback_symbol: str) -> dict:
    try:
        from pykrx import stock as krx_stock

        today = datetime.now(SEOUL_TZ).strftime("%Y%m%d")
        start = (datetime.now(SEOUL_TZ) - timedelta(days=90)).strftime("%Y%m%d")
        data = krx_stock.get_index_ohlcv_by_date(start, today, index_code)
        if data is None or getattr(data, "empty", True):
            raise RuntimeError(f"No KRX index data for {index_code}")

        close_series = data["종가"] if "종가" in data.columns else data.iloc[:, 3]
        closes = [float(value) for value in close_series.dropna().tolist() if value is not None]
        if not closes:
            raise RuntimeError(f"No KRX close values for {index_code}")

        latest = closes[-1]
        previous = closes[-2] if len(closes) > 1 else None
        change_pct = None
        if latest is not None and previous not in (None, 0):
            change_pct = ((latest - previous) / previous) * 100

        return {
            "symbol": fallback_symbol,
            "latest": latest,
            "previous": previous,
            "change_pct": change_pct,
            "points": closes[-60:],
            "freshness": datetime.now(SEOUL_TZ).strftime("%Y-%m-%d %H:%M KST"),
            "meta": {
                "provider": "pykrx",
                "index_code": index_code,
            },
        }
    except Exception:
        return build_yfinance_series(fallback_symbol)


def fetch_yahoo_news() -> list[dict]:
    symbols = ["^GSPC", "^IXIC", "CL=F", "GC=F", "^TNX", "USDKRW=X"]
    rss_url = "https://feeds.finance.yahoo.com/rss/2.0/headline"
    response = requests.get(
        rss_url,
        params={"s": ",".join(symbols), "region": "US", "lang": "en-US"},
        headers={"User-Agent": "Mozilla/5.0"},
        timeout=20,
    )
    response.raise_for_status()
    root = ET.fromstring(response.text)
    items: list[dict] = []
    for item in root.findall("./channel/item")[:8]:
        title = (item.findtext("title") or "").strip()
        summary = (item.findtext("description") or "").strip()
        link = (item.findtext("link") or "").strip()
        pub_date = (item.findtext("pubDate") or "").strip()
        text = f"{title} {summary}".lower()
        if any(keyword in text for keyword in ["fed", "rate", "yield", "bond", "treasury"]):
            impact = "채권, 금리"
            importance = "high"
        elif any(keyword in text for keyword in ["oil", "wti", "brent", "copper", "gold", "commodity"]):
            impact = "원자재, 인플레 기대"
            importance = "high"
        elif any(keyword in text for keyword in ["dollar", "fx", "krw", "yen", "yuan"]):
            impact = "환율, 신흥국 자산"
            importance = "high"
        elif any(keyword in text for keyword in ["stock", "index", "equity", "nasdaq", "sp500", "s&p"]):
            impact = "지수, 위험선호"
            importance = "mid"
        else:
            impact = "시장 전반"
            importance = "mid"
        items.append(
            {
                "title": compact_headline(title, summary),
                "summary": summary[:180] if summary else "Yahoo Finance RSS headline",
                "impact": impact,
                "importance": importance,
                "link": link,
                "published": pub_date,
            }
        )
    return items


def direction_from_change(change_pct: float | None) -> str:
    if change_pct is None:
        return "neutral"
    if change_pct > 0:
        return "up"
    if change_pct < 0:
        return "down"
    return "neutral"


def status_from_change(change_pct: float | None, positive_label: str, negative_label: str, neutral_label: str = "중립") -> str:
    if change_pct is None:
        return neutral_label
    if change_pct > 0:
        return positive_label
    if change_pct < 0:
        return negative_label
    return neutral_label


def action_catalog() -> list[dict]:
    return [
        {
            "state": "Neutral",
            "rule": "기존 포지션을 유지하고 신규 베팅은 확인 신호 이후로 미룹니다.",
            "detail": "금리, 달러, 주식 중 한 축이 먼저 이탈하는지 보면서 포지션 크기를 작게 유지합니다.",
        },
        {
            "state": "Risk-on",
            "rule": "지수와 성장주 노출을 점진적으로 늘리되 추격매수는 피합니다.",
            "detail": "금리 안정과 달러 완화가 같이 확인될 때만 위험자산 비중 확대 속도를 높입니다.",
        },
        {
            "state": "Risk-off",
            "rule": "주식 비중을 줄이고 단기채와 달러 자산을 우선 점검합니다.",
            "detail": "신규 추격매수보다 현금 비중과 방어적 노출이 우선입니다.",
        },
        {
            "state": "Inflation shock",
            "rule": "장기채 듀레이션을 줄이고 원자재 노출 확대 가능성을 검토합니다.",
            "detail": "유가와 금리의 동반 상승이 물가 기대 재상승으로 이어지는지 확인합니다.",
        },
        {
            "state": "Growth shock",
            "rule": "경기민감 자산을 축소하고 방어주와 안전자산 비중을 점검합니다.",
            "detail": "구리와 지수 약세가 동시에 이어지면 실적 민감 섹터 노출부터 줄입니다.",
        },
        {
            "state": "Policy shock",
            "rule": "이벤트 전후 포지션 크기를 줄이고 변동성 관리에 집중합니다.",
            "detail": "발언 직후 방향 추종보다 손절 기준과 익스포저 한도를 먼저 확인합니다.",
        },
    ]


def build_regime(results: dict) -> tuple[str, str, str, list[dict]]:
    spx_change = results["spx"]["change_pct"] or 0
    tnx_change = results["tnx"]["change_pct"] or 0
    dxy_change = results["dxy"]["change_pct"] or 0
    wti_change = results["wti"]["change_pct"] or 0
    copper_change = results["copper"]["change_pct"] or 0
    factors = [
        {
            "label": "S&P 500",
            "value": format_pct(spx_change),
            "signal": "risk",
            "note": "주식 방향으로 위험선호 강도를 확인합니다.",
        },
        {
            "label": "미 10년물",
            "value": format_pct(tnx_change),
            "signal": "rates",
            "note": "장기금리 변화가 밸류에이션 부담을 결정합니다.",
        },
        {
            "label": "DXY",
            "value": format_pct(dxy_change),
            "signal": "dollar",
            "note": "달러 강세는 신흥국과 위험자산에 역풍이 됩니다.",
        },
        {
            "label": "WTI",
            "value": format_pct(wti_change),
            "signal": "inflation",
            "note": "유가 상승은 인플레 재가열 경계로 이어집니다.",
        },
        {
            "label": "Copper",
            "value": format_pct(copper_change),
            "signal": "growth",
            "note": "산업금속 약세는 성장 둔화 우려를 반영합니다.",
        },
    ]

    if abs(tnx_change) >= 0.35 and abs(spx_change) >= 0.6:
        return (
            "Policy shock",
            "금리 변동성",
            "정책 이벤트 충격으로 금리와 주식이 동시에 크게 흔들리고 있습니다.",
            factors,
        )
    if wti_change >= 1.2 and tnx_change >= 0.15:
        return (
            "Inflation shock",
            "유가 + 금리",
            "유가와 금리의 동반 상승으로 인플레이션 재가열 경계가 높아졌습니다.",
            factors,
        )
    if spx_change <= -0.6 and copper_change <= -0.5 and tnx_change <= 0:
        return (
            "Growth shock",
            "성장 둔화",
            "주식과 산업금속 약세가 겹치며 성장 둔화 우려가 커지고 있습니다.",
            factors,
        )
    if spx_change <= -0.35 and (dxy_change >= 0.1 or tnx_change >= 0.1):
        return (
            "Risk-off",
            "달러 + 금리",
            "달러 강세와 주식 약세가 함께 보여 위험회피 흐름이 강화되고 있습니다.",
            factors,
        )
    if spx_change >= 0.35 and tnx_change <= 0.05 and dxy_change <= 0.05:
        return (
            "Risk-on",
            "주식 + 달러 완화",
            "주식이 견조하고 금리와 달러 부담이 완화되며 위험선호가 회복되고 있습니다.",
            factors,
        )
    return (
        "Neutral",
        "혼조 신호",
        "자산군 신호가 엇갈려 방향 확인이 더 필요한 중립 구간입니다.",
        factors,
    )


def build_actions(current_state: str, results: dict) -> tuple[dict, list[dict]]:
    actions = copy.deepcopy(action_catalog())
    for action in actions:
        action["isCurrent"] = action["state"] == current_state
    if (results["wti"]["change_pct"] or 0) > 1:
        for action in actions:
            if action["state"] == "Inflation shock":
                action["detail"] = "유가 급등이 기대 인플레이션과 장기금리 상방을 다시 자극하는지 확인합니다."
    if (results["spx"]["change_pct"] or 0) < 0:
        for action in actions:
            if action["state"] == "Risk-off":
                action["detail"] = "주식 비중 축소와 함께 달러, 단기채, 손절 기준 재확인이 우선입니다."
    current_action = next((action for action in actions if action["state"] == current_state), actions[0])
    return current_action, actions


def build_market_data() -> dict:
    sample = load_sample()
    try:
        with concurrent.futures.ThreadPoolExecutor(max_workers=12) as pool:
            futures = {
                "wti": pool.submit(build_yfinance_series, "CL=F"),
                "brent": pool.submit(build_yfinance_series, "BZ=F"),
                "gold": pool.submit(build_yfinance_series, "GC=F"),
                "copper": pool.submit(build_yfinance_series, "HG=F"),
                "irx": pool.submit(build_yfinance_series, "^IRX"),
                "fvx": pool.submit(build_yfinance_series, "^FVX"),
                "tnx": pool.submit(build_yfinance_series, "^TNX"),
                "tyx": pool.submit(build_yfinance_series, "^TYX"),
                "spx": pool.submit(build_yfinance_series, "^GSPC"),
                "ixic": pool.submit(build_yfinance_series, "^IXIC"),
                "ks11": pool.submit(build_krx_series, "1001", "^KS11"),
                "stoxx": pool.submit(build_yfinance_series, "^STOXX50E"),
                "usdjpy": pool.submit(build_yfinance_series, "USDJPY=X"),
                "usdkrw": pool.submit(build_yfinance_series, "USDKRW=X"),
                "usdcny": pool.submit(build_yfinance_series, "USDCNY=X"),
                "dxy": pool.submit(build_yfinance_series, "DX-Y.NYB"),
            }
            results = {name: future.result() for name, future in futures.items()}
    except Exception as exc:
        sample["source"] = {
            "provider": "Sample data",
            "mode": "fallback",
            "note": f"Live Yahoo data unavailable: {exc}",
        }
        sample["freshness"] = {key: "sample" for key in sample.get("freshness", {})}
        return sample

    news_items: list[dict] = []
    news_freshness = "unavailable"
    try:
        news_items = fetch_yahoo_news()[:4]
        if news_items:
            news_freshness = "live rss"
    except Exception:
        news_items = []

    commodity_items = [
        {
            "name": "WTI",
            "value": f"{results['wti']['latest']:.2f}" if results["wti"]["latest"] is not None else "N/A",
            "change": format_pct(results["wti"]["change_pct"]),
            "direction": direction_from_change(results["wti"]["change_pct"]),
        },
        {
            "name": "Brent",
            "value": f"{results['brent']['latest']:.2f}" if results["brent"]["latest"] is not None else "N/A",
            "change": format_pct(results["brent"]["change_pct"]),
            "direction": direction_from_change(results["brent"]["change_pct"]),
        },
        {
            "name": "Gold",
            "value": f"{results['gold']['latest']:.2f}" if results["gold"]["latest"] is not None else "N/A",
            "change": format_pct(results["gold"]["change_pct"]),
            "direction": direction_from_change(results["gold"]["change_pct"]),
        },
        {
            "name": "Copper",
            "value": f"{results['copper']['latest']:.2f}" if results["copper"]["latest"] is not None else "N/A",
            "change": format_pct(results["copper"]["change_pct"]),
            "direction": direction_from_change(results["copper"]["change_pct"]),
        },
    ]

    treasury_items = [
        {
            "name": "UST 13W",
            "value": f"{results['irx']['latest']:.3f}%" if results["irx"]["latest"] is not None else "N/A",
            "change": format_pct(results["irx"]["change_pct"]),
            "direction": direction_from_change(results["irx"]["change_pct"]),
        },
        {
            "name": "UST 5Y",
            "value": f"{results['fvx']['latest']:.3f}%" if results["fvx"]["latest"] is not None else "N/A",
            "change": format_pct(results["fvx"]["change_pct"]),
            "direction": direction_from_change(results["fvx"]["change_pct"]),
        },
        {
            "name": "UST 10Y",
            "value": f"{results['tnx']['latest']:.3f}%" if results["tnx"]["latest"] is not None else "N/A",
            "change": format_pct(results["tnx"]["change_pct"]),
            "direction": direction_from_change(results["tnx"]["change_pct"]),
        },
        {
            "name": "UST 30Y",
            "value": f"{results['tyx']['latest']:.3f}%" if results["tyx"]["latest"] is not None else "N/A",
            "change": format_pct(results["tyx"]["change_pct"]),
            "direction": direction_from_change(results["tyx"]["change_pct"]),
        },
    ]

    fx_items = [
        {
            "name": "DXY",
            "value": f"{results['dxy']['latest']:.2f}" if results["dxy"]["latest"] is not None else "N/A",
            "change": format_pct(results["dxy"]["change_pct"]),
            "direction": direction_from_change(results["dxy"]["change_pct"]),
        },
        {
            "name": "USDKRW",
            "value": f"{results['usdkrw']['latest']:.2f}" if results["usdkrw"]["latest"] is not None else "N/A",
            "change": format_pct(results["usdkrw"]["change_pct"]),
            "direction": direction_from_change(results["usdkrw"]["change_pct"]),
        },
        {
            "name": "USDJPY",
            "value": f"{results['usdjpy']['latest']:.2f}" if results["usdjpy"]["latest"] is not None else "N/A",
            "change": format_pct(results["usdjpy"]["change_pct"]),
            "direction": direction_from_change(results["usdjpy"]["change_pct"]),
        },
        {
            "name": "USDCNY",
            "value": f"{results['usdcny']['latest']:.4f}" if results["usdcny"]["latest"] is not None else "N/A",
            "change": format_pct(results["usdcny"]["change_pct"]),
            "direction": direction_from_change(results["usdcny"]["change_pct"]),
        },
    ]

    index_items = [
        {
            "name": "S&P 500",
            "value": f"{results['spx']['latest']:.2f}" if results["spx"]["latest"] is not None else "N/A",
            "change": format_pct(results["spx"]["change_pct"]),
            "direction": direction_from_change(results["spx"]["change_pct"]),
        },
        {
            "name": "Nasdaq",
            "value": f"{results['ixic']['latest']:.2f}" if results["ixic"]["latest"] is not None else "N/A",
            "change": format_pct(results["ixic"]["change_pct"]),
            "direction": direction_from_change(results["ixic"]["change_pct"]),
        },
        {
            "name": "KOSPI",
            "value": f"{results['ks11']['latest']:.2f}" if results["ks11"]["latest"] is not None else "N/A",
            "change": format_pct(results["ks11"]["change_pct"]),
            "direction": direction_from_change(results["ks11"]["change_pct"]),
        },
        {
            "name": "Euro Stoxx",
            "value": f"{results['stoxx']['latest']:.2f}" if results["stoxx"]["latest"] is not None else "N/A",
            "change": format_pct(results["stoxx"]["change_pct"]),
            "direction": direction_from_change(results["stoxx"]["change_pct"]),
        },
    ]

    issues = [
        {
            "title": f"미 10년물 금리 {format_pct(results['tnx']['change_pct'])}",
            "impact": "채권, 주식",
            "importance": "high",
            "summary": "장기금리 변화가 성장주 밸류에이션과 위험선호를 동시에 건드립니다.",
        },
        {
            "title": f"DXY {results['dxy']['latest']:.2f}" if results["dxy"]["latest"] is not None else "DXY N/A",
            "impact": "환율, 신흥국 자산",
            "importance": "high",
            "summary": "달러 강세가 원화와 아시아 통화에 압력을 줍니다.",
        },
        {
            "title": f"WTI {format_pct(results['wti']['change_pct'])}",
            "impact": "원자재, 인플레 기대",
            "importance": "mid",
            "summary": "유가 방향이 인플레이션 재가열 우려를 자극하는지 봅니다.",
        },
    ]

    if news_items:
        issues = [
            {
                "title": item["title"][:60],
                "impact": item["impact"],
                "importance": item["importance"],
                "summary": item["summary"],
                "link": item["link"],
            }
            for item in news_items
        ]

    commodity_status = status_from_change(results["wti"]["change_pct"], "강세", "약세")
    bond_status = status_from_change(results["tnx"]["change_pct"], "압박", "완화")
    index_status = status_from_change(results["spx"]["change_pct"], "강세", "약세")
    fx_status = "강세" if (results["dxy"]["change_pct"] or 0) > 0 else "완화" if (results["dxy"]["change_pct"] or 0) < 0 else "중립"

    asset_groups = [
        {
            "id": "commodities",
            "label": "원자재",
            "title": "원자재",
            "summary": "Yahoo intraday chart 데이터로 원자재 변화를 읽습니다.",
            "items": commodity_items,
            "trend": results["wti"]["points"][-11:] or sample["assetGroups"][0]["trend"],
            "conclusion": "에너지와 산업금속의 방향이 인플레이션과 성장 신호를 보여줍니다.",
            "status": commodity_status,
            "freshness": results["wti"].get("freshness", "intraday"),
        },
        {
            "id": "bonds",
            "label": "채권",
            "title": "채권",
            "summary": "미국 국채 수익률과 커브 변화를 확인합니다.",
            "items": treasury_items,
            "trend": results["tnx"]["points"][-11:] or sample["assetGroups"][1]["trend"],
            "conclusion": "금리 상승과 커브 변화는 성장주와 달러를 동시에 흔듭니다.",
            "status": bond_status,
            "freshness": results["tnx"].get("freshness", "intraday"),
        },
        {
            "id": "indices",
            "label": "지수",
            "title": "지수",
            "summary": "실시간 지수 차트로 글로벌 주가지수의 방향성을 관찰합니다.",
            "items": index_items,
            "trend": results["spx"]["points"][-11:] or sample["assetGroups"][2]["trend"],
            "conclusion": "위험선호와 방어 회전의 강도를 확인합니다.",
            "status": index_status,
            "freshness": results["spx"].get("freshness", "intraday"),
        },
        {
            "id": "fx",
            "label": "환율",
            "title": "환율",
            "summary": "intraday chart 기반으로 달러 강세와 주요 통화 변화를 추적합니다.",
            "items": fx_items,
            "trend": results["usdkrw"]["points"][-11:] or sample["assetGroups"][3]["trend"],
            "conclusion": "달러 강세가 지속되면 원화와 엔화 약세 압력이 커집니다.",
            "status": fx_status,
            "freshness": results["usdkrw"].get("freshness", "intraday"),
        },
    ]

    market_state, driver_label, top_line, regime_factors = build_regime(results)
    current_action, actions = build_actions(market_state, results)

    return {
        "date": datetime.now(SEOUL_TZ).strftime("%Y-%m-%d"),
        "collectedAt": datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        "source": {
            "provider": "pykrx + yfinance",
            "mode": "live",
            "note": "국내 지수는 pykrx, 해외 자산은 yfinance를 사용합니다.",
        },
        "freshness": {
            "fx": "intraday chart",
            "indices": "intraday chart",
            "commodities": "intraday chart",
            "bonds": "intraday chart",
            "news": news_freshness,
        },
        "signals": [
            {
                "label": "시장 상태",
                "value": market_state,
                "sub": "자산군 신호를 합쳐 레짐을 계산했습니다.",
            },
            {
                "label": "신뢰도",
                "value": "높음",
                "sub": "실시간 차트 스냅샷 기반",
            },
            {
                "label": "핵심 드라이버",
                "value": driver_label,
                "sub": "금리, 달러, 주식, 원자재를 함께 반영했습니다.",
            },
        ],
        "topLine": top_line,
        "regimeFactors": regime_factors,
        "issues": issues,
        "newsItems": news_items,
        "criteria": sample["criteria"],
        "assetGroups": asset_groups,
        "currentAction": current_action,
        "actions": actions,
    }


class Handler(SimpleHTTPRequestHandler):
    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path == "/api/market-data":
            try:
                payload = build_market_data()
                body = json.dumps(payload, ensure_ascii=False, indent=2).encode("utf-8")
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)
            except (HTTPError, URLError, RuntimeError, ValueError) as exc:
                body = json.dumps({"error": str(exc)}, ensure_ascii=False).encode("utf-8")
                self.send_response(502)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)
            return
        return super().do_GET()


def main() -> None:
    os.chdir(ROOT)
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    print(f"Serving on http://{HOST}:{PORT}")
    print("API route: /api/market-data")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
