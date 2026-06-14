const IS_FILE_PROTOCOL = window.location.protocol === 'file:';
const ALL_ORIGINS_GET = 'https://api.allorigins.win/get';

const state = {
  activeAssetGroupId: null,
  data: null,
  refreshing: false,
};

const $ = (id) => document.getElementById(id);

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatDateLabel(dateValue) {
  if (!dateValue) return '';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return String(dateValue);
  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'full',
    timeStyle: 'short',
  }).format(date);
}

function emptyMarketData() {
  return {
    date: '',
    collectedAt: '',
    source: {
      provider: 'Yahoo Finance',
      mode: 'live via chart + quote through CORS proxy',
      note: 'Fetched through allorigins from browser',
    },
    freshness: {
      fx: 'N/A',
      indices: 'N/A',
      commodities: 'N/A',
      bonds: 'N/A',
      news: 'N/A',
    },
    signals: [
      { label: '시장 상태', value: 'N/A', sub: '라이브 데이터를 불러오는 중' },
      { label: '신뢰도', value: 'N/A', sub: '라이브 데이터를 불러오는 중' },
      { label: '핵심 드라이버', value: 'N/A', sub: '라이브 데이터를 불러오는 중' },
    ],
    topLine: '라이브 데이터를 불러오는 중입니다.',
    issues: [],
    newsItems: [],
    criteria: [
      {
        title: '변화의 크기',
        description: '전일 대비, 1주 대비, 1개월 대비로 의미 있는 움직임인지 확인합니다.',
      },
      {
        title: '방향의 일관성',
        description: '금리, 달러, 주식, 원자재가 같은 레짐을 가리키는지 확인합니다.',
      },
      {
        title: '이벤트 충격',
        description: '지표 서프라이즈, 중앙은행 발언, 지정학 이벤트의 즉시 반응을 봅니다.',
      },
      {
        title: '상호작용',
        description: '유가와 인플레 기대, 금리와 성장주, 달러와 신흥국 통화의 연결을 봅니다.',
      },
    ],
    assetGroups: [
      {
        id: 'commodities',
        label: '원자재',
        title: '원자재',
        summary: '에너지와 산업금속이 인플레 기대와 경기 민감도를 동시에 보여줍니다.',
        items: [
          { name: 'WTI', value: 'N/A', change: 'N/A', direction: 'neutral' },
          { name: 'Brent', value: 'N/A', change: 'N/A', direction: 'neutral' },
          { name: 'Gold', value: 'N/A', change: 'N/A', direction: 'neutral' },
          { name: 'Copper', value: 'N/A', change: 'N/A', direction: 'neutral' },
        ],
        trend: [],
        conclusion: '라이브 데이터를 불러오면 원자재와 성장 신호를 함께 보여줍니다.',
        status: 'N/A',
        freshness: 'N/A',
      },
      {
        id: 'bonds',
        label: '채권',
        title: '채권',
        summary: '금리 방향과 커브 변화는 주식과 환율의 가장 빠른 선행 신호입니다.',
        items: [
          { name: 'UST 13W', value: 'N/A', change: 'N/A', direction: 'neutral' },
          { name: 'UST 5Y', value: 'N/A', change: 'N/A', direction: 'neutral' },
          { name: 'UST 10Y', value: 'N/A', change: 'N/A', direction: 'neutral' },
          { name: 'UST 30Y', value: 'N/A', change: 'N/A', direction: 'neutral' },
        ],
        trend: [],
        conclusion: '라이브 데이터를 불러오면 미국 국채 수익률과 커브를 보여줍니다.',
        status: 'N/A',
        freshness: 'N/A',
      },
      {
        id: 'indices',
        label: '지수',
        title: '지수',
        summary: '주요 주가지수는 위험선호도와 섹터별 회피/선호를 가장 직관적으로 드러냅니다.',
        items: [
          { name: 'S&P 500', value: 'N/A', change: 'N/A', direction: 'neutral' },
          { name: 'Nasdaq', value: 'N/A', change: 'N/A', direction: 'neutral' },
          { name: 'KOSPI', value: 'N/A', change: 'N/A', direction: 'neutral' },
          { name: 'Euro Stoxx', value: 'N/A', change: 'N/A', direction: 'neutral' },
        ],
        trend: [],
        conclusion: '라이브 데이터를 불러오면 글로벌 지수 방향성을 보여줍니다.',
        status: 'N/A',
        freshness: 'N/A',
      },
      {
        id: 'fx',
        label: '환율',
        title: '환율',
        summary: '달러 방향성과 아시아 통화의 민감도를 함께 봐야 실제 충격을 읽을 수 있습니다.',
        items: [
          { name: 'DXY', value: 'N/A', change: 'N/A', direction: 'neutral' },
          { name: 'USDKRW', value: 'N/A', change: 'N/A', direction: 'neutral' },
          { name: 'USDJPY', value: 'N/A', change: 'N/A', direction: 'neutral' },
          { name: 'USDCNY', value: 'N/A', change: 'N/A', direction: 'neutral' },
        ],
        trend: [],
        conclusion: '라이브 데이터를 불러오면 달러와 주요 통화 변화를 추적합니다.',
        status: 'N/A',
        freshness: 'N/A',
      },
    ],
    actions: [
      {
        state: 'Risk-off',
        rule: '주식 비중을 줄이고, 단기채와 달러 자산을 우선 점검합니다.',
        detail: '신규 추격매수보다 현금 비중과 방어적 노출이 우선입니다.',
      },
      {
        state: 'Inflation shock',
        rule: '장기채 듀레이션을 줄이고 원자재 노출을 검토합니다.',
        detail: '유가 상승이 물가 기대를 자극하는지 확인합니다.',
      },
      {
        state: 'Growth shock',
        rule: '경기민감 자산을 축소하고 방어주 비중을 점검합니다.',
        detail: '실적 방어력이 높은 섹터를 우선 확인합니다.',
      },
      {
        state: 'Policy shock',
        rule: '이벤트 전후 포지션 크기를 줄이고 변동성 관리에 집중합니다.',
        detail: '발언 직후 방향 추종보다 리스크 제한이 중요합니다.',
      },
    ],
  };
}

