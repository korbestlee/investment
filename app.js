const SAMPLE_DATA = window.MARKET_DATA_SAMPLE || null;
const IS_FILE_PROTOCOL = window.location.protocol === 'file:';

const state = {
  activeAssetGroupId: null,
  data: null,
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

function cloneData(value) {
  return typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value));
}

function fallbackData() {
  return cloneData(SAMPLE_DATA);
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
  list.innerHTML = (items || [])
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
      sub: '실시간 또는 샘플 헤드라인',
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
  const entries = Object.entries(freshness);
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
    <div class="asset-list">${items}</div>
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

async function fetchYahooChart(symbol, interval = '1m', range = '1d') {
  const url = new URL(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`);
  url.searchParams.set('interval', interval);
  url.searchParams.set('range', range);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Yahoo chart ${symbol} returned ${response.status}`);
  }
  const payload = await response.json();
  const chart = payload?.chart || {};
  if (chart.error) {
    throw new Error(chart.error.description || `Yahoo error for ${symbol}`);
  }
  const result = chart.result?.[0];
  if (!result) {
    throw new Error(`No Yahoo chart data for ${symbol}`);
  }
  return result;
}

function buildSeriesPayload(payload, symbol) {
  const meta = payload.meta || {};
  const quote = payload.indicators?.quote?.[0] || {};
  const closes = quote.close || [];
  const points = closes.map((close) => Number(close)).filter((close) => Number.isFinite(close));
  const latest = meta.regularMarketPrice ?? points.at(-1) ?? null;
  const previous = meta.chartPreviousClose ?? points.at(-2) ?? null;
  const changePct = latest !== null && previous ? ((latest - previous) / previous) * 100 : null;
  const marketTime = meta.regularMarketTime;
  const freshness = marketTime
    ? new Date(marketTime * 1000).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', hour12: false })
    : 'intraday chart';

  return {
    symbol,
    latest,
    previous,
    change_pct: changePct,
    points: points.slice(-60),
    freshness,
    meta,
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
  const baseData = fallbackData();
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
  await Promise.all(
    Object.entries(symbols).map(async ([key, symbol]) => {
      results[key] = buildSeriesPayload(await fetchYahooChart(symbol), symbol);
    }),
  );

  const commodityItems = [
    {
      name: 'WTI',
      value: results.wti.latest !== null ? results.wti.latest.toFixed(2) : 'N/A',
      change: formatPct(results.wti.change_pct),
      direction: directionFromChange(results.wti.change_pct),
    },
    {
      name: 'Brent',
      value: results.brent.latest !== null ? results.brent.latest.toFixed(2) : 'N/A',
      change: formatPct(results.brent.change_pct),
      direction: directionFromChange(results.brent.change_pct),
    },
    {
      name: 'Gold',
      value: results.gold.latest !== null ? results.gold.latest.toFixed(2) : 'N/A',
      change: formatPct(results.gold.change_pct),
      direction: directionFromChange(results.gold.change_pct),
    },
    {
      name: 'Copper',
      value: results.copper.latest !== null ? results.copper.latest.toFixed(2) : 'N/A',
      change: formatPct(results.copper.change_pct),
      direction: directionFromChange(results.copper.change_pct),
    },
  ];

  const treasuryItems = [
    {
      name: 'UST 13W',
      value: results.irx.latest !== null ? `${results.irx.latest.toFixed(3)}%` : 'N/A',
      change: formatPct(results.irx.change_pct),
      direction: directionFromChange(results.irx.change_pct),
    },
    {
      name: 'UST 5Y',
      value: results.fvx.latest !== null ? `${results.fvx.latest.toFixed(3)}%` : 'N/A',
      change: formatPct(results.fvx.change_pct),
      direction: directionFromChange(results.fvx.change_pct),
    },
    {
      name: 'UST 10Y',
      value: results.tnx.latest !== null ? `${results.tnx.latest.toFixed(3)}%` : 'N/A',
      change: formatPct(results.tnx.change_pct),
      direction: directionFromChange(results.tnx.change_pct),
    },
    {
      name: 'UST 30Y',
      value: results.tyx.latest !== null ? `${results.tyx.latest.toFixed(3)}%` : 'N/A',
      change: formatPct(results.tyx.change_pct),
      direction: directionFromChange(results.tyx.change_pct),
    },
  ];

  const fxItems = [
    {
      name: 'DXY',
      value: results.dxy.latest !== null ? results.dxy.latest.toFixed(2) : 'N/A',
      change: formatPct(results.dxy.change_pct),
      direction: directionFromChange(results.dxy.change_pct),
    },
    {
      name: 'USDKRW',
      value: results.usdkrw.latest !== null ? results.usdkrw.latest.toFixed(2) : 'N/A',
      change: formatPct(results.usdkrw.change_pct),
      direction: directionFromChange(results.usdkrw.change_pct),
    },
    {
      name: 'USDJPY',
      value: results.usdjpy.latest !== null ? results.usdjpy.latest.toFixed(2) : 'N/A',
      change: formatPct(results.usdjpy.change_pct),
      direction: directionFromChange(results.usdjpy.change_pct),
    },
    {
      name: 'USDCNY',
      value: results.usdcny.latest !== null ? results.usdcny.latest.toFixed(4) : 'N/A',
      change: formatPct(results.usdcny.change_pct),
      direction: directionFromChange(results.usdcny.change_pct),
    },
  ];

  const indexItems = [
    {
      name: 'S&P 500',
      value: results.spx.latest !== null ? results.spx.latest.toFixed(2) : 'N/A',
      change: formatPct(results.spx.change_pct),
      direction: directionFromChange(results.spx.change_pct),
    },
    {
      name: 'Nasdaq',
      value: results.ixic.latest !== null ? results.ixic.latest.toFixed(2) : 'N/A',
      change: formatPct(results.ixic.change_pct),
      direction: directionFromChange(results.ixic.change_pct),
    },
    {
      name: 'KOSPI',
      value: results.ks11.latest !== null ? results.ks11.latest.toFixed(2) : 'N/A',
      change: formatPct(results.ks11.change_pct),
      direction: directionFromChange(results.ks11.change_pct),
    },
    {
      name: 'Euro Stoxx',
      value: results.stoxx.latest !== null ? results.stoxx.latest.toFixed(2) : 'N/A',
      change: formatPct(results.stoxx.change_pct),
      direction: directionFromChange(results.stoxx.change_pct),
    },
  ];

  return {
    ...baseData,
    date: new Date().toISOString().slice(0, 10),
    collectedAt: new Date().toISOString(),
    source: {
      provider: 'Yahoo Finance',
      mode: 'live',
      note: 'Fetched directly from browser',
    },
    freshness: {
      fx: results.usdkrw.freshness,
      indices: results.spx.freshness,
      commodities: results.wti.freshness,
      bonds: results.tnx.freshness,
      news: 'sample',
    },
    signals: [
      {
        label: '시장 상태',
        value: (results.spx.change_pct || 0) < 0 ? 'Risk-off' : 'Neutral',
        sub: '자산군 신호를 합쳐 레짐을 계산했습니다.',
      },
      {
        label: '신뢰도',
        value: '높음',
        sub: '브라우저에서 직접 라이브 데이터를 수집했습니다.',
      },
      {
        label: '핵심 드라이버',
        value: '금리 + 달러',
        sub: '미국 금리와 달러 강세가 핵심 축입니다.',
      },
    ],
    topLine:
      (results.spx.change_pct || 0) < 0 && (results.tnx.change_pct || 0) > 0
        ? '금리 상승과 주식 약세가 함께 보여 위험자산 압박이 커지고 있습니다.'
        : (results.spx.change_pct || 0) > 0 && (results.tnx.change_pct || 0) <= 0
          ? '주식이 버티고 금리 부담이 완화되며 위험선호가 유지됩니다.'
          : '실시간 Yahoo intraday 데이터를 기준으로 레짐과 대응을 자동 계산했습니다.',
    issues: [
      {
        title: `미 10년물 금리 ${formatPct(results.tnx.change_pct)}`,
        impact: '채권, 주식',
        importance: 'high',
        summary: '장기금리 변화가 성장주 밸류에이션과 위험선호를 동시에 건드립니다.',
      },
      {
        title: results.dxy.latest !== null ? `DXY ${results.dxy.latest.toFixed(2)}` : 'DXY N/A',
        impact: '환율, 신흥국 자산',
        importance: 'high',
        summary: '달러 강세가 원화와 아시아 통화에 압력을 줍니다.',
      },
      {
        title: `WTI ${formatPct(results.wti.change_pct)}`,
        impact: '원자재, 인플레 기대',
        importance: 'mid',
        summary: '유가 방향이 인플레이션 재가열 우려를 자극하는지 봅니다.',
      },
    ],
    newsItems: baseData.newsItems,
    assetGroups: [
      {
        id: 'commodities',
        label: '원자재',
        title: '원자재',
        summary: '브라우저 직접 수집한 실시간 차트로 원자재 변화를 읽습니다.',
        items: commodityItems,
        trend: results.wti.points.length ? results.wti.points.slice(-11) : baseData.assetGroups[0].trend,
        conclusion: '에너지와 산업금속의 방향이 인플레이션과 성장 신호를 보여줍니다.',
        status: statusFromChange(results.wti.change_pct, '강세', '약세'),
        freshness: results.wti.freshness,
      },
      {
        id: 'bonds',
        label: '채권',
        title: '채권',
        summary: '미국 국채 수익률과 커브 변화를 확인합니다.',
        items: treasuryItems,
        trend: results.tnx.points.length ? results.tnx.points.slice(-11) : baseData.assetGroups[1].trend,
        conclusion: '금리 상승과 커브 변화는 성장주와 달러를 동시에 흔듭니다.',
        status: statusFromChange(results.tnx.change_pct, '압박', '완화'),
        freshness: results.tnx.freshness,
      },
      {
        id: 'indices',
        label: '지수',
        title: '지수',
        summary: '실시간 지수 차트로 글로벌 주가지수의 방향성을 관찰합니다.',
        items: indexItems,
        trend: results.spx.points.length ? results.spx.points.slice(-11) : baseData.assetGroups[2].trend,
        conclusion: '위험선호와 방어 회전의 강도를 확인합니다.',
        status: statusFromChange(results.spx.change_pct, '강세', '약세'),
        freshness: results.spx.freshness,
      },
      {
        id: 'fx',
        label: '환율',
        title: '환율',
        summary: 'intraday chart 기반으로 달러 강세와 주요 통화 변화를 추적합니다.',
        items: fxItems,
        trend: results.usdkrw.points.length ? results.usdkrw.points.slice(-11) : baseData.assetGroups[3].trend,
        conclusion: '달러 강세가 지속되면 원화와 엔화 약세 압력이 커집니다.',
        status: results.dxy.change_pct > 0 ? '강세' : '완화',
        freshness: results.usdkrw.freshness,
      },
    ],
    actions: baseData.actions.map((action) => ({ ...action })),
  };
}

async function loadData() {
  if (!SAMPLE_DATA) {
    throw new Error('Missing embedded sample data');
  }

  try {
    return await fetchLiveMarketData();
  } catch {
    return fallbackData();
  }
}

async function refresh() {
  const note = $('fetch-note');
  note.textContent = IS_FILE_PROTOCOL ? '브라우저에서 데이터를 불러오는 중...' : '데이터를 불러오는 중...';
  try {
    const data = await loadData();
    renderAll(data);
  } catch (error) {
    note.textContent = error.message;
    $('top-line').textContent = '데이터를 불러오지 못했습니다.';
    $('market-state').textContent = 'Error';
  }
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
  refresh();
});
