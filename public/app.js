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

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
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

function formatPrice(value, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(value)) return "暂无";
  return Number(value).toFixed(digits);
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

function renderSummary(dashboard) {
  const rankCards = (dashboard.apple || []).flatMap((listing) =>
    listing.ranks.map((rank, index) => {
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
              value: formatRank(comparisonRank.rank, comparisonRank.topLimit)
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
    })
  );
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
      navimowItems
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
        <article class="metric-card amazon-summary-card">
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

  if (!dashboard.steam) {
    monitorListEl.innerHTML = "";
    return;
  }

  monitorListEl.innerHTML = `
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
}

function renderResearchMonitorList(dashboard) {
  const reports = dashboard.researchReports;
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
      ${
        reports.sourceUrl
          ? `<div class="meta-line research-source"><a href="${escapeHtml(reports.sourceUrl)}" target="_blank" rel="noreferrer">九号投资者关系</a></div>`
          : ""
      }
    </article>
  `;
}

function renderResearchReport(report) {
  const meta = [report.organizationName, report.rating ? `评级 ${report.rating}` : ""].filter(Boolean).join(" · ");
  const title = escapeHtml(report.title || "未命名研报");
  const body = `
    <div>
      <div class="research-title">${title}</div>
      ${meta ? `<div class="research-meta">${escapeHtml(meta)}</div>` : ""}
    </div>
    <time>${escapeHtml(report.publishDate || "")}</time>
  `;
  if (report.url) {
    return `<a class="research-item" href="${escapeHtml(report.url)}" target="_blank" rel="noreferrer">${body}</a>`;
  }
  return `<div class="research-item">${body}</div>`;
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
  return `
    <section class="listing amazon-market">
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
  return `
    <section class="listing">
      <div class="listing-top">
        ${lookup.artworkUrl100 ? `<img src="${lookup.artworkUrl100}" alt="" />` : `<div class="app-icon-placeholder"></div>`}
        <div>
          <div class="listing-title">${lookup.name || listing.label}</div>
          <div class="listing-subtitle">${listing.label} · ${lookup.sellerName || "未知发行方"}</div>
        </div>
      </div>
      <div class="rank-row">
        ${listing.ranks.map(renderRankBox).join("")}
      </div>
      <div class="meta-line">
        <span>评分 ${lookup.rating ? lookup.rating.toFixed(2) : "暂无"}</span>
        <span>${formatNumber(lookup.ratingCount)} 个评分</span>
        <span>版本 ${lookup.version || "未知"}</span>
        <span>更新 ${formatTime(lookup.updatedAt)}</span>
        <a href="${lookup.storeUrl}" target="_blank" rel="noreferrer">App Store</a>
      </div>
      ${listing.ranks.map(renderLeaderList).join("")}
    </section>
  `;
}

function renderRankBox(chartRank) {
  const outside = !chartRank.rank;
  return `
    <div class="rank-box">
      <div class="rank-label">${chartRank.label}</div>
      <div class="rank-value ${outside ? "outside" : ""}">
        ${formatRank(chartRank.rank, chartRank.topLimit)}
      </div>
    </div>
  `;
}

function renderLeaderList(chartRank) {
  return `
    <div class="leader-list">
      <strong>${chartRank.label} Top 5</strong>
      <ol>
        ${chartRank.leaders.map((item) => `<li>${item.name}</li>`).join("")}
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