function renderSignalGrid(signals) {
  const grid = $('signal-grid');
  grid.innerHTML = (signals || [])
    .map(
      (signal) => `
        <article class="signal-card">
          <div class="signal-label">${escapeHtml(signal.label)}</div>
          <div class="signal-value">${escapeHtml(signal.value)}</div>
          <div class="signal-sub">${escapeHtml(signal.sub || '')}</div>
        </article>
      `,
    )
    .join('');
}

function renderIssues(items) {
  const list = $('issue-list');
  const visibleItems = (items || []).filter(Boolean);
  if (!visibleItems.length) {
    list.innerHTML = '<div class="empty-state">실시간 이슈를 불러오지 못했습니다.</div>';
    return;
  }
  list.innerHTML = visibleItems
    .map(
      (item) => `
        <article class="issue-card ${escapeHtml(item.importance || 'mid')}">
          <div class="issue-head">
            <h3>${escapeHtml(item.title)}</h3>
            <span class="importance-badge">${escapeHtml(item.importance || 'mid')}</span>
          </div>
          <p class="issue-impact">${escapeHtml(item.impact || '')}</p>
          <p class="issue-summary">${escapeHtml(item.summary || '')}</p>
          ${item.link ? `<a class="issue-link" href="${escapeHtml(item.link)}" target="_blank" rel="noreferrer">원문 보기</a>` : ''}
        </article>
      `,
    )
    .join('');
}

function renderNews(items) {
  const list = $('news-list');
  if (!items || items.length === 0) {
    list.innerHTML = '<div class="empty-state">최신 헤드라인을 불러오지 못했습니다.</div>';
    return;
  }
  list.innerHTML = items
    .map(
      (item) => `
        <article class="news-card">
          <div class="news-meta">
            <span class="news-impact">${escapeHtml(item.impact || '')}</span>
            <span class="news-published">${escapeHtml(item.published || '')}</span>
          </div>
          <h3><a href="${escapeHtml(item.link || '#')}" target="_blank" rel="noreferrer">${escapeHtml(item.title || '')}</a></h3>
          <p>${escapeHtml(item.summary || '')}</p>
        </article>
      `,
    )
    .join('');
}

function renderCriteria(items) {
  const list = $('criteria-list');
  list.innerHTML = (items || [])
    .map(
      (item) => `
        <article class="criteria-card">
          <h3>${escapeHtml(item.title)}</h3>
          <p>${escapeHtml(item.description)}</p>
        </article>
      `,
    )
    .join('');
}

