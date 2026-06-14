const LIVE_DATA_SOURCE_URL = "/api/market-data";
const SAMPLE_DATA_SOURCE_URL = "./data/market-data.sample.json";
const IS_STATIC_HOST =
  typeof location !== "undefined" &&
  (location.protocol === "file:" ||
    location.hostname.endsWith("github.io") ||
    location.hostname.includes("pages.dev"));

const fallbackMarketData = {
  date: "2026-06-13",
  collectedAt: "2026-06-13T08:30:00+09:00",
  source: {
    provider: "Sample data",
    mode: "fallback",
    note: "Used when the live API route is unavailable",
  },
  freshness: {
    fx: "sample",
    indices: "sample",
    commodities: "sample",
    bonds: "sample",
    news: "sample",
  },
  signals: [
    {
      label: "시장 상태",
      value: "Risk-off",
      sub: "달러 강세와 금리 부담 동시 확대",
    },
    {
      label: "신뢰도",
      value: "높음",
      sub: "주요 자산군이 같은 방향으로 반응",
    },
    {
      label: "핵심 드라이버",
      value: "미 금리 + 달러",
      sub: "성장주와 신흥국 통화에 압력",
    },
  ],
  topLine: "미국 금리 상승과 달러 강세가 위험자산 전반을 압박하고 있습니다.",
  issues: [
    {
      title: "미 10년물 금리 상승",
      impact: "채권, 주식",
      importance: "high",
      summary: "장기금리 상승이 성장주 밸류에이션에 부담을 주는 구간입니다.",
    },
    {
      title: "DXY 강세 지속",
      impact: "환율, 신흥국 자산",
      importance: "high",
      summary: "달러 강세는 원화 약세와 위험자산 조정 압력을 동시에 키웁니다.",
    },
    {
      title: "유가 반등",
      impact: "원자재, 인플레 기대",
      importance: "mid",
      summary: "에너지 가격 반등은 인플레이션 재가열 경계로 연결됩니다.",
    },
    {
      title: "중앙은행 발언 대기",
      impact: "금리, FX",
      importance: "low",
      summary: "정책 코멘트는 변동성 확대의 촉매가 될 수 있습니다.",
    },
  ],
  newsItems: [
    {
      title: "Markets await Fed commentary",
      impact: "채권, 금리",
      importance: "high",
      summary: "Sample headline for fallback mode.",
      published: "Sample",
      link: "#",
    },
    {
      title: "Oil prices stabilize after recent move",
      impact: "원자재, 인플레 기대",
      importance: "mid",
      summary: "Sample headline for fallback mode.",
      published: "Sample",
      link: "#",
    },
  ],
  criteria: [
    {
      title: "변화의 크기",
      description: "전일 대비, 1주 대비, 1개월 대비로 의미 있는 움직임인지 확인합니다.",
    },
    {
      title: "방향의 일관성",
      description: "금리, 달러, 주식, 원자재가 같은 레짐을 가리키는지 확인합니다.",
    },
    {
      title: "이벤트 충격",
      description: "지표 서프라이즈, 중앙은행 발언, 지정학 이벤트의 즉시 반응을 봅니다.",
    },
    {
      title: "상호작용",
      description: "유가와 인플레 기대, 금리와 성장주, 달러와 신흥국 통화의 연결을 봅니다.",
    },
  ],
  assetGroups: [
    {
      id: "commodities",
      label: "원자재",
      title: "원자재",
      summary: "에너지와 산업금속이 인플레 기대와 경기 민감도를 동시에 보여줍니다.",
      items: [
        { name: "WTI", value: "78.4", change: "+3.1%", direction: "up" },
        { name: "Brent", value: "82.1", change: "+2.6%", direction: "up" },
        { name: "Gold", value: "2320", change: "-0.4%", direction: "down" },
        { name: "Copper", value: "4.12", change: "-1.2%", direction: "down" },
      ],
      trend: [42, 48, 45, 52, 58, 61, 66, 72, 78, 74, 79],
      conclusion: "에너지 강세, 산업금속 약세로 인플레와 성장 신호가 엇갈립니다.",
      status: "경계",
    },
    {
      id: "bonds",
      label: "채권",
      title: "채권",
      summary: "금리 방향과 커브 변화는 주식과 환율의 가장 빠른 선행 신호입니다.",
      items: [
        { name: "UST 2Y", value: "4.89%", change: "+6bp", direction: "up" },
        { name: "UST 10Y", value: "4.41%", change: "+12bp", direction: "up" },
        { name: "UST 30Y", value: "4.55%", change: "+10bp", direction: "up" },
        { name: "Curve", value: "Flattening", change: "경계", direction: "neutral" },
      ],
      trend: [58, 57, 60, 63, 67, 70, 73, 79, 83, 86, 88],
      conclusion: "장기금리 상승과 플래트닝은 성장주 부담을 키우는 전형적 조합입니다.",
      status: "압박",
    },
    {
      id: "indices",
      label: "지수",
      title: "지수",
      summary: "주요 주가지수는 위험선호도와 섹터별 회피/선호를 가장 직관적으로 드러냅니다.",
      items: [
        { name: "S&P 500", value: "5,420", change: "-1.1%", direction: "down" },
        { name: "Nasdaq", value: "17,210", change: "-1.8%", direction: "down" },
        { name: "KOSPI", value: "2,780", change: "-0.9%", direction: "down" },
        { name: "Euro Stoxx", value: "492", change: "-0.5%", direction: "down" },
      ],
      trend: [82, 80, 79, 76, 73, 71, 68, 65, 62, 59, 56],
      conclusion: "성장주 중심 약세가 위험회피 회전의 강도를 보여줍니다.",
      status: "약세",
    },
    {
      id: "fx",
      label: "환율",
      title: "환율",
      summary: "달러 방향성과 아시아 통화의 민감도를 함께 봐야 실제 충격을 읽을 수 있습니다.",
      items: [
        { name: "DXY", value: "105.8", change: "+0.8%", direction: "up" },
        { name: "USDKRW", value: "1,378", change: "+0.6%", direction: "up" },
        { name: "USDJPY", value: "157.2", change: "+0.4%", direction: "up" },
        { name: "USDCNH", value: "7.28", change: "+0.2%", direction: "up" },
      ],
      trend: [52, 54, 56, 58, 62, 65, 69, 72, 75, 78, 82],
      conclusion: "달러 강세가 지속되며 원화와 엔화의 약세 압력을 강화합니다.",
      status: "강세",
    },
  ],
  actions: [
    {
      state: "Risk-off",
      rule: "주식 비중을 줄이고, 단기채와 달러 자산을 우선 점검합니다.",
      detail: "신규 추격매수보다 현금 비중과 방어적 노출이 우선입니다.",
    },
    {
      state: "Inflation shock",
      rule: "장기채 듀레이션을 줄이고 원자재 노출을 검토합니다.",
      detail: "유가 상승이 물가 기대를 자극하는지 확인합니다.",
    },
    {
      state: "Growth shock",
      rule: "경기민감 자산을 축소하고 방어주 비중을 점검합니다.",
      detail: "실적 방어력이 높은 섹터를 우선 확인합니다.",
    },
    {
      state: "Policy shock",
      rule: "이벤트 전후 포지션 크기를 줄이고 변동성 관리에 집중합니다.",
      detail: "발언 직후 방향 추종보다 리스크 제한이 중요합니다.",
    },
  ],
};

