# Global Macro Daily Briefing

국제금융시장 이슈, 뉴스 헤드라인, 오늘의 일정, 자산군 분석, 당일 대응을 한 화면에서 보는 단일 페이지 웹앱입니다.

## What it does

- 오늘의 핵심 이슈를 리스트업합니다.
- 최신 뉴스 헤드라인을 보여줍니다.
- 오늘의 집중 시간대를 캘린더처럼 보여줍니다.
- 원자재, 채권, 지수, 환율을 같은 기준으로 해석합니다.
- 상태별 대응방법을 보여줍니다.
- 자산군 신호를 합쳐 시장 레짐과 대응 우선순위를 자동 계산합니다.

## Run

샘플 데이터만 보려면 정적 서버로 열 수 있습니다.

```bash
python3 -m http.server 8000
```

실시간 데이터와 확인 패널까지 보려면 live 서버를 실행합니다.

```bash
python3 server.py
```

GitHub Pages에서는 `main` 브랜치의 `data/live-market-data.json`을 원격으로 읽습니다.
로컬 live 서버를 먼저 실행한 뒤 스냅샷 파일을 갱신하고 푸시하면 Pages에서도 같은 형식으로 표시됩니다.
GitHub Actions는 한국시간 기준 03:17, 09:17, 15:17, 21:17에 스냅샷을 갱신합니다. 휴장 중인 자산은 최근 거래 시각을 유지합니다.

터미널에서 live 상태를 한 번에 확인하려면:

```bash
./verify_live.sh
```

실행만 하려면:

```bash
./run_live.sh
```

## Screen flow

1. 상단에서 시장 상태와 오늘의 한 줄 결론을 봅니다.
2. 뉴스 브리핑에서 최신 헤드라인을 확인합니다.
3. 오늘의 일정에서 집중할 시간대를 확인합니다.
4. 자산군 분석에서 원자재, 채권, 지수, 환율을 비교합니다.
5. 판정 엔진에서 레짐과 대응 우선순위를 확인합니다.
6. Verify Live 패널로 live/fallback 여부와 freshness를 확인합니다.

## Structure

- `index.html`: 화면 구조
- `styles.css`: 전체 스타일
- `app.js`: 데이터 수집, 분석, 렌더링 로직
- `server.py`: Yahoo Finance live API 및 데이터 조립 서버
- `data/market-data.sample.json`: fallback 샘플 데이터
- `data/live-market-data.json`: GitHub Pages용 live snapshot
- `update_live_snapshot.py`: live snapshot 생성 스크립트
- `.github/workflows/refresh-live-snapshot.yml`: daily snapshot refresh workflow
- `verify_live.sh`: live 소스, 날짜, freshness 확인 스크립트
- `run_live.sh`: live 서버 실행 스크립트

## Data flow

1. 로컬에서는 `server.py`의 `/api/market-data`를 먼저 읽습니다.
2. GitHub Pages에서는 `main` 브랜치의 `data/live-market-data.json`을 먼저 읽습니다.
3. live 경로가 없거나 실패하면 `data/market-data.sample.json`으로 fallback합니다.
4. `server.py`는 Yahoo Finance chart 응답과 뉴스 RSS를 조합합니다.
5. `Verify Live` 버튼과 `./verify_live.sh`로 최신성 상태를 확인할 수 있습니다.
6. 판정 엔진은 `assetGroups` 상태를 기준으로 레짐을 계산합니다.
7. freshness 카드와 verify 패널이 최신성 상태를 보여줍니다.
8. 스냅샷 경과 시간이 오래되면 상단에 경고가 표시됩니다.
9. 뉴스 헤드라인과 오늘의 일정은 브리핑 결론을 보조합니다.

## Notes

- 외부 네트워크가 막힌 환경에서는 뉴스 RSS가 비어 있을 수 있습니다.
- 그 경우에도 가격, 지수, 환율 live 수집이 가능한 한 화면은 계속 동작합니다.
- `file://`보다 로컬 서버로 여는 쪽이 안정적입니다.
