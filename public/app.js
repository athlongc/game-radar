const pageTitleEl = document.querySelector("#pageTitle");
const pageSubtitleEl = document.querySelector("#pageSubtitle");
const pageNavEl = document.querySelector("#pageNav");
const summaryEl = document.querySelector("#summary");
const monitorListEl = document.querySelector("#monitorList");
const statusEl = document.querySelector("#status");
const refreshButton = document.querySelector("#refreshButton");

const numberFormatter = new Intl.NumberFormat("zh-CN");
const compactNumberFormatter = new Intl.NumberFormat("zh-CN", {
  maximumFractionDigits: 2,
  notation: "compact"
});
const dateFormatter = new Intl.DateTimeFormat("zh-CN", {
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit"
});
const PUBLIC_DASHBOARD_ID = "heartopia";
const IOS_FREE_RANK_GROUP_COUNTRIES = ["cn", "tw", "kr", "th"];
const IOS_FREE_RANK_GROUP_LABELS = {
  cn: "中国",
  tw: "台湾",
  kr: "韩国",
  th: "泰国"
};
const COUNTRY_LABELS = {
  cn: "中国",
  tw: "台湾",
  kr: "韩国",
  th: "泰国",
  jp: "日本",
  us: "美国",
  fr: "法国",
  br: "巴西"
};

let currentMetrics = null;

function isLocalHost() {
  return location.hostname === "localhost" || location.hostname === "127.0.0.1" || location.hostname === "::1";
}

function canForceRefresh() {
  return isLocalHost() || currentMetrics?.dashboards?.[0]?.id === PUBLIC_DASHBOARD_ID;
}

function getMetricsUrl(force = false) {
  const params = new URLSearchParams();
  if (!isLocalHost()) {
    params.set("dashboard", PUBLIC_DASHBOARD_ID);
  }
  if (force && canForceRefresh()) {
    params.set("force", "1");
  }
  const query = params.toString();
  return `/api/metrics${query ? `?${query}` : ""}`;
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }
  return response.json();
}

function formatNumber(value) {
  if (value === null || value === undefined) return "暂无";
  return numberFormatter.format(value);
}

function formatWan(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return "暂无";
  const wan = Number(value) / 10000;
  return wan >= 1000 ? `${Math.round(wan)}万` : `${wan.toFixed(1)}万`;
}

function formatMarketCapCny(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "暂无";
  const yi = Number(value) / 100000000;
  return yi >= 1000 ? `${Math.round(yi).toLocaleString("zh-CN")}亿` : `${yi.toFixed(2)}亿`;
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function safeExternalUrl(value = "") {
  try {
    const url = new URL(String(value));
    return url.protocol === "http:" || url.protocol === "https:" ? escapeHtml(url.href) : "";
  } catch {
    return "";
  }
}

function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isTodayDate(value = "") {
  return String(value).slice(0, 10) === getLocalDateKey();
}

function getAmazonMarketTargetId(market) {
  const country = String(market?.country || market?.label || "market")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `amazon-market-${country || "market"}`;
}

function formatRank(rank, limit = 100) {
  if (!rank) return `>${limit}`;
  return `#${rank}`;
}

function getSteamTopSeller(dashboard, country = "global") {
  const normalizedCountry = String(country || "global").toLowerCase();
  return (dashboard.steamTopSellers?.markets || []).find((market) => market.country === normalizedCountry) || null;
}

function formatSteamTopSellerRank(market) {
  if (!market) return "暂无";
  if (market.error) return "暂无";
  return formatRank(market.rank, market.topLimit || 100);
}

function getRankComparisonTone(primaryRank, comparisonRank) {
  const normalizeRank = (rank) => {
    if (rank === null || rank === undefined || rank === "") return null;
    const value = Number(rank);
    return Number.isFinite(value) && value > 0 ? value : null;
  };
  const primary = normalizeRank(primaryRank);
  const comparison = normalizeRank(comparisonRank);
  if (primary === null && comparison === null) return "";
  if (primary !== null && comparison === null) return "comparison-leading";
  if (primary === null && comparison !== null) return "comparison-trailing";
  if (primary < comparison) return "comparison-leading";
  if (primary > comparison) return "comparison-trailing";
  return "";
}

function formatPrice(value, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(value)) return "暂无";
  return Number(value).toFixed(digits);
}

function formatExchangeRate(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return "暂无";
  return Number(value).toFixed(4);
}

function formatPercent(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return "暂无";
  return `${value > 0 ? "+" : ""}${Number(value).toFixed(2)}%`;
}

function formatChange(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return "暂无";
  return `${value > 0 ? "+" : ""}${Number(value).toFixed(3)}`;
}

function formatTime(value) {
  if (!value) return "未知";
  return dateFormatter.format(new Date(value));
}