let marketData = JSON.parse(JSON.stringify(fallbackMarketData));
const assetLookup = new Map();
let activeAssetId = marketData.assetGroups[0].id;
let marketView = null;
let sparklineSeq = 0;

function statusWeight(status) {
  switch (status) {
    case "압박":
    case "약세":
      return 2;
    case "경계":
      return 1;
    case "강세":
    case "완화":
      return 0;
    default:
      return 1;
  }
}

function formatPercent(value) {
  return `${Math.round(value)}%`;
}

function computeMarketView(data) {
  const groups = Object.fromEntries(data.assetGroups.map((group) => [group.id, group]));
  const commodities = groups.commodities;
  const bonds = groups.bonds;
  const indices = groups.indices;
  const fx = groups.fx;

  const riskOffScore =
    statusWeight(bonds.status) + statusWeight(indices.status) + statusWeight(fx.status);
  const inflationScore = statusWeight(commodities.status) + statusWeight(bonds.status);
  const growthScore = statusWeight(bonds.status) + statusWeight(indices.status);
  const policyScore = data.issues.some((issue) => issue.title.includes("중앙은행")) ? 2 : 0;

  const candidates = [
    { label: "Risk-off", score: riskOffScore, summary: "주식 약세, 금리 부담, 달러 강세가 동시에 나타납니다." },
    {
      label: "Inflation shock",
      score: inflationScore,
      summary: "원자재와 금리가 함께 오르며 인플레이션 재가열 경계가 커집니다.",
    },
    {
      label: "Growth shock",
      score: growthScore,
      summary: "금리 상승과 주가 약세가 동반되며 성장 민감 자산에 압박이 커집니다.",
    },
    {
      label: "Policy shock",
      score: policyScore,
      summary: "중앙은행/정책 발언이 변동성의 촉매가 될 가능성이 있습니다.",
    },
  ];

  candidates.sort((a, b) => b.score - a.score);
  const winner = candidates[0];
  const confidence = Math.min(96, 54 + winner.score * 10 + (data.issues.filter((issue) => issue.importance === "high").length * 4));
  const primaryDrivers = [commodities, bonds, indices, fx]
    .map((group) => `${group.title} ${group.status}`)
    .join(" · ");
  const actionsByState = {
    "Risk-off": ["Risk-off", "Growth shock", "Policy shock"],
    "Inflation shock": ["Inflation shock", "Risk-off", "Policy shock"],
    "Growth shock": ["Growth shock", "Risk-off", "Policy shock"],
    "Policy shock": ["Policy shock", "Risk-off", "Growth shock"],
  };
  const recommendationStates = actionsByState[winner.label] || ["Risk-off", "Policy shock"];
  const recommendations = recommendationStates
    .map((state) => data.actions.find((action) => action.state === state))
    .filter(Boolean);

  return {
    regime: winner.label,
    summary: winner.summary,
    confidence,
    primaryDrivers,
    recommendations,
    factors: [
      { label: "원자재", value: commodities.status, note: commodities.conclusion },
      { label: "채권", value: bonds.status, note: bonds.conclusion },
      { label: "지수", value: indices.status, note: indices.conclusion },
      { label: "환율", value: fx.status, note: fx.conclusion },
    ],
    watchlist: [
      "금리 상승 지속 여부",
      "달러 강세 재가속 여부",
      "유가 반등의 지속성",
      "이벤트 전후 변동성 확대",
    ],
  };
}

