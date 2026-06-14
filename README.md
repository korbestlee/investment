# Global Macro Daily Briefing

국제금융시장 이슈, 자산별 신호, 당일 대응을 한 화면에서 보는 단일 페이지 웹앱 프로토타입입니다.

## What it does

- 오늘의 핵심 이슈를 리스트업합니다.
- 최신 뉴스 헤드라인을 보여줍니다.
- 원자재, 채권, 지수, 환율을 같은 기준으로 해석합니다.
- 상태별 대응방법을 보여줍니다.
- 나중에 실데이터 API로 교체할 수 있도록 데이터 모델을 분리했습니다.
- 자산군 신호를 합쳐 시장 레짐과 대응 우선순위를 자동 계산합니다.

## Run

샘플 데이터로만 볼 때는 정적 서버로 열 수 있습니다.

```bash
open index.html
```

```bash
python3 -m http.server 8000
```

실데이터 API를 붙여서 보려면 로컬 프록시 서버를 실행합니다.

```bash
python3 server.py
```

확인용 원샷 검증:

```bash
./verify_live.sh
```

실행만 하려면:

```bash
./run_live.sh
```

`fetch`를 쓰기 때문에 `file://`보다 로컬 서버가 더 안정적입니다.
실데이터 모드에서는 `/api/market-data`가 Yahoo Finance intraday chart 기반 시장 요약을 반환합니다.

## GitHub Pages

이 앱은 GitHub Pages 같은 정적 호스팅에서도 동작합니다.

- 정적 호스팅에서는 `/api/market-data`를 사용하지 않고 `data/market-data.sample.json`을 읽습니다.
- Pages에서는 `Refresh`와 `Verify Live`가 샘플 데이터를 다시 로드하는 동작으로 유지됩니다.
- live 데이터를 쓰려면 별도 서버에 `server.py`를 배포한 뒤 프론트엔드의 API 경로를 연결해야 합니다.

## Structure

- `index.html`: 화면 구조
- `styles.css`: 전체 스타일
- `app.js`: 샘플 데이터, 상태 계산, 렌더링 로직
- `data/market-data.sample.json`: 로딩 가능한 샘플 데이터
- `server.py`: Yahoo Finance intraday live API 및 데이터 조립 서버
- `verify_live.sh`: live 소스, 날짜, freshness를 터미널에서 확인하는 검증 스크립트
- `run_live.sh`: live 서버를 바로 실행하는 스크립트

## Data flow

1. `app.js`가 `/api/market-data`를 먼저 읽습니다.
2. `server.py`가 Yahoo Finance intraday chart 기반 live 응답을 반환합니다.
3. live 응답이 실패하면 `./data/market-data.sample.json`으로 fallback합니다.
4. `Refresh` 버튼으로 재로딩할 수 있습니다.
5. `Verify Live` 버튼과 `./verify_live.sh`로 live/fallback 상태를 확인할 수 있습니다.
6. 판정 엔진은 `assetGroups`의 상태값을 기준으로 레짐과 대응을 자동 산출합니다.
7. freshness 카드와 verify 패널이 최신성 상태를 보여줍니다.
8. 뉴스 브리핑은 Yahoo Finance RSS 헤드라인을 보여줍니다.

## API choice

Chosen provider: `Yahoo Finance`

Reason:
- Yahoo Finance chart endpoints exposed intraday snapshots for FX, commodities, yields, and major indices during testing.
- The app now uses a no-key live route and falls back to sample data only if those requests fail.
- The live route surfaces freshness timestamps so you can see when the last quote snapshot was captured.
