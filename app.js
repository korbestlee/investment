const SAMPLE_URL = './data/market-data.sample.json';
const API_URL = '/api/market-data';
const IS_LOCAL_HOST = ['localhost', '127.0.0.1'].includes(window.location.hostname);

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

async function loadData() {
  const sampleData = await fetchJson(SAMPLE_URL);

  if (!IS_LOCAL_HOST) {
    return {
      ...sampleData,
      source: {
        ...sampleData.source,
        provider: 'GitHub Pages sample',
        mode: 'static',
        note: `${sampleData.source?.note || ''} Live API is disabled on GitHub Pages.`,
      },
    };
  }

  try {
    const liveData = await fetchJson(API_URL);
    return {
      ...sampleData,
      ...liveData,
      source: liveData.source || sampleData.source,
    };
  } catch {
    return sampleData;
  }
}

async function refresh() {
  const note = $('fetch-note');
  note.textContent = IS_LOCAL_HOST ? '데이터를 불러오는 중...' : '샘플 데이터를 불러오는 중...';
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
    verifyButton.textContent = IS_LOCAL_HOST ? 'Verify Live' : 'Static Mode';
    verifyButton.disabled = !IS_LOCAL_HOST;
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