function renderActions(items) {
  const list = $('action-stack');
  list.innerHTML = (items || [])
    .map(
      (item) => `
        <article class="action-card">
          <div class="action-state">${escapeHtml(item.state || '')}</div>
          <p class="action-rule">${escapeHtml(item.rule || '')}</p>
          <p class="action-detail">${escapeHtml(item.detail || '')}</p>
        </article>
      `,
    )
    .join('');
}

function renderDecisionGrid(data) {
  const grid = $('decision-grid');
  const items = [
    {
      label: '시장 상태',
      value: data?.signals?.[0]?.value || 'N/A',
      sub: data?.topLine || '',
    },
    {
      label: '핵심 드라이버',
      value: data?.signals?.[2]?.value || 'N/A',
      sub: '금리, 달러, 주식의 방향성',
    },
    {
      label: '뉴스 수',
      value: String(data?.newsItems?.length ?? 0),
      sub: '실시간 헤드라인 수',
    },
    {
      label: '자산군',
      value: String(data?.assetGroups?.length ?? 0),
      sub: '원자재, 채권, 지수, 환율',
    },
  ];

  grid.innerHTML = items
    .map(
      (item) => `
        <article class="decision-card">
          <div class="decision-label">${escapeHtml(item.label)}</div>
          <div class="decision-value">${escapeHtml(item.value)}</div>
          <div class="decision-sub">${escapeHtml(item.sub)}</div>
        </article>
      `,
    )
    .join('');
}

function renderFreshness(data) {
  const grid = $('freshness-grid');
  const freshness = data?.freshness || {};
  const entries = Object.entries(freshness).filter(([, value]) => value && value !== 'N/A');
  if (!entries.length) {
    grid.innerHTML = '<div class="empty-state">실시간 갱신 정보를 기다리는 중입니다.</div>';
    return;
  }
  grid.innerHTML = entries
    .map(
      ([key, value]) => `
        <div class="freshness-item">
          <span>${escapeHtml(key)}</span>
          <strong>${escapeHtml(value)}</strong>
        </div>
      `,
    )
    .join('');
}

function renderAssetTabs(groups) {
  const tabs = $('asset-tabs');
  tabs.innerHTML = (groups || [])
    .map(
      (group) => `
        <button class="asset-tab${state.activeAssetGroupId === group.id ? ' active' : ''}" data-asset-id="${escapeHtml(group.id)}" type="button">
          ${escapeHtml(group.label || group.title)}
        </button>
      `,
    )
    .join('');

  tabs.querySelectorAll('[data-asset-id]').forEach((button) => {
    button.addEventListener('click', () => {
      state.activeAssetGroupId = button.dataset.assetId;
      renderAssetTabs(groups);
      renderAssetPanel(groups);
    });
  });
}

function sparklinePath(values, width = 240, height = 64) {
  const nums = (values || []).map((value) => Number(value)).filter((value) => Number.isFinite(value));
  if (nums.length === 0) return '';
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const range = max - min || 1;
  const points = nums.map((value, index) => {
    const x = nums.length === 1 ? width / 2 : (index / (nums.length - 1)) * width;
    const y = height - ((value - min) / range) * height;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });
  return `M ${points.join(' L ')}`;
}

function renderAssetPanel(groups) {
  const panel = $('asset-panel');
  const active = groups.find((group) => group.id === state.activeAssetGroupId) || groups[0];
  if (!state.activeAssetGroupId && active) {
    state.activeAssetGroupId = active.id;
  }
  const path = sparklinePath(active?.trend || []);
  const items = (active?.items || [])
    .filter((item) => item && (item.value !== 'N/A' || item.change !== 'N/A'))
    .map(
      (item) => `
        <div class="asset-row">
          <div>
            <div class="asset-name">${escapeHtml(item.name || '')}</div>
            <div class="asset-direction ${escapeHtml(item.direction || 'neutral')}">${escapeHtml(item.direction || 'neutral')}</div>
          </div>
          <div class="asset-value">${escapeHtml(item.value || '')}</div>
          <div class="asset-change">${escapeHtml(item.change || '')}</div>
        </div>
      `,
    )
    .join('');

  panel.innerHTML = `
    <div class="asset-panel-head">
      <div>
        <p class="section-kicker">${escapeHtml(active?.label || '')}</p>
        <h3>${escapeHtml(active?.title || '')}</h3>
        <p class="asset-summary">${escapeHtml(active?.summary || '')}</p>
      </div>
      <div class="asset-status">${escapeHtml(active?.status || '')}</div>
    </div>
    <div class="asset-chart">
      <svg viewBox="0 0 240 64" preserveAspectRatio="none" aria-hidden="true">
        <path d="${path}" class="sparkline-path"></path>
      </svg>
      <div class="asset-freshness">${escapeHtml(active?.freshness || '')}</div>
    </div>
    <div class="asset-list">${items || '<div class="empty-state">실시간 자산 가격을 불러오는 중입니다.</div>'}</div>
    <p class="asset-conclusion">${escapeHtml(active?.conclusion || '')}</p>
  `;
}