function formatDate(isoDate) {
  const date = new Date(`${isoDate}T09:00:00`);
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(date);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function sparkline(points, color) {
  const width = 360;
  const height = 84;
  const gradientId = `gradient-${++sparklineSeq}`;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const span = max - min || 1;
  const step = width / Math.max(points.length - 1, 1);
  const coords = points
    .map((point, index) => {
      const x = index * step;
      const y = height - 10 - ((point - min) / span) * (height - 20);
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");

  return `
    <svg viewBox="0 0 ${width} ${height}" class="sparkline" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="${gradientId}" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stop-color="${color}" stop-opacity="0.34" />
          <stop offset="100%" stop-color="${color}" stop-opacity="0.03" />
        </linearGradient>
      </defs>
      <polyline
        points="${coords}"
        fill="none"
        stroke="${color}"
        stroke-width="3.2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <polygon points="0,${height} ${coords} ${width},${height}" fill="url(#${gradientId})" />
    </svg>
  `;
}

function setMarketData(nextData) {
  marketData = nextData;
  assetLookup.clear();
  marketData.assetGroups.forEach((group) => {
    assetLookup.set(group.id, group);
  });
  if (!assetLookup.has(activeAssetId)) {
    activeAssetId = marketData.assetGroups[0].id;
  }
  marketView = computeMarketView(marketData);
}

function renderSignals() {
  const signalGrid = document.getElementById("signal-grid");
  const derivedSignals = marketData.signals.map((signal) => ({ ...signal }));
  if (marketView) {
    derivedSignals[0].value = marketView.regime;
    derivedSignals[0].sub = marketView.summary;
    derivedSignals[1].value = formatPercent(marketView.confidence);
    derivedSignals[1].sub = "자산군 간 신호 정합도";
    derivedSignals[2].value = marketView.primaryDrivers.split(" · ")[0] || marketData.signals[2].value;
    derivedSignals[2].sub = marketView.primaryDrivers;
  }

  signalGrid.innerHTML = derivedSignals
    .map(
      (signal) => `
        <div class="signal chip">
          <div class="label">${signal.label}</div>
          <div class="value">${signal.value}</div>
          <div class="sub">${signal.sub}</div>
        </div>
      `,
    )
    .join("");
}

function renderIssues() {
  const list = document.getElementById("issue-list");
  list.innerHTML = marketData.issues
    .map(
      (issue) => `
        <article class="issue-item">
          <div>
            <strong>${escapeHtml(issue.title)}</strong>
            <div class="issue-meta">${escapeHtml(issue.summary)}</div>
            <div class="tag-row">
              <span class="tag ${escapeHtml(issue.importance)}">영향: ${escapeHtml(issue.impact)}</span>
              <span class="tag ${escapeHtml(issue.importance)}">중요도: ${escapeHtml(issue.importance.toUpperCase())}</span>
            </div>
          </div>
        </article>
      `,
    )
    .join("");
}

function renderNews() {
  const list = document.getElementById("news-list");
  const items = marketData.newsItems || marketData.issues || [];
  list.innerHTML = items
    .map(
      (item) => `
        <article class="news-item">
          <div>
            <strong>${escapeHtml(item.title)}</strong>
            <div class="issue-meta">${escapeHtml(item.summary || "")}</div>
            <div class="tag-row">
              <span class="tag ${escapeHtml(item.importance || "mid")}">${escapeHtml(item.impact || "시장 전반")}</span>
              ${item.published ? `<span class="tag low">${escapeHtml(item.published)}</span>` : ""}
            </div>
          </div>
          ${item.link ? `<a class="news-link" href="${escapeHtml(item.link)}" target="_blank" rel="noreferrer">Open</a>` : ""}
        </article>
      `,
    )
    .join("");
}

function renderCriteria() {
  const list = document.getElementById("criteria-list");
  list.innerHTML = marketData.criteria
    .map(
      (criterion) => `
        <article class="criteria-item">
          <strong>${escapeHtml(criterion.title)}</strong>
          <p>${escapeHtml(criterion.description)}</p>
        </article>
      `,
    )
    .join("");
}

function renderAssetTabs() {
  const tabs = document.getElementById("asset-tabs");
  tabs.innerHTML = marketData.assetGroups
    .map(
      (group) => `
        <button class="tab ${group.id === activeAssetId ? "active" : ""}" data-asset="${group.id}" type="button">
          ${group.label}
        </button>
      `,
    )
    .join("");

  tabs.querySelectorAll("[data-asset]").forEach((button) => {
    button.addEventListener("click", () => {
      activeAssetId = button.dataset.asset;
      renderAssetTabs();
      renderAssetPanel();
    });
  });
}

function directionBadge(direction) {
  if (direction === "up") return "up";
  if (direction === "down") return "down";
  return "neutral";
}

function trendBadge(status) {
  const lowered = status.toLowerCase();
  if (lowered.includes("압박") || lowered.includes("약세") || lowered.includes("경계")) return "down";
  if (lowered.includes("강세") || lowered.includes("완화")) return "up";
  return "neutral";
}

function renderAssetPanel() {
  const group = assetLookup.get(activeAssetId);
  const panel = document.getElementById("asset-panel");
  if (!group) {
    panel.innerHTML = "";
    return;
  }

  panel.innerHTML = `
    <article class="asset-card">
      <div class="asset-head">
        <div class="asset-title">
          <h3>${escapeHtml(group.title)}</h3>
          <small>${escapeHtml(group.summary)}</small>
        </div>
        <span class="badge ${trendBadge(group.status)}">${escapeHtml(group.status)}</span>
      </div>
      <div class="asset-body">
        <div>
          ${group.items
            .map(
              (item) => `
                <div class="metric-row">
                  <span>${escapeHtml(item.name)}</span>
                  <strong>${escapeHtml(item.value)}</strong>
                  <span class="mini-tag ${directionBadge(item.direction)}">${escapeHtml(item.change)}</span>
                </div>
              `,
            )
            .join("")}
        </div>
        <div>
          ${sparkline(group.trend, group.status === "압박" || group.status === "약세" ? "#f8b26a" : "#7dd3fc")}
          <p class="asset-note">${escapeHtml(group.conclusion)}</p>
        </div>
      </div>
    </article>
  `;
}

function renderActions() {
  const stack = document.getElementById("action-stack");
  const chosenActions = marketView?.recommendations?.length ? marketView.recommendations : marketData.actions.slice(0, 3);

  stack.innerHTML = chosenActions
    .map(
      (action) => `
        <article class="action-card">
          <div>
            <strong>${escapeHtml(action.state)}</strong>
            <div class="issue-meta">${escapeHtml(action.rule)}</div>
            <div class="tag-row">
              <span class="tag mid">대응 템플릿</span>
            </div>
          </div>
          <p class="section-note">${escapeHtml(action.detail)}</p>
        </article>
      `,
    )
    .join("");
}

function renderDecisionPanel() {
  const panel = document.getElementById("decision-grid");
  if (!marketView) {
    panel.innerHTML = "";
    return;
  }

  panel.innerHTML = `
    <article class="decision-card">
      <div class="decision-label">시장 레짐</div>
      <p class="decision-value">${escapeHtml(marketView.regime)}</p>
      <p class="decision-note">${escapeHtml(marketView.summary)}</p>
      <div class="confidence-bar" aria-hidden="true">
        <div class="confidence-fill" style="width: ${marketView.confidence}%"></div>
      </div>
      <p class="decision-note">신뢰도 ${marketView.confidence}%</p>
    </article>

    <article class="decision-card">
      <div class="decision-label">판정 근거</div>
      <ul class="decision-list">
        ${marketView.factors
          .map((factor) => `<li>${escapeHtml(factor.label)}: ${escapeHtml(factor.value)} - ${escapeHtml(factor.note)}</li>`)
          .join("")}
      </ul>
    </article>

    <article class="decision-card wide">
      <div class="decision-label">오늘의 대응 우선순위</div>
      <ul class="decision-list">
        ${marketView.watchlist.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
      </ul>
    </article>
  `;
}

function renderHeader() {
  document.getElementById("brief-date").textContent = formatDate(marketData.date);
  document.getElementById("market-state").textContent = marketView?.regime || marketData.signals[0].value;
  document.getElementById("top-line").textContent =
    marketView?.summary || marketData.topLine;
  document.getElementById("fetch-note").textContent =
    `갱신 시각: ${new Date(marketData.collectedAt).toLocaleString("ko-KR")}`;

  const freshnessGrid = document.getElementById("freshness-grid");
  const freshness = marketData.freshness || {};
  freshnessGrid.innerHTML = Object.entries(freshness)
    .map(
      ([label, value]) => `
        <div class="freshness-item">
          <div class="label">${label}</div>
          <div class="value">${value}</div>
        </div>
      `,
    )
    .join("");
}

function renderVerifyPanel() {
  const panel = document.getElementById("verify-panel");
  const source = marketData.source || {};
  const freshness = marketData.freshness || {};
  const freshnessSummary = Object.entries(freshness)
    .map(([label, value]) => `${label}: ${value}`)
    .join(" · ");
  const isLive = source.mode === "live";
  const isStatic = source.mode === "static";

  panel.innerHTML = `
    <div class="title">Data Verify</div>
    <div class="value">${isLive ? "Live feed" : isStatic ? "Static sample" : "Fallback sample"}</div>
    <div class="meta">
      Source: ${source.provider || "Unknown"}<br />
      Mode: ${source.mode || "unknown"}<br />
      Collected: ${marketData.collectedAt ? new Date(marketData.collectedAt).toLocaleString("ko-KR") : "N/A"}<br />
      Date: ${marketData.date || "N/A"}<br />
      Freshness: ${freshnessSummary || "N/A"}${source.note ? `<br />Note: ${source.note}` : ""}
    </div>
  `;
}

function renderAll() {
  renderSignals();
  renderIssues();
  renderNews();
  renderCriteria();
  renderAssetTabs();
  renderAssetPanel();
  renderDecisionPanel();
  renderActions();
  renderHeader();
  renderVerifyPanel();
}

async function loadMarketData() {
  if (IS_STATIC_HOST) {
    const sampleResponse = await fetch(SAMPLE_DATA_SOURCE_URL, { cache: "no-store" });
    if (!sampleResponse.ok) {
      throw new Error(`Failed to load static sample ${SAMPLE_DATA_SOURCE_URL}: ${sampleResponse.status}`);
    }
    const sampleData = await sampleResponse.json();
    sampleData.source = {
      provider: "GitHub Pages sample",
      mode: "static",
      note: "Static hosting does not expose the live /api route.",
    };
    return sampleData;
  }

  try {
    const liveResponse = await fetch(LIVE_DATA_SOURCE_URL, { cache: "no-store" });
    if (!liveResponse.ok) {
      throw new Error(`Failed to load ${LIVE_DATA_SOURCE_URL}: ${liveResponse.status}`);
    }
    return liveResponse.json();
  } catch (liveError) {
    const sampleResponse = await fetch(SAMPLE_DATA_SOURCE_URL, { cache: "no-store" });
    if (!sampleResponse.ok) {
      throw new Error(
        `Failed to load fallback sample ${SAMPLE_DATA_SOURCE_URL}: ${sampleResponse.status}; live error: ${liveError.message}`,
      );
    }
    const sampleData = await sampleResponse.json();
    sampleData.source = {
      provider: "Sample data",
      mode: "fallback",
      note: liveError.message,
    };
    return sampleData;
  }
}

async function init() {
  const refreshButton = document.getElementById("refresh-btn");
  const verifyButton = document.getElementById("verify-btn");
  if (IS_STATIC_HOST) {
    verifyButton.textContent = "Verify Sample";
  }

  const applyData = (data, note) => {
    setMarketData(data);
    renderAll();
    const source = marketData.source?.provider || "Unknown source";
    const mode = marketData.source?.mode || "unknown";
    document.getElementById("fetch-note").textContent = `${note} · ${source} (${mode})`;
  };

  try {
    const data = await loadMarketData();
    applyData(
      data,
      `로드 완료: ${new Date(data.collectedAt).toLocaleString("ko-KR")}`,
    );
  } catch (error) {
    applyData(
      fallbackMarketData,
      `샘플 데이터 사용 중: ${error.message}`,
    );
  }

  refreshButton.addEventListener("click", async () => {
    refreshButton.disabled = true;
    refreshButton.textContent = "Refreshing";

    try {
      const data = await loadMarketData();
      applyData(
        data,
        `갱신 완료: ${new Date(data.collectedAt).toLocaleString("ko-KR")}`,
      );
    } catch (error) {
      applyData(
        fallbackMarketData,
        `갱신 실패, 샘플 데이터 유지: ${error.message}`,
      );
    } finally {
      refreshButton.disabled = false;
      refreshButton.textContent = "Refresh";
    }
  });

  verifyButton.addEventListener("click", async () => {
    verifyButton.disabled = true;
    verifyButton.textContent = IS_STATIC_HOST ? "Verifying" : "Verifying";

    try {
      const data = await loadMarketData();
      const mode = data.source?.mode || "unknown";
      const provider = data.source?.provider || "Unknown source";
      applyData(
        data,
        `verify: ${provider} (${mode}) · ${new Date(data.collectedAt).toLocaleString("ko-KR")}`,
      );
    } catch (error) {
      applyData(
        fallbackMarketData,
        `verify 실패, 샘플 데이터 유지: ${error.message}`,
      );
    } finally {
      verifyButton.disabled = false;
      verifyButton.textContent = IS_STATIC_HOST ? "Verify Sample" : "Verify Live";
    }
  });
}

document.addEventListener("DOMContentLoaded", init);