function getCurrentDashboard(metrics) {
  const id = decodeURIComponent(location.hash.replace(/^#/, ""));
  return metrics.dashboards.find((dashboard) => dashboard.id === id) || metrics.dashboards[0];
}

function render(metrics) {
  const dashboard = getCurrentDashboard(metrics);
  pageTitleEl.textContent = dashboard.title;
  pageSubtitleEl.textContent = dashboard.subtitle || "实时榜单";
  renderNav(metrics.dashboards, dashboard.id);
  renderSummary(dashboard);
  renderMonitorList(dashboard);
}

function renderNav(dashboards, activeId) {
  if (dashboards.length <= 1) {
    pageNavEl.innerHTML = "";
    return;
  }
  pageNavEl.innerHTML = dashboards
    .map(
      (dashboard) => `
        <a class="nav-link ${dashboard.id === activeId ? "active" : ""}" href="#${dashboard.id}">
          ${dashboard.title}
        </a>
      `
    )
    .join("");
}

function buildRankSummaryCard(dashboard, listing, rank, index) {
  const comparisonRank = listing.comparison?.ranks?.[index];
  const steamTopSeller = getSteamTopSeller(dashboard, listing.country);
  return {
    type: "rank",
    label: rank.label,
    value: formatRank(rank.rank, rank.topLimit),
    note: listing.label,
    url: rank.externalUrl || "",
    comparison: comparisonRank
      ? {
          label: listing.comparison.label,
          value: formatRank(comparisonRank.rank, comparisonRank.topLimit),
          tone: getRankComparisonTone(rank.rank, comparisonRank.rank)
        }
      : steamTopSeller
      ? {
          label: `Steam ${steamTopSeller.displayCode || listing.country.toUpperCase()}`,
          value: formatSteamTopSellerRank(steamTopSeller),
          tone: "steam-comparison",
          note: steamTopSeller.error || ""
        }
      : null
  };
}

function isIosFreeGameRank(dashboard, listing, rank) {
  return (
    dashboard.id === PUBLIC_DASHBOARD_ID &&
    rank.key === "freeGames" &&
    IOS_FREE_RANK_GROUP_COUNTRIES.includes(listing.country)
  );
}

function buildIosFreeRankGroupCard(dashboard) {
  if (dashboard.id !== PUBLIC_DASHBOARD_ID) return null;

  const items = IOS_FREE_RANK_GROUP_COUNTRIES.map((country) => {
    const listing = (dashboard.apple || []).find((item) => item.country === country);
    const rank = listing?.ranks?.find((item) => item.key === "freeGames");
    if (!listing || !rank) return null;
    return {
      label: IOS_FREE_RANK_GROUP_LABELS[country] || listing.label,
      note: listing.label,
      value: formatRank(rank.rank, rank.topLimit),
      url: rank.externalUrl || "",
      error: rank.error || ""
    };
  }).filter(Boolean);

  if (!items.length) return null;

  return {
    type: "iosFreeRankGroup",
    label: "iOS 免费游戏榜",
    items
  };
}

function renderOverviewCard({ className = "", url = "", body = "" }) {
  const safeUrl = safeExternalUrl(url);
  const classes = ["overview-kpi-card", className, safeUrl ? "overview-kpi-link" : ""].filter(Boolean).join(" ");
  if (safeUrl) {
    return `<a class="${classes}" href="${safeUrl}" target="_blank" rel="noreferrer">${body}</a>`;
  }
  return `<article class="${classes}">${body}</article>`;
}

function renderMatrixValue(value, url = "", className = "") {
  const safeUrl = safeExternalUrl(url);
  const content = `<span class="region-rank-value ${className}">${escapeHtml(value)}</span>`;
  return safeUrl
    ? `<a class="region-rank-link" href="${safeUrl}" target="_blank" rel="noreferrer">${content}</a>`
    : content;
}

function renderHeartopiaRegionRow(dashboard, listing, sharedIosRankUrl = "") {
  const freeRank = listing.ranks?.find((rank) => rank.key === "freeGames") || null;
  const grossingRank = listing.ranks?.find((rank) => rank.key === "grossingGames") || null;
  const steamRank = getSteamTopSeller(dashboard, listing.country);
  const freeRankUrl = listing.country === "cn" ? freeRank?.externalUrl || "" : sharedIosRankUrl;
  const grossingRankUrl = listing.country === "cn" ? grossingRank?.externalUrl || "" : sharedIosRankUrl;
  const hasError = Boolean(
    listing.lookup?.error || freeRank?.error || grossingRank?.error || steamRank?.error
  );
  const freeValue = freeRank ? (freeRank.error ? "暂无" : formatRank(freeRank.rank, freeRank.topLimit)) : "—";
  const grossingValue = grossingRank
    ? grossingRank.error
      ? "暂无"
      : formatRank(grossingRank.rank, grossingRank.topLimit)
    : "—";
  const steamValue = steamRank
    ? steamRank.error
      ? "暂无"
      : formatSteamTopSellerRank(steamRank)
    : "—";
  const countryLabel = COUNTRY_LABELS[listing.country] || listing.label.replace(/\s*iOS$/i, "");

  return `
    <tr>
      <th scope="row">
        <span class="region-country">${escapeHtml(countryLabel)}</span>
        <span class="region-code">${escapeHtml(listing.country.toUpperCase())}</span>
      </th>
      <td data-label="iOS 畅销游戏榜">
        ${renderMatrixValue(grossingValue, grossingRankUrl, grossingValue === "—" ? "region-rank-empty" : "")}
      </td>
      <td data-label="iOS 免费游戏榜">
        ${renderMatrixValue(freeValue, freeRankUrl, freeValue === "—" ? "region-rank-empty" : "")}
      </td>
      <td data-label="Steam 畅销榜">
        <span class="steam-market-code">${steamRank ? `Steam ${escapeHtml(steamRank.displayCode || listing.country.toUpperCase())}` : "Steam"}</span>
        ${renderMatrixValue(steamValue, steamRank?.url || "", steamValue === "—" ? "region-rank-empty" : "region-rank-steam")}
      </td>
      <td class="region-status-cell" data-label="状态">
        <span class="region-status ${hasError ? "has-error" : ""}">
          <span class="region-status-dot" aria-hidden="true"></span>
          ${hasError ? "部分异常" : "监控中"}
        </span>
      </td>
    </tr>
  `;
}

function renderHeartopiaSummary(dashboard) {
  const stock = dashboard.stockQuote || {};
  const tapTap = dashboard.tapTap || {};
  const globalSteam = getSteamTopSeller(dashboard, "global");
  const stockClass = stock.change > 0 ? "up" : stock.change < 0 ? "down" : "";
  const preferredCountryOrder = ["cn", "tw", "kr", "th", "jp", "us", "fr", "br"];
  const listings = preferredCountryOrder
    .map((country) => (dashboard.apple || []).find((listing) => listing.country === country))
    .filter(Boolean);
  const japanListing = listings.find((listing) => listing.country === "jp");
  const sharedIosRankUrl = japanListing?.ranks?.find((rank) => rank.key === "grossingGames")?.externalUrl || "";

  const steamCard = renderOverviewCard({
    className: "overview-steam-card",
    url: dashboard.steamExternalUrl || "",
    body: `
      <div class="overview-steam-primary">
        <div>
          <div class="metric-label">Steam 当前在线</div>
          <div class="overview-value">${formatNumber(dashboard.steam?.currentPlayers)}</div>
          <div class="metric-note">AppID ${escapeHtml(dashboard.steam?.appId || "-")}</div>
        </div>
        <div>
          <div class="metric-label">Steam 好评率</div>
          <div class="overview-value">${dashboard.steamReviews?.positiveRate == null ? "暂无" : `${dashboard.steamReviews.positiveRate}%`}</div>
          <div class="metric-note">${escapeHtml(dashboard.steamReviews?.reviewScoreDesc || "评价")} · ${formatNumber(dashboard.steamReviews?.totalReviews)} 条</div>
        </div>
      </div>
      <div class="overview-steam-global">
        <div>
          <strong>Steam 全球畅销</strong>
          <span>${escapeHtml(globalSteam?.displayCode || "Global")}</span>
        </div>
        <b>${escapeHtml(formatSteamTopSellerRank(globalSteam))}</b>
      </div>
    `
  });

  const stockCard = renderOverviewCard({
    className: "overview-stock-card",
    url: stock.externalUrl || "",
    body: `
      <div class="metric-label">${escapeHtml(stock.label || stock.symbol || "公司股价")}</div>
      ${
        stock.error
          ? `<div class="overview-value outside">暂无</div><div class="metric-note">${escapeHtml(stock.error)}</div>`
          : `<div class="overview-value">${escapeHtml(stock.currency || "HKD")} ${formatPrice(stock.price)}</div>
             <div class="overview-change ${stockClass}">${formatChange(stock.change)} / ${formatPercent(stock.changePercent)}</div>
             <div class="overview-market-cap">市值 人民币 ${formatMarketCapCny(stock.marketCapCny)}</div>
             <div class="metric-note">延迟行情 · ${escapeHtml(stock.quoteTime || "未知时间")} · 量 ${compactNumberFormatter.format(stock.volume || 0)}</div>`
      }
    `
  });

  const tapTapCard = renderOverviewCard({
    className: "overview-taptap-card",
    url: tapTap.url || "",
    body: `
      <div class="metric-label">${escapeHtml(tapTap.label || "TapTap")}</div>
      ${
        tapTap.error
          ? `<div class="overview-value outside">暂无</div><div class="metric-note">${escapeHtml(tapTap.error)}</div>`
          : `<div class="overview-taptap-grid">
              <div><b>${formatWan(tapTap.downloadCount)}</b><span>总下载量</span></div>
              <div><b>${tapTap.rating == null ? "暂无" : escapeHtml(tapTap.rating)}</b><span>${tapTap.ratingCount == null ? "评分" : `${formatWan(tapTap.ratingCount)}评分`}</span></div>
              <div><b>${escapeHtml(tapTap.downloadRank || "暂无")}</b><span>热门下载榜</span></div>
            </div>`
      }
    `
  });

  return `
    <div class="overview-kpi-grid">
      ${steamCard}
      ${stockCard}
      ${tapTapCard}
    </div>
    <section class="region-matrix-panel" aria-labelledby="regionMatrixTitle">
      <div class="region-matrix-heading">
        <div>
          <p class="section-kicker">Market comparison</p>
          <h2 id="regionMatrixTitle">地区榜单对比</h2>
        </div>
        <span>iOS 与 Steam 当前排名</span>
      </div>
      <div class="region-matrix-scroll">
        <table class="region-matrix-table">
          <caption>心动小镇各地区 iOS 与 Steam 排名对比</caption>
          <thead>
            <tr>
              <th scope="col">地区</th>
              <th scope="col">iOS 畅销游戏榜</th>
              <th scope="col">iOS 免费游戏榜</th>
              <th scope="col">Steam 畅销榜</th>
              <th scope="col">状态</th>
            </tr>
          </thead>
          <tbody>${listings.map((listing) => renderHeartopiaRegionRow(dashboard, listing, sharedIosRankUrl)).join("")}</tbody>
        </table>
      </div>
      <p class="region-matrix-note">榜单仅显示 Top 100，“&gt;100”表示未进入 Top 100。点击排名可查看可用的数据源。</p>
    </section>
  `;
}

function renderSummary(dashboard) {
  const isHeartopia = dashboard.id === PUBLIC_DASHBOARD_ID;
  summaryEl.classList.toggle("heartopia-summary", isHeartopia);
  if (isHeartopia) {
    summaryEl.innerHTML = renderHeartopiaSummary(dashboard);
    return;
  }

  const iosFreeRankGroupCard = buildIosFreeRankGroupCard(dashboard);
  const rankCards = (dashboard.apple || []).flatMap((listing) =>
    listing.ranks
      .map((rank, index) => ({ rank, index }))
      .filter(({ rank }) => !isIosFreeGameRank(dashboard, listing, rank))
      .map(({ rank, index }) => buildRankSummaryCard(dashboard, listing, rank, index))
  );
  if (iosFreeRankGroupCard) {
    rankCards.unshift(iosFreeRankGroupCard);
  }
  const amazonCards = (dashboard.amazon || []).map((market) => {
    const top = market.leaders?.[0];
    const navimowItems = (market.leaders || [])
      .filter((item) => /segway|navimow/i.test(item.title || ""))
      .map((item) => ({
        rank: item.rank,
        title: item.title
      }));
    return {
      type: "amazon",
      label: market.label,
      value: top ? "#1" : "暂无",
      note: top ? getShortProductName(top.title) : market.error || "暂无数据",
      navimowItems,
      targetId: getAmazonMarketTargetId(market)
    };
  });

  const cards = dashboard.steam
    ? [
        {
          type: "steam",
          online: formatNumber(dashboard.steam.currentPlayers),
          positiveRate: dashboard.steamReviews?.positiveRate == null ? "暂无" : `${dashboard.steamReviews.positiveRate}%`,
          reviewNote: `${dashboard.steamReviews?.reviewScoreDesc || "评价"} · ${formatNumber(dashboard.steamReviews?.totalReviews)} 条`,
          note: `AppID ${dashboard.steam.appId || "-"}`,
          topSeller: getSteamTopSeller(dashboard, "global"),
          url: dashboard.steamExternalUrl || ""
        },
        ...rankCards
      ]
    : [...rankCards, ...amazonCards];

  if (dashboard.stockQuote) {
    cards.splice(dashboard.steam ? 1 : 0, 0, {
      type: "stock",
      label: dashboard.stockQuote.label || dashboard.stockQuote.symbol,
      price: `${dashboard.stockQuote.currency || "HKD"} ${formatPrice(dashboard.stockQuote.price)}`,
      change: `${formatChange(dashboard.stockQuote.change)} / ${formatPercent(dashboard.stockQuote.changePercent)}`,
      marketCap: formatMarketCapCny(dashboard.stockQuote.marketCapCny),
      quoteTime: dashboard.stockQuote.quoteTime || "未知时间",
      volume: compactNumberFormatter.format(dashboard.stockQuote.volume || 0),
      isUp: dashboard.stockQuote.change > 0,
      isDown: dashboard.stockQuote.change < 0,
      url: dashboard.stockQuote.externalUrl || "",
      error: dashboard.stockQuote.error
    });
  }

  if (dashboard.tapTap) {
    cards.splice(dashboard.steam && dashboard.stockQuote ? 2 : dashboard.stockQuote ? 1 : 0, 0, {
      type: "taptap",
      label: dashboard.tapTap.label || "TapTap",
      downloads: formatWan(dashboard.tapTap.downloadCount),
      rating: dashboard.tapTap.rating == null ? "暂无" : `${dashboard.tapTap.rating}`,
      rank: dashboard.tapTap.downloadRank || "暂无",
      note: dashboard.tapTap.ratingCount == null ? "评分" : `${formatWan(dashboard.tapTap.ratingCount)}评分`,
      url: dashboard.tapTap.url || "",
      error: dashboard.tapTap.error
    });
  }

  if (dashboard.exchangeRates) {
    const exchangeRateCard = {
      type: "exchangeRates",
      ...dashboard.exchangeRates
    };
    const exchangeRateIndex = dashboard.id === "ninebot-cn" && cards.length > 6 ? 6 : cards.length;
    cards.splice(exchangeRateIndex, 0, exchangeRateCard);
  }

  summaryEl.innerHTML = cards
    .map((card) => {
      if (card.type === "steam") {
        return renderMetricShell(
          card,
          `
          <div class="steam-metric">
            <div>
              <div class="metric-label">Steam 当前在线</div>
              <div class="metric-value">${card.online}</div>
              <div class="metric-note">${card.note}</div>
            </div>
            <div>
              <div class="metric-label">Steam 好评率</div>
              <div class="metric-value">${card.positiveRate}</div>
              <div class="metric-note">${card.reviewNote}</div>
            </div>
          </div>
          <div class="steam-topseller-strip">
            <div>
              <div class="steam-topseller-label">Steam 全球畅销</div>
              <div class="metric-note">${escapeHtml(card.topSeller?.displayCode || "Global")}</div>
            </div>
            <div class="steam-topseller-value">${escapeHtml(formatSteamTopSellerRank(card.topSeller))}</div>
          </div>
        `,
          "steam-metric-card"
        );
      }

      if (card.type === "stock") {
        return renderMetricShell(
          card,
          `
          <div class="metric-label">${card.label}</div>
          ${
            card.error
              ? `<div class="metric-value outside">暂无</div><div class="metric-note">${card.error}</div>`
              : `<div class="metric-value">${card.price}</div>
                 <div class="metric-note stock-change ${card.isUp ? "up" : ""} ${card.isDown ? "down" : ""}">
                   ${card.change}
                 </div>
                 <div class="metric-note stock-market-cap">市值 人民币 ${card.marketCap}</div>
                 <div class="metric-note">延迟行情 · ${card.quoteTime} · 量 ${card.volume}</div>`
          }
        `
        );
      }

      if (card.type === "taptap") {
        return renderMetricShell(
          card,
          `
          <div class="metric-label">${escapeHtml(card.label)}</div>
          ${
            card.error
              ? `<div class="metric-value outside">暂无</div><div class="metric-note">${escapeHtml(card.error)}</div>`
              : `<div class="taptap-metrics">
                  <div>
                    <div class="taptap-value">${escapeHtml(card.downloads)}</div>
                    <div class="metric-note">总下载量</div>
                  </div>
                  <div>
                    <div class="taptap-value">${escapeHtml(card.rating)}</div>
                    <div class="metric-note">${escapeHtml(card.note)}</div>
                  </div>
                  <div>
                    <div class="taptap-value">${escapeHtml(card.rank)}</div>
                    <div class="metric-note">热门下载榜</div>
                  </div>
                </div>`
          }
        `,
          "taptap-metric-card"
        );
      }

      if (card.type === "amazon") {
        return `
        <article class="metric-card amazon-summary-card" role="button" tabindex="0" data-amazon-target="${escapeHtml(card.targetId)}" aria-label="查看${escapeHtml(card.label)}排名">
          <div class="metric-label">${escapeHtml(card.label)}</div>
          <div class="amazon-summary-ranks">
            <div>
              <div class="metric-value">${escapeHtml(card.value)}</div>
              <div class="metric-note">榜首</div>
            </div>
            <div class="amazon-navimow-rank">
              <div class="comparison-label">Segway Navimow</div>
              ${
                card.navimowItems.length
                  ? `<div class="amazon-navimow-list">
                      ${card.navimowItems.map(renderAmazonSummaryNavimowItem).join("")}
                    </div>`
                  : `<div class="comparison-value">${formatRank(null, 10)}</div>`
              }
            </div>
          </div>
          <div class="metric-note amazon-summary-note">${escapeHtml(card.note)}</div>
        </article>
      `;
      }

      if (card.type === "iosFreeRankGroup") {
        return `
        <article class="metric-card ios-free-rank-card">
          <div class="metric-label">${escapeHtml(card.label)}</div>
          <div class="ios-free-rank-grid">
            ${card.items.map(renderIosFreeRankItem).join("")}
          </div>
        </article>
      `;
      }

      if (card.type === "exchangeRates") {
        return `
        <article class="metric-card exchange-rate-card">
          <div class="metric-label">${escapeHtml(card.label || "人民币汇率中间价")}</div>
          ${
            card.error
              ? `<div class="metric-value outside">暂无</div><div class="metric-note">${escapeHtml(card.error)}</div>`
              : `<div class="exchange-rate-grid">
                  ${(card.items || []).map(renderExchangeRateItem).join("")}
                </div>
                <div class="metric-note">当日 ${escapeHtml(card.latestDate || "未知")} · 上季末 ${escapeHtml(card.quarterBaseDate || "未知")} · ${escapeHtml(card.source || "")}</div>`
          }
        </article>
      `;
      }

      return renderMetricShell(
        card,
        `
          <div class="metric-label">${card.label}</div>
          ${
            card.comparison
              ? `<div class="rank-comparison">
                   <div>
                     <div class="metric-value">${card.value}</div>
                     <div class="metric-note">${card.note}</div>
                   </div>
                   <div class="comparison-metric">
                     <div class="comparison-label ${card.comparison.tone || ""}">${card.comparison.label}</div>
                     <div class="comparison-value">${card.comparison.value}</div>
                   </div>
                 </div>`
              : `<div class="metric-value">${card.value}</div>
                 <div class="metric-note">${card.note}</div>`
          }
        `,
        card.comparison ? "rank-comparison-card" : ""
      );
    })
    .join("");
}

function renderIosFreeRankItem(item) {
  const innerHtml = `
    <span class="ios-free-rank-country">${escapeHtml(item.label)}</span>
    <span class="ios-free-rank-value">${escapeHtml(item.error ? "暂无" : item.value)}</span>
  `;
  if (item.url) {
    return `<a class="ios-free-rank-item" href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">${innerHtml}</a>`;
  }
  return `<div class="ios-free-rank-item">${innerHtml}</div>`;
}

function renderExchangeRateItem(item) {
  const change = item.kind === "offshoreSpot" ? item.changePercent : item.quarterChangePercent;
  const isUp = change > 0;
  const isDown = change < 0;
  return `
    <div class="exchange-rate-item">
      <div>
        <div class="exchange-rate-code">${escapeHtml(item.code || "")}</div>
        <div class="exchange-rate-name">${escapeHtml(item.label || "")}</div>
      </div>
      <div>
        <div class="exchange-rate-value">${formatExchangeRate(item.value)}</div>
        <div class="metric-note stock-change ${isUp ? "up" : ""} ${isDown ? "down" : ""}">
          ${escapeHtml(item.changeLabel || "涨跌幅")} ${formatPercent(change)}
        </div>
      </div>
    </div>
  `;
}

function renderMetricShell(card, innerHtml, extraClass = "") {
  const className = ["metric-card", extraClass, card.url ? "metric-link-card" : ""].filter(Boolean).join(" ");
  if (card.url) {
    return `<a class="${className}" href="${escapeHtml(card.url)}" target="_blank" rel="noreferrer">${innerHtml}</a>`;
  }
  return `<article class="${className}">${innerHtml}</article>`;
}

function getShortProductName(title = "") {
  const normalized = title.replace(/\s+/g, " ").trim();
  const brand = getProductBrand(normalized);
  const model = getProductModel(normalized, brand);
  const name = [brand, model].filter(Boolean).join(" ");
  return name || normalized.split(/[,:，-]/)[0].slice(0, 28);
}

function getProductBrand(title = "") {
  const match = title.match(
    /\b(MAMMOTION|Segway\s+Navimow|Navimow|ECOVACS|MOVA|DREAME|WORX|Landroid|LawnMaster|Gardena|Bosch|eufy|ANTHBOT|Sunseeker|STIGA|YARDCARE|RoboUP|Husqvarna)\b/i
  );
  if (!match) return "";
  const value = match[1].replace(/\s+/g, " ");
  if (/segway\s+navimow/i.test(value)) return "Segway Navimow";
  if (/landroid/i.test(value)) return "WORX";
  return value.toUpperCase() === value ? value : value.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getProductModel(title = "", brand = "") {
  const patterns = [
    /\bLUBA\s*(?:Mini\s*)?(?:\d\s*)?(?:AWD\s*)?(?:LiDAR\s*)?\d{0,4}\b/i,
    /\bYUKA\s*(?:Mini\s*)?(?:\d\s*)?\d{0,4}\b/i,
    /\bi\d{3}[A-Z]?\b/i,
    /\bX\d{3}\b/i,
    /\bGOAT\s*[A-Z]?\d{3,4}\s*(?:RTK|LiDAR|PRO)?\b/i,
    /\bA1\s*Pro\b/i,
    /\bMOVA\s*(?:ViAX|LiDAX)?\s*(?:Ultra)?\s*\d{3,4}\s*(?:AWD)?\b/i,
    /\bWR\d{3}[A-Z]?(?:\.\d)?\b/i,
    /\bLandroid\s*(?:Vision|Classic)?\s*[A-Z]?\d{3,4}\b/i,
    /\bOcuMow(?:16)?\b/i,
    /\bVBRM\d+\b/i,
    /\bSileno\s*(?:minimo|city|life|Sense)?\s*\d{0,4}\b/i,
    /\bVISIMOW\d*V?-?\d+\b/i,
    /\bE\d{2}\b/i,
    /\bGenie\d+\b/i,
    /\bV\d{2,4}\b/i,
    /\bRaccoon\s*\d*\s*(?:SE)?\b/i
  ];
  const found = patterns.map((pattern) => title.match(pattern)?.[0]).find(Boolean);
  if (!found) return "";
  const cleaned = found.replace(/\s+/g, " ").trim();
  const brandPattern = new RegExp(`^${brand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s+`, "i");
  return cleaned.replace(brandPattern, "");
}

function renderAmazonSummaryNavimowItem(item) {
  return `
    <div class="amazon-navimow-chip">
      <strong>${formatRank(item.rank, 10)}</strong>
      <span>${escapeHtml(getProductModel(item.title, getProductBrand(item.title)) || getShortProductName(item.title))}</span>
    </div>
  `;
}

function renderMonitorList(dashboard) {
  if (dashboard.amazon?.length) {
    renderAmazonMonitorList(dashboard);
    return;
  }

  if (dashboard.researchReports) {
    renderResearchMonitorList(dashboard);
    return;
  }

  if (dashboard.newsroom) {
    renderNewsroomMonitorList(dashboard);
    return;
  }

  if (!dashboard.steam) {
    monitorListEl.innerHTML = "";
    return;
  }

  const gameCardHtml = `
    <article class="game-card">
      <div class="game-head">
        <div>
          <h3>${dashboard.title}</h3>
          <p class="publisher">${dashboard.publisher || ""}</p>
        </div>
        ${
          dashboard.steam
            ? `<div class="steam-pills">
                <div class="steam-pill">Steam ${formatNumber(dashboard.steam.currentPlayers)} 人在线</div>
                ${
                  dashboard.steamReviews
                    ? `<div class="steam-pill review-pill">${
                        dashboard.steamReviews.positiveRate == null ? "暂无" : `${dashboard.steamReviews.positiveRate}%`
                      } 好评</div>`
                    : ""
                }
              </div>`
            : ""
        }
      </div>
      <div class="listing-grid">
        ${dashboard.apple.map(renderAppleListing).join("")}
      </div>
    </article>
  `;
  monitorListEl.innerHTML =
    dashboard.id === PUBLIC_DASHBOARD_ID
      ? `<details class="detail-disclosure">
          <summary>
            <span>各地区应用详情与 Top 5</span>
            <small>${dashboard.apple.length} 个地区</small>
          </summary>
          ${gameCardHtml}
        </details>`
      : gameCardHtml;
}

function renderNewsroomMonitorList(dashboard) {
  const newsroom = dashboard.newsroom;
  monitorListEl.innerHTML = `
    <article class="game-card newsroom-card">
      <div class="game-head">
        <div>
          <h3>${escapeHtml(dashboard.title)}</h3>
          <p class="publisher">${escapeHtml(dashboard.publisher || "")}</p>
        </div>
        <div class="steam-pills">
          <div class="steam-pill">${escapeHtml(newsroom.label || "Newsroom")}</div>
          <div class="steam-pill review-pill">更新 ${formatTime(newsroom.updatedAt)}</div>
        </div>
      </div>
      ${
        newsroom.error
          ? `<div class="rank-box"><div class="rank-value outside">暂无</div><div class="rank-label">${escapeHtml(newsroom.error)}</div></div>`
          : `<div class="newsroom-grid">${(newsroom.items || []).map(renderNewsroomItem).join("")}</div>`
      }
      ${
        newsroom.sourceUrl
          ? `<div class="meta-line research-source">
              <a href="${escapeHtml(newsroom.sourceUrl)}" target="_blank" rel="noreferrer">Navimow Newsroom</a>
            </div>`
          : ""
      }
    </article>
  `;
}

function renderNewsroomItem(item) {
  const image = item.imageUrl
    ? `<img src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.title || "Navimow news")}" loading="lazy">`
    : `<div class="newsroom-image-placeholder">NEWS</div>`;
  const body = `
    <div class="newsroom-image">${image}</div>
    <div class="newsroom-body">
      <div class="newsroom-date">${escapeHtml(item.publishDate || "")}</div>
      <div class="newsroom-title">${escapeHtml(item.title || "Untitled")}</div>
      ${item.summary ? `<div class="newsroom-summary">${escapeHtml(item.summary)}</div>` : ""}
    </div>
  `;
  if (item.url) {
    return `<a class="newsroom-item" href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">${body}</a>`;
  }
  return `<div class="newsroom-item">${body}</div>`;
}

function renderResearchMonitorList(dashboard) {
  const reports = dashboard.researchReports;
  const notices = dashboard.srmNotices;
  monitorListEl.innerHTML = `
    <article class="game-card research-card">
      <div class="game-head">
        <div>
          <h3>${escapeHtml(dashboard.title)}</h3>
          <p class="publisher">${escapeHtml(dashboard.publisher || "")}</p>
        </div>
        <div class="steam-pills">
          <div class="steam-pill">${escapeHtml(reports.label || "研报")}</div>
          <div class="steam-pill review-pill">更新 ${formatTime(reports.updatedAt)}</div>
        </div>
      </div>
      ${
        reports.error
          ? `<div class="rank-box"><div class="rank-value outside">暂无</div><div class="rank-label">${escapeHtml(reports.error)}</div></div>`
          : `<div class="research-list">
              ${(reports.items || []).map(renderResearchReport).join("")}
            </div>`
      }
      ${notices ? renderSrmNoticePanel(notices) : ""}
      ${
        reports.sourceUrl || reports.bidUrl || reports.jdRankUrl || reports.jdEmotorcycleRankUrl
          ? `<div class="meta-line research-source">
              ${reports.sourceUrl ? `<a href="${escapeHtml(reports.sourceUrl)}" target="_blank" rel="noreferrer">九号投资者关系</a>` : ""}
              ${reports.bidUrl ? `<a href="${escapeHtml(reports.bidUrl)}" target="_blank" rel="noreferrer">九号招标</a>` : ""}
              ${reports.jdRankUrl ? `<a href="${escapeHtml(reports.jdRankUrl)}" target="_blank" rel="noreferrer">京东电自排名</a>` : ""}
              ${reports.jdEmotorcycleRankUrl ? `<a href="${escapeHtml(reports.jdEmotorcycleRankUrl)}" target="_blank" rel="noreferrer">京东电摩排名</a>` : ""}
            </div>`
          : ""
      }
    </article>
  `;
}

function renderResearchReport(report) {
  const meta = [report.organizationName, report.rating ? `评级 ${report.rating}` : ""].filter(Boolean).join(" · ");
  const title = escapeHtml(report.title || "未命名研报");
  const isToday = isTodayDate(report.publishDate);
  const body = `
    <div>
      <div class="research-title">
        ${isToday ? `<span class="today-badge">今日</span>` : ""}
        ${title}
      </div>
      ${meta ? `<div class="research-meta">${escapeHtml(meta)}</div>` : ""}
    </div>
    <time>${escapeHtml(report.publishDate || "")}</time>
  `;
  const className = `research-item${isToday ? " research-report-today" : ""}`;
  if (report.url) {
    return `<a class="${className}" href="${escapeHtml(report.url)}" target="_blank" rel="noreferrer">${body}</a>`;
  }
  return `<div class="${className}">${body}</div>`;
}

function renderSrmNoticePanel(notices) {
  if (notices.error) {
    return `
      <section class="srm-notice-panel">
        <div class="srm-notice-head">
          <h4>${escapeHtml(notices.label || "SRM 公告")}</h4>
          <span>更新 ${formatTime(notices.updatedAt)}</span>
        </div>
        <div class="rank-box"><div class="rank-value outside">暂无</div><div class="rank-label">${escapeHtml(notices.error)}</div></div>
      </section>
    `;
  }

  return `
    <section class="srm-notice-panel">
      <div class="srm-notice-head">
        <h4>${escapeHtml(notices.label || "SRM 公告")}</h4>
        <span>更新 ${formatTime(notices.updatedAt)}</span>
      </div>
      <div class="srm-notice-groups">
        ${(notices.groups || []).map(renderSrmNoticeGroup).join("")}
      </div>
    </section>
  `;
}

function renderSrmNoticeGroup(group) {
  return `
    <div class="srm-notice-group">
      <div class="srm-notice-group-title">
        <strong>${escapeHtml(group.label || "公告")}</strong>
        <span>${escapeHtml(group.displayLabel || "前三条")} / 共 ${escapeHtml(group.total ?? 0)} 条</span>
      </div>
      ${
        group.error
          ? `<div class="research-meta">${escapeHtml(group.error)}</div>`
          : `<div class="srm-notice-list">${(group.items || []).map(renderSrmNotice).join("")}</div>`
      }
    </div>
  `;
}

function renderSrmNotice(item) {
  const meta = [item.organizationName, item.categoryName].filter(Boolean).join(" · ");
  const isToday = isTodayDate(item.publishDate);
  const body = `
    <div>
      <div class="research-title">
        ${isToday ? `<span class="today-badge">今日</span>` : ""}
        ${escapeHtml(item.title || "未命名公告")}
      </div>
      ${meta ? `<div class="research-meta">${escapeHtml(meta)}</div>` : ""}
    </div>
    <div class="srm-notice-times">
      ${item.publishDate ? `<time>发布 ${escapeHtml(item.publishDate)}</time>` : ""}
      ${item.deadlineTime ? `<time>截止 ${escapeHtml(item.deadlineTime)}</time>` : ""}
    </div>
  `;
  const className = `research-item srm-notice-item${isToday ? " srm-notice-today" : ""}`;
  if (item.url) {
    return `<a class="${className}" href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">${body}</a>`;
  }
  return `<div class="${className}">${body}</div>`;
}

function renderAmazonMonitorList(dashboard) {
  monitorListEl.innerHTML = `
    <article class="game-card">
      <div class="game-head">
        <div>
          <h3>${escapeHtml(dashboard.title)}</h3>
          <p class="publisher">${escapeHtml(dashboard.publisher || "")}</p>
        </div>
        <div class="steam-pills">
          <div class="steam-pill">Amazon Top 10</div>
          <div class="steam-pill review-pill">约 1 小时缓存</div>
        </div>
      </div>
      <div class="amazon-market-grid">
        ${dashboard.amazon.map(renderAmazonMarket).join("")}
      </div>
    </article>
  `;
}

function renderAmazonMarket(market) {
  const targetId = getAmazonMarketTargetId(market);
  return `
    <section class="listing amazon-market" id="${escapeHtml(targetId)}">
      <div class="amazon-market-head">
        <div>
          <div class="listing-title">${escapeHtml(market.label)}</div>
          <div class="listing-subtitle">${escapeHtml(market.title || "Robotic Lawn Mowers")} · ${formatTime(market.updatedAt)}</div>
        </div>
        <a href="${escapeHtml(market.url)}" target="_blank" rel="noreferrer">Amazon</a>
      </div>
      ${
        market.error
          ? `<div class="rank-box"><div class="rank-value outside">暂无</div><div class="rank-label">${escapeHtml(market.error)}</div></div>`
          : `<ol class="amazon-top-list">
              ${(market.leaders || []).map(renderAmazonItem).join("")}
            </ol>`
      }
    </section>
  `;
}

function scrollToAmazonMarket(targetId) {
  const target = document.getElementById(targetId);
  if (!target) return;
  target.scrollIntoView({ behavior: "smooth", block: "start" });
  target.classList.remove("amazon-market-active");
  window.setTimeout(() => target.classList.add("amazon-market-active"), 120);
  window.setTimeout(() => target.classList.remove("amazon-market-active"), 1800);
}

function getAmazonTargetCard(event) {
  const target = event.target instanceof Element ? event.target : event.target?.parentElement;
  return target?.closest("[data-amazon-target]") || null;
}

summaryEl.addEventListener("click", (event) => {
  const card = getAmazonTargetCard(event);
  if (!card) return;
  scrollToAmazonMarket(card.dataset.amazonTarget);
});

summaryEl.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  const card = getAmazonTargetCard(event);
  if (!card) return;
  event.preventDefault();
  scrollToAmazonMarket(card.dataset.amazonTarget);
});

function renderAmazonItem(item) {
  const isNavimow = /segway|navimow/i.test(item.title || "");
  const shortTitle = getShortProductName(item.title);
  return `
    <li class="amazon-item ${isNavimow ? "navimow-highlight" : ""}">
      <div class="amazon-rank">${formatRank(item.rank, 10)}</div>
      ${item.imageUrl ? `<img src="${escapeHtml(item.imageUrl)}" alt="" />` : `<div class="amazon-image-placeholder"></div>`}
      <div class="amazon-item-body">
        <a class="amazon-item-title" href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer" title="${escapeHtml(item.title)}">
          ${escapeHtml(shortTitle)}
        </a>
        <div class="meta-line amazon-item-meta">
          ${isNavimow ? `<span class="navimow-badge">Segway Navimow</span>` : ""}
          <span>ASIN ${escapeHtml(item.asin)}</span>
          ${item.price ? `<span>${escapeHtml(item.price)}</span>` : ""}
          ${item.ratingText ? `<span>${escapeHtml(item.ratingText)}</span>` : ""}
        </div>
      </div>
    </li>
  `;
}

function renderAppleListing(listing) {
  const lookup = listing.lookup;
  const artworkUrl = safeExternalUrl(lookup.artworkUrl100);
  const storeUrl = safeExternalUrl(lookup.storeUrl);
  return `
    <section class="listing">
      <div class="listing-top">
        ${artworkUrl ? `<img src="${artworkUrl}" alt="" />` : `<div class="app-icon-placeholder"></div>`}
        <div>
          <div class="listing-title">${escapeHtml(lookup.name || listing.label)}</div>
          <div class="listing-subtitle">${escapeHtml(listing.label)} · ${escapeHtml(lookup.sellerName || "未知发行方")}</div>
        </div>
      </div>
      <div class="rank-row">
        ${listing.ranks.map(renderRankBox).join("")}
      </div>
      <div class="meta-line">
        <span>评分 ${lookup.rating ? lookup.rating.toFixed(2) : "暂无"}</span>
        <span>${formatNumber(lookup.ratingCount)} 个评分</span>
        <span>版本 ${escapeHtml(lookup.version || "未知")}</span>
        <span>更新 ${formatTime(lookup.updatedAt)}</span>
        ${storeUrl ? `<a href="${storeUrl}" target="_blank" rel="noreferrer">App Store</a>` : ""}
      </div>
      ${listing.ranks.map(renderLeaderList).join("")}
    </section>
  `;
}

function renderRankBox(chartRank) {
  const outside = !chartRank.rank;
  return `
    <div class="rank-box">
      <div class="rank-label">${escapeHtml(chartRank.label)}</div>
      <div class="rank-value ${outside ? "outside" : ""}">
        ${formatRank(chartRank.rank, chartRank.topLimit)}
      </div>
    </div>
  `;
}

function renderLeaderList(chartRank) {
  return `
    <div class="leader-list">
      <strong>${escapeHtml(chartRank.label)} Top 5</strong>
      <ol>
        ${chartRank.leaders.map((item) => `<li>${escapeHtml(item.name)}</li>`).join("")}
      </ol>
    </div>
  `;
}

async function load(force = false) {
  const shouldForce = force && canForceRefresh();
  refreshButton.disabled = true;
  statusEl.textContent = shouldForce ? "正在强制刷新" : "正在加载";
  try {
    currentMetrics = await fetchJson(getMetricsUrl(shouldForce));
    render(currentMetrics);
    statusEl.textContent = `${formatTime(currentMetrics.generatedAt)}${currentMetrics.cached ? " · 缓存" : ""}`;
  } catch (error) {
    statusEl.textContent = `加载失败：${error.message}`;
  } finally {
    refreshButton.disabled = false;
  }
}

refreshButton.addEventListener("click", () => load(true));
window.addEventListener("hashchange", () => {
  if (currentMetrics) render(currentMetrics);
});

load();
setInterval(() => load(), 5 * 60 * 1000);