function renderVerifyPanel(data) {
  const panel = $('verify-panel');
  panel.innerHTML = `
    <div class="verify-item">
      <span>Source</span>
      <strong>${escapeHtml(data?.source?.provider || 'N/A')}</strong>
    </div>
    <div class="verify-item">
      <span>Mode</span>
      <strong>${escapeHtml(data?.source?.mode || 'N/A')}</strong>
    </div>
    <div class="verify-item">
      <span>Collected</span>
      <strong>${escapeHtml(formatDateLabel(data?.collectedAt) || data?.collectedAt || 'N/A')}</strong>
    </div>
  `;
}

function renderHeader(data) {
  $('market-state').textContent = data?.signals?.[0]?.value || 'N/A';
  $('brief-date').textContent = formatDateLabel(data?.date || data?.collectedAt);
  $('top-line').textContent = data?.topLine || '데이터를 읽는 중';
  $('fetch-note').textContent = `${data?.source?.provider || 'Unknown'} · ${data?.source?.mode || 'unknown'} · ${data?.source?.note || ''}`;
}

function renderAll(data) {
  state.data = data;
  state.activeAssetGroupId = data?.assetGroups?.[0]?.id || null;
  renderHeader(data);
  renderSignalGrid(data?.signals);
  renderFreshness(data);
  renderVerifyPanel(data);
  renderIssues(data?.issues);
  renderNews(data?.newsItems);
  renderCriteria(data?.criteria);
  renderDecisionGrid(data);
  renderActions(data?.actions);
  renderAssetTabs(data?.assetGroups || []);
  renderAssetPanel(data?.assetGroups || []);
}

async function fetchJson(url) {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`${url} returned ${response.status}`);
  }
  return response.json();
}

async function fetchProxy(targetUrl) {
  const proxyUrl = new URL(ALL_ORIGINS_GET);
  proxyUrl.searchParams.set('url', targetUrl.toString());
  const response = await fetch(proxyUrl.toString(), { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Proxy returned ${response.status}`);
  }
  const payload = await response.json();
  if (payload?.error) {
    throw new Error(payload.error);
  }
  return payload.contents || '';
}

async function fetchYahooChart(symbol, interval = '1m', range = '1d') {
  const url = new URL(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`);
  url.searchParams.set('interval', interval);
  url.searchParams.set('range', range);
  const contents = await fetchProxy(url);
  const chart = JSON.parse(contents)?.chart || {};
  if (chart.error) {
    throw new Error(chart.error.description || `Yahoo error for ${symbol}`);
  }
  const result = chart.result?.[0];
  if (!result) {
    throw new Error(`No Yahoo chart data for ${symbol}`);
  }
  return result;
}

async function fetchYahooQuote(symbol) {
  const url = new URL('https://query1.finance.yahoo.com/v7/finance/quote');
  url.searchParams.set('symbols', symbol);
  const contents = await fetchProxy(url);
  const payload = JSON.parse(contents)?.quoteResponse || {};
  const result = payload.result?.[0];
  if (!result) {
    throw new Error(`No Yahoo quote data for ${symbol}`);
  }
  return result;
}

function buildSeriesPayload(chartPayload, symbol, quotePayload = null) {
  const meta = chartPayload.meta || {};
  const quote = chartPayload.indicators?.quote?.[0] || {};
  const closes = quote.close || [];
  const points = closes.map((close) => Number(close)).filter((close) => Number.isFinite(close));
  const chartMarketTime = meta.regularMarketTime ? meta.regularMarketTime * 1000 : null;
  const quoteMarketTime = quotePayload?.regularMarketTime ? quotePayload.regularMarketTime * 1000 : null;
  const latest = quotePayload?.regularMarketPrice ?? meta.regularMarketPrice ?? points.at(-1) ?? null;
  const previous = quotePayload?.regularMarketPreviousClose ?? meta.chartPreviousClose ?? points.at(-2) ?? null;
  const changePct =
    quotePayload?.regularMarketChangePercent ??
    (latest !== null && previous ? ((latest - previous) / previous) * 100 : null);
  const marketTime = quoteMarketTime ?? chartMarketTime;
  const freshness = marketTime
    ? new Date(marketTime).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', hour12: false })
    : 'intraday chart';
  const latestTradingDay = marketTime
    ? new Date(marketTime).toLocaleDateString('ko-KR', {
        timeZone: 'Asia/Seoul',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      })
    : 'N/A';

  return {
    symbol,
    latest,
    previous,
    change_pct: changePct,
    points: points.slice(-60),
    freshness,
    latestTradingDay,
    meta,
    quote: quotePayload,
  };
}

function formatPct(value) {
  if (value === null || value === undefined) return 'N/A';
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

function directionFromChange(changePct) {
  if (changePct === null || changePct === undefined) return 'neutral';
  if (changePct > 0) return 'up';
  if (changePct < 0) return 'down';
  return 'neutral';
}

function statusFromChange(changePct, positiveLabel, negativeLabel, neutralLabel = '중립') {
  if (changePct === null || changePct === undefined) return neutralLabel;
  if (changePct > 0) return positiveLabel;
  if (changePct < 0) return negativeLabel;
  return neutralLabel;
}

async function fetchLiveMarketData() {
  const baseData = emptyMarketData();
  const symbols = {
    wti: 'CL=F',
    brent: 'BZ=F',
    gold: 'GC=F',
    copper: 'HG=F',
    irx: '^IRX',
    fvx: '^FVX',
    tnx: '^TNX',
    tyx: '^TYX',
    spx: '^GSPC',
    ixic: '^IXIC',
    ks11: '^KS11',
    stoxx: '^STOXX50E',
    usdjpy: 'USDJPY=X',
    usdkrw: 'USDKRW=X',
    usdcny: 'USDCNY=X',
    dxy: 'DX-Y.NYB',
  };

  const results = {};
  const entries = Object.entries(symbols);
  const batchSize = 4;
  for (let index = 0; index < entries.length; index += batchSize) {
    const batch = entries.slice(index, index + batchSize);
    const settled = await Promise.allSettled(
      batch.map(async ([key, symbol]) => {
        const [chartResult, quoteResult] = await Promise.allSettled([
          fetchYahooChart(symbol),
          fetchYahooQuote(symbol),
        ]);
        if (chartResult.status !== 'fulfilled') {
          throw chartResult.reason;
        }
        const quotePayload = quoteResult.status === 'fulfilled' ? quoteResult.value : null;
        return [key, buildSeriesPayload(chartResult.value, symbol, quotePayload)];
      }),
    );
    for (const item of settled) {
      if (item.status === 'fulfilled') {
        const [key, series] = item.value;
        results[key] = series;
      }
    }
  }

  const hasAnyLiveSeries = Object.values(results).some((series) => series && series.latest !== null && series.latest !== undefined);
  if (!hasAnyLiveSeries) {
    throw new Error('Unable to load live market data');
  }

  const liveOrSample = (key, field, formatter, fallback) => {
    const live = results[key]?.[field];
    if (live === null || live === undefined) {
      return fallback;
    }
    return formatter(live);
  };

  const commodityItems = [
    {
      name: 'WTI',
      value: liveOrSample('wti', 'latest', (value) => value.toFixed(2), 'N/A'),
      change: liveOrSample('wti', 'change_pct', formatPct, 'N/A'),
      direction: directionFromChange(results.wti?.change_pct ?? null),
    },
    {
      name: 'Brent',
      value: liveOrSample('brent', 'latest', (value) => value.toFixed(2), 'N/A'),
      change: liveOrSample('brent', 'change_pct', formatPct, 'N/A'),
      direction: directionFromChange(results.brent?.change_pct ?? null),
    },
    {
      name: 'Gold',
      value: liveOrSample('gold', 'latest', (value) => value.toFixed(2), 'N/A'),
      change: liveOrSample('gold', 'change_pct', formatPct, 'N/A'),
      direction: directionFromChange(results.gold?.change_pct ?? null),
    },
    {
      name: 'Copper',
      value: liveOrSample('copper', 'latest', (value) => value.toFixed(2), 'N/A'),
      change: liveOrSample('copper', 'change_pct', formatPct, 'N/A'),
      direction: directionFromChange(results.copper?.change_pct ?? null),
    },
  ];

  const treasuryItems = [
    {
      name: 'UST 13W',
      value: liveOrSample('irx', 'latest', (value) => `${value.toFixed(3)}%`, 'N/A'),
      change: liveOrSample('irx', 'change_pct', formatPct, 'N/A'),
      direction: directionFromChange(results.irx?.change_pct ?? null),
    },
    {
      name: 'UST 5Y',
      value: liveOrSample('fvx', 'latest', (value) => `${value.toFixed(3)}%`, 'N/A'),
      change: liveOrSample('fvx', 'change_pct', formatPct, 'N/A'),
      direction: directionFromChange(results.fvx?.change_pct ?? null),
    },
    {
      name: 'UST 10Y',
      value: liveOrSample('tnx', 'latest', (value) => `${value.toFixed(3)}%`, 'N/A'),
      change: liveOrSample('tnx', 'change_pct', formatPct, 'N/A'),
      direction: directionFromChange(results.tnx?.change_pct ?? null),
    },
    {
      name: 'UST 30Y',
      value: liveOrSample('tyx', 'latest', (value) => `${value.toFixed(3)}%`, 'N/A'),
      change: liveOrSample('tyx', 'change_pct', formatPct, 'N/A'),
      direction: directionFromChange(results.tyx?.change_pct ?? null),
    },
  ];

  const fxItems = [
    {
      name: 'DXY',
      value: liveOrSample('dxy', 'latest', (value) => value.toFixed(2), 'N/A'),
      change: liveOrSample('dxy', 'change_pct', formatPct, 'N/A'),
      direction: directionFromChange(results.dxy?.change_pct ?? null),
    },
    {
      name: 'USDKRW',
      value: liveOrSample('usdkrw', 'latest', (value) => value.toFixed(2), 'N/A'),
      change: liveOrSample('usdkrw', 'change_pct', formatPct, 'N/A'),
      direction: directionFromChange(results.usdkrw?.change_pct ?? null),
    },
    {
      name: 'USDJPY',
      value: liveOrSample('usdjpy', 'latest', (value) => value.toFixed(2), 'N/A'),
      change: liveOrSample('usdjpy', 'change_pct', formatPct, 'N/A'),
      direction: directionFromChange(results.usdjpy?.change_pct ?? null),
    },
    {
      name: 'USDCNY',
      value: liveOrSample('usdcny', 'latest', (value) => value.toFixed(4), 'N/A'),
      change: liveOrSample('usdcny', 'change_pct', formatPct, 'N/A'),
      direction: directionFromChange(results.usdcny?.change_pct ?? null),
    },
  ];

  const indexItems = [
    {
      name: 'S&P 500',
      value: liveOrSample('spx', 'latest', (value) => value.toFixed(2), 'N/A'),
      change: liveOrSample('spx', 'change_pct', formatPct, 'N/A'),
      direction: directionFromChange(results.spx?.change_pct ?? null),
    },
    {
      name: 'Nasdaq',
      value: liveOrSample('ixic', 'latest', (value) => value.toFixed(2), 'N/A'),
      change: liveOrSample('ixic', 'change_pct', formatPct, 'N/A'),
      direction: directionFromChange(results.ixic?.change_pct ?? null),
    },
    {
      name: 'KOSPI',
      value: liveOrSample('ks11', 'latest', (value) => value.toFixed(2), 'N/A'),
      change: liveOrSample('ks11', 'change_pct', formatPct, 'N/A'),
      direction: directionFromChange(results.ks11?.change_pct ?? null),
    },
    {
      name: 'Euro Stoxx',
      value: liveOrSample('stoxx', 'latest', (value) => value.toFixed(2), 'N/A'),
      change: liveOrSample('stoxx', 'change_pct', formatPct, 'N/A'),
      direction: directionFromChange(results.stoxx?.change_pct ?? null),
    },
  ];

  const newsUrl = new URL('https://feeds.finance.yahoo.com/rss/2.0/headline');
  newsUrl.searchParams.set('s', '^GSPC,^IXIC,CL=F,GC=F,^TNX,USDKRW=X');
  newsUrl.searchParams.set('region', 'US');
  newsUrl.searchParams.set('lang', 'en-US');

  let newsItems = [];
  try {
    const rss = await fetchProxy(newsUrl);
    const xml = new DOMParser().parseFromString(rss, 'text/xml');
    const items = [...xml.querySelectorAll('channel > item')].slice(0, 4);
    newsItems = items.map((item) => {
      const title = item.querySelector('title')?.textContent?.trim() || 'Untitled headline';
      const summary = item.querySelector('description')?.textContent?.trim() || 'Yahoo Finance headline';
      const link = item.querySelector('link')?.textContent?.trim() || 'https://finance.yahoo.com/';
      const pubDate = item.querySelector('pubDate')?.textContent?.trim() || '';
      const text = `${title} ${summary}`.toLowerCase();
      let impact = '시장 전반';
      let importance = 'mid';
      if (text.includes('fed') || text.includes('rate') || text.includes('yield') || text.includes('bond') || text.includes('treasury')) {
        impact = '채권, 금리';
        importance = 'high';
      } else if (text.includes('oil') || text.includes('wti') || text.includes('brent') || text.includes('copper') || text.includes('gold') || text.includes('commodity')) {
        impact = '원자재, 인플레 기대';
        importance = 'high';
      } else if (text.includes('dollar') || text.includes('fx') || text.includes('krw') || text.includes('yen') || text.includes('yuan')) {
        impact = '환율, 신흥국 자산';
        importance = 'high';
      } else if (text.includes('stock') || text.includes('index') || text.includes('equity') || text.includes('nasdaq') || text.includes('sp500') || text.includes('s&p')) {
        impact = '지수, 위험선호';
      }
      return {
        title: title.slice(0, 120),
        summary: summary.slice(0, 180),
        impact,
        importance,
        link,
        published: pubDate,
      };
    });
  } catch {
    newsItems = baseData.newsItems;
  }

  return {
    ...baseData,
    date: new Date().toISOString().slice(0, 10),
    collectedAt: new Date().toISOString(),
    source: {
      provider: 'Yahoo Finance',
      mode: 'live via chart + quote through CORS proxy',
      note: 'Fetched through allorigins from browser',
    },
    freshness: {
      fx: results.usdkrw?.freshness || baseData.freshness.fx,
      indices: results.spx?.freshness || baseData.freshness.indices,
      commodities: results.wti?.freshness || baseData.freshness.commodities,
      bonds: results.tnx?.freshness || baseData.freshness.bonds,
      news: newsItems.length ? 'live rss' : 'N/A',
    },
    signals: [
      {
        label: '시장 상태',
        value:
          results.spx?.change_pct === null || results.spx?.change_pct === undefined
            ? 'N/A'
            : results.spx.change_pct < 0
              ? 'Risk-off'
              : 'Neutral',
        sub: '실시간 지수 데이터를 기준으로 계산했습니다.',
      },
      {
        label: '신뢰도',
        value: '높음',
        sub: '브라우저에서 직접 라이브 데이터를 수집했습니다.',
      },
      {
        label: '핵심 드라이버',
        value:
          results.tnx?.latest !== null && results.tnx?.latest !== undefined && results.dxy?.latest !== null && results.dxy?.latest !== undefined
            ? '금리 + 달러'
            : 'N/A',
        sub: '미국 금리와 달러 데이터를 함께 봅니다.',
      },
    ],
    topLine:
      results.spx?.change_pct !== null &&
      results.spx?.change_pct !== undefined &&
      results.tnx?.change_pct !== null &&
      results.tnx?.change_pct !== undefined &&
      results.spx.change_pct < 0 &&
      results.tnx.change_pct > 0
        ? '금리 상승과 주식 약세가 함께 보여 위험자산 압박이 커지고 있습니다.'
        : results.spx?.change_pct !== null &&
          results.spx?.change_pct !== undefined &&
          results.tnx?.change_pct !== null &&
          results.tnx?.change_pct !== undefined &&
          results.spx.change_pct > 0 &&
          results.tnx.change_pct <= 0
          ? '주식이 버티고 금리 부담이 완화되며 위험선호가 유지됩니다.'
          : '실시간 데이터를 일부 수집했습니다. 수집된 값만 기준으로 보여줍니다.',
    issues: [
      results.tnx?.change_pct !== null && results.tnx?.change_pct !== undefined
        ? {
            title: `미 10년물 금리 ${formatPct(results.tnx.change_pct)}`,
            impact: '채권, 주식',
            importance: 'high',
            summary: '장기금리 변화가 성장주 밸류에이션과 위험선호를 동시에 건드립니다.',
          }
        : null,
      results.dxy?.latest !== null && results.dxy?.latest !== undefined
        ? {
            title: `DXY ${results.dxy.latest.toFixed(2)}`,
            impact: '환율, 신흥국 자산',
            importance: 'high',
            summary: '달러 강세가 원화와 아시아 통화에 압력을 줍니다.',
          }
        : null,
      results.wti?.change_pct !== null && results.wti?.change_pct !== undefined
        ? {
            title: `WTI ${formatPct(results.wti.change_pct)}`,
            impact: '원자재, 인플레 기대',
            importance: 'mid',
            summary: '유가 방향이 인플레이션 재가열 우려를 자극하는지 봅니다.',
          }
        : null,
    ].filter(Boolean),
    newsItems,
    assetGroups: [
      {
        id: 'commodities',
        label: '원자재',
        title: '원자재',
        summary: '브라우저 직접 수집한 실시간 차트로 원자재 변화를 읽습니다.',
        items: commodityItems,
        trend: results.wti?.points?.length ? results.wti.points.slice(-11) : [],
        conclusion: '에너지와 산업금속의 방향이 인플레이션과 성장 신호를 보여줍니다.',
        status: statusFromChange(results.wti?.change_pct ?? null, '강세', '약세', 'N/A'),
        freshness: results.wti?.freshness || 'N/A',
      },
      {
        id: 'bonds',
        label: '채권',
        title: '채권',
        summary: '미국 국채 수익률과 커브 변화를 확인합니다.',
        items: treasuryItems,
        trend: results.tnx?.points?.length ? results.tnx.points.slice(-11) : [],
        conclusion: '금리 상승과 커브 변화는 성장주와 달러를 동시에 흔듭니다.',
        status: statusFromChange(results.tnx?.change_pct ?? null, '압박', '완화', 'N/A'),
        freshness: results.tnx?.freshness || 'N/A',
      },
      {
        id: 'indices',
        label: '지수',
        title: '지수',
        summary: '실시간 지수 차트로 글로벌 주가지수의 방향성을 관찰합니다.',
        items: indexItems,
        trend: results.spx?.points?.length ? results.spx.points.slice(-11) : [],
        conclusion: '위험선호와 방어 회전의 강도를 확인합니다.',
        status: statusFromChange(results.spx?.change_pct ?? null, '강세', '약세', 'N/A'),
        freshness: results.spx?.latestTradingDay ? `latest trading day: ${results.spx.latestTradingDay}` : 'N/A',
      },
      {
        id: 'fx',
        label: '환율',
        title: '환율',
        summary: 'intraday chart 기반으로 달러 강세와 주요 통화 변화를 추적합니다.',
        items: fxItems,
        trend: results.usdkrw?.points?.length ? results.usdkrw.points.slice(-11) : [],
        conclusion: '달러 강세가 지속되면 원화와 엔화 약세 압력이 커집니다.',
        status: statusFromChange(results.dxy?.change_pct ?? null, '강세', '완화', 'N/A'),
        freshness: results.usdkrw?.freshness || 'N/A',
      },
    ],
    actions: baseData.actions.map((action) => ({ ...action })),
  };
}

async function loadData() {
  try {
    return await fetchLiveMarketData();
  } catch {
    throw new Error('Unable to load live market data');
  }
}

async function refresh() {
  if (state.refreshing) {
    return;
  }
  state.refreshing = true;
  const note = $('fetch-note');
  note.textContent = IS_FILE_PROTOCOL ? '브라우저에서 데이터를 불러오는 중...' : '데이터를 불러오는 중...';
  try {
    const data = await loadData();
    renderAll(data);
  } catch (error) {
    note.textContent = error.message;
    $('top-line').textContent = '데이터를 불러오지 못했습니다.';
    $('market-state').textContent = 'Error';
  } finally {
    state.refreshing = false;
  }
}

function scheduleAutoRefresh() {
  const pollMs = 5 * 60 * 1000;

  window.setInterval(() => {
    if (document.visibilityState === 'visible') {
      refresh();
    }
  }, pollMs);

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      refresh();
    }
  });
}

function attachActions() {
  $('refresh-btn')?.addEventListener('click', refresh);
  const verifyButton = $('verify-btn');
  if (verifyButton) {
    verifyButton.textContent = 'Reload';
    verifyButton.addEventListener('click', async () => {
      await refresh();
      document.getElementById('verify-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  attachActions();
  scheduleAutoRefresh();
  refresh();
});
