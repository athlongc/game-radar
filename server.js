import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const publicDir = join(__dirname, "public");

const PORT = Number(process.env.PORT || 5177);
const CACHE_TTL_MS = 5 * 60 * 1000;
const AMAZON_CACHE_TTL_MS = 60 * 60 * 1000;
const PUBLIC_DASHBOARD_ID = "heartopia";
const NAVIMOW_DIANDIAN_URL = "https://app.diandian.com/app/np2ugugwm3x1ei7/ios-grank?market=1&country=13&id=1602205067&n=Navimow";
const numberFormatter = new Intl.NumberFormat("zh-CN", {
  maximumFractionDigits: 2,
  minimumFractionDigits: 2
});

const dashboards = [
  {
    id: "heartopia",
    title: "心动小镇 / Heartopia",
    subtitle: "Steam 在线与 iOS 游戏榜",
    publisher: "XD",
    steamAppId: "4025700",
    steamExternalUrl: "https://steamdb.info/app/4025700/charts/",
    stockQuote: {
      symbol: "02400.HK",
      code: "hk02400",
      label: "心动公司股价",
      externalUrl: "https://xueqiu.com/S/02400"
    },
    appleMonitors: [
      {
        country: "cn",
        label: "中国大陆 iOS",
        appId: "1561903786",
        charts: [
          {
            key: "freeGames",
            label: "国区免费游戏榜",
            feed: "topfreeapplications",
            genre: "6014",
            externalUrl: "https://www.qimai.cn/app/rank/appid/1561903786/country/cn"
          },
          {
            key: "grossingGames",
            label: "国区畅销游戏榜",
            feed: "topgrossingapplications",
            genre: "6014",
            externalUrl: "https://www.qimai.cn/app/rank/appid/1561903786/country/cn"
          }
        ]
      },
      {
        country: "th",
        label: "泰区 iOS",
        appId: "6746151928",
        charts: [
          {
            key: "grossingGames",
            label: "泰区畅销游戏榜",
            feed: "topgrossingapplications",
            genre: "6014",
            externalUrl: "https://app.diandian.com/app/w2uwuel671369fr/ios-grank?market=1&country=125&id=6746151928&n=心動小鎮"
          }
        ]
      },
      {
        country: "jp",
        label: "日区 iOS",
        appId: "6746151928",
        charts: [
          {
            key: "grossingGames",
            label: "日区畅销游戏榜",
            feed: "topgrossingapplications",
            genre: "6014",
            externalUrl: "https://app.diandian.com/app/w2uwuel671369fr/ios-grank?market=1&country=125&id=6746151928&n=心動小鎮"
          }
        ]
      },
      {
        country: "kr",
        label: "韩区 iOS",
        appId: "6746151928",
        charts: [{ key: "grossingGames", label: "韩区畅销游戏榜", feed: "topgrossingapplications", genre: "6014" }]
      },
      {
        country: "tw",
        label: "台区 iOS",
        appId: "6746151928",
        charts: [{ key: "grossingGames", label: "台区畅销游戏榜", feed: "topgrossingapplications", genre: "6014" }]
      },
      {
        country: "us",
        label: "美区 iOS",
        appId: "6746151928",
        charts: [{ key: "grossingGames", label: "美区畅销游戏榜", feed: "topgrossingapplications", genre: "6014" }]
      },
      {
        country: "fr",
        label: "法国 iOS",
        appId: "6746151928",
        charts: [{ key: "grossingGames", label: "法国畅销游戏榜", feed: "topgrossingapplications", genre: "6014" }]
      },
      {
        country: "br",
        label: "巴西 iOS",
        appId: "6746151928",
        charts: [{ key: "grossingGames", label: "巴西畅销游戏榜", feed: "topgrossingapplications", genre: "6014" }]
      }
    ]
  },
  {
    id: "ninebot-cn",
    title: "九号 / Segway",
    subtitle: "九号股价与工具免费榜",
    publisher: "Ninebot",
    stockQuote: {
      symbol: "689009.SH",
      code: "sh689009",
      label: "九号公司股价",
      currency: "CNY",
      externalUrl: "https://xueqiu.com/S/SH689009"
    },
    appleMonitors: [
      {
        country: "cn",
        label: "中国大陆 iOS",
        appId: "1458698038",
        charts: [
          {
            key: "freeUtilities",
            label: "国区工具免费榜",
            feed: "topfreeapplications",
            genre: "6002",
            externalUrl: "https://www.qimai.cn/app/rank/appid/1458698038/country/cn"
          }
        ]
      },
      {
        country: "de",
        label: "德国 iOS",
        appId: "1484302191",
        charts: [
          {
            key: "freeUtilities",
            label: "德国工具免费榜",
            feed: "topfreeapplications",
            genre: "6002",
            externalUrl: "https://app.diandian.com/app/yemupuvozwzrgcr/ios-grank?market=1&country=13&id=1484302191&n=Segway%20Mobility"
          }
        ]
      },
      { country: "fr", label: "法国 iOS", appId: "1484302191", charts: [{ key: "freeUtilities", label: "法国工具免费榜", feed: "topfreeapplications", genre: "6002" }] },
      { country: "ca", label: "加拿大 iOS", appId: "1484302191", charts: [{ key: "freeUtilities", label: "加拿大工具免费榜", feed: "topfreeapplications", genre: "6002" }] },
      { country: "au", label: "澳大利亚 iOS", appId: "1484302191", charts: [{ key: "freeUtilities", label: "澳大利亚工具免费榜", feed: "topfreeapplications", genre: "6002" }] }
    ]
  },
  {
    id: "navimow",
    title: "Navimow",
    subtitle: "工具免费榜",
    publisher: "Navimow B.V.",
    comparisonApp: {
      label: "Mammotion",
      appId: "1626028673"
    },
    appleMonitors: [
      {
        country: "de",
        label: "德国 iOS",
        appId: "1602205067",
        charts: [
          { key: "freeUtilities", label: "德国工具免费榜", feed: "topfreeapplications", genre: "6002", externalUrl: NAVIMOW_DIANDIAN_URL }
        ]
      },
      {
        country: "dk",
        label: "丹麦 iOS",
        appId: "1602205067",
        charts: [
          { key: "freeUtilities", label: "丹麦工具免费榜", feed: "topfreeapplications", genre: "6002", externalUrl: NAVIMOW_DIANDIAN_URL }
        ]
      },
      {
        country: "no",
        label: "挪威 iOS",
        appId: "1602205067",
        charts: [
          { key: "freeUtilities", label: "挪威工具免费榜", feed: "topfreeapplications", genre: "6002", externalUrl: NAVIMOW_DIANDIAN_URL }
        ]
      },
      {
        country: "be",
        label: "比利时 iOS",
        appId: "1602205067",
        charts: [
          { key: "freeUtilities", label: "比利时工具免费榜", feed: "topfreeapplications", genre: "6002", externalUrl: NAVIMOW_DIANDIAN_URL }
        ]
      }
    ]
  },
  {
    id: "amazon-mowers",
    title: "Amazon 割草机",
    subtitle: "机器人割草机畅销榜",
    publisher: "Amazon Best Sellers",
    amazonMonitors: [
      {
        country: "de",
        label: "德国 Amazon",
        url: "https://www.amazon.de/-/en/gp/bestsellers/garden/4464830031/ref=zg_bs_nav_garden_3_4464828031"
      },
      {
        country: "fr",
        label: "法国 Amazon",
        url: "https://www.amazon.fr/gp/bestsellers/lawn-garden/1854688031"
      },
      {
        country: "us",
        label: "美国 Amazon",
        url: "https://www.amazon.com/Best-Sellers-Robotic-Lawn-Mowers/zgbs/lawn-garden/13638738011"
      },
      {
        country: "uk",
        label: "英国 Amazon",
        url: "https://www.amazon.co.uk/gp/bestsellers/outdoors/4370213031"
      },
      {
        country: "it",
        label: "意大利 Amazon",
        url: "https://www.amazon.it/gp/bestsellers/tools/4695042031"
      },
      {
        country: "es",
        label: "西班牙 Amazon",
        url: "https://www.amazon.es/gp/bestsellers/lawn-garden/5940196031"
      },
      {
        country: "be",
        label: "比利时 Amazon",
        url: "https://www.amazon.com.be/gp/bestsellers/lawn-garden/27636487031"
      },
      {
        country: "nl",
        label: "荷兰 Amazon",
        url: "https://www.amazon.nl/gp/bestsellers/lawn-and-garden/16409825031"
      }
    ],
    amazonBrandPatterns: [
      { key: "mammotion", label: "Mammotion", pattern: "mammotion|luba|yuka" },
      { key: "navimow", label: "Navimow", pattern: "navimow|segway" }
    ]
  }
];

const metricsCache = new Map();
const amazonCache = new Map();

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png"
};

function json(res, status, payload) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  });
  res.end(JSON.stringify(payload));
}

async function fetchJson(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 9000);
  try {
    const response = await fetch(url, {
      headers: { "user-agent": "GameRadar/0.1" },
      signal: controller.signal
    });
    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchText(url, headers = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(url, {
      headers: {
        "accept-language": "en-US,en;q=0.9",
        cookie: "i18n-prefs=CNY",
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        ...headers
      },
      signal: controller.signal
    });
    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }
    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

function parseLegacyAppleFeed(feed) {
  const entries = Array.isArray(feed?.entry) ? feed.entry : feed?.entry ? [feed.entry] : [];
  return entries.map((entry, index) => ({
    rank: index + 1,
    id: entry?.id?.attributes?.["im:id"] || "",
    name: entry?.["im:name"]?.label || "",
    artistName: entry?.["im:artist"]?.label || "",
    artworkUrl100: entry?.["im:image"]?.at(-1)?.label || "",
    url: entry?.link?.attributes?.href || ""
  }));
}

async function getSteamMetric(appId) {
  const url = `https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1/?appid=${appId}`;
  const data = await fetchJson(url);
  return {
    appId,
    currentPlayers: data?.response?.player_count ?? null,
    ok: data?.response?.result === 1
  };
}

async function getSteamReviewMetric(appId) {
  const url = `https://store.steampowered.com/appreviews/${appId}?json=1&language=all&purchase_type=all&filter=summary&num_per_page=0`;
  const data = await fetchJson(url);
  const summary = data?.query_summary || {};
  const totalPositive = summary.total_positive ?? null;
  const totalReviews = summary.total_reviews ?? null;
  const positiveRate =
    totalPositive !== null && totalReviews ? Math.round((totalPositive / totalReviews) * 1000) / 10 : null;

  return {
    appId,
    positiveRate,
    reviewScore: summary.review_score ?? null,
    reviewScoreDesc: summary.review_score_desc || "",
    totalPositive,
    totalNegative: summary.total_negative ?? null,
    totalReviews
  };
}

async function getStockQuote(stock) {
  const url = `https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?param=${stock.code},day,,,1,qfq`;
  const data = await fetchJson(url);
  const quote = data?.data?.[stock.code]?.qt?.[stock.code];
  if (!Array.isArray(quote)) {
    throw new Error(`Stock quote unavailable for ${stock.symbol}`);
  }

  return {
    ...stock,
    name: quote[1] || stock.label,
    price: Number(quote[3]),
    previousClose: Number(quote[4]),
    open: Number(quote[5]),
    volume: Number(quote[36] || quote[29]),
    turnover: Number(quote[37]),
    change: Number(quote[31]),
    changePercent: Number(quote[32]),
    high: Number(quote[33]),
    low: Number(quote[34]),
    currency: stock.currency || (stock.code.startsWith("hk") ? "HKD" : "CNY"),
    quoteTime: normalizeStockQuoteTime(quote[30] || ""),
    delayed: true,
    source: "Tencent Finance"
  };
}

function normalizeStockQuoteTime(value) {
  if (/^\d{14}$/.test(value)) {
    return `${value.slice(0, 4)}/${value.slice(4, 6)}/${value.slice(6, 8)} ${value.slice(8, 10)}:${value.slice(10, 12)}:${value.slice(12, 14)}`;
  }
  return value;
}

async function getAppleLookup(appId, country) {
  const data = await fetchJson(`https://itunes.apple.com/lookup?id=${appId}&country=${country}`);
  const item = data?.results?.[0] || {};
  return {
    appId,
    country,
    name: item.trackName || "",
    sellerName: item.sellerName || item.artistName || "",
    artworkUrl100: item.artworkUrl100 || "",
    rating: item.averageUserRating ?? null,
    ratingCount: item.userRatingCount ?? null,
    version: item.version || "",
    updatedAt: item.currentVersionReleaseDate || "",
    storeUrl: item.trackViewUrl || ""
  };
}

function getFallbackAppleLookup(appId, country, error) {
  return {
    appId,
    country,
    name: "",
    sellerName: "",
    artworkUrl100: "",
    rating: null,
    ratingCount: null,
    version: "",
    updatedAt: "",
    storeUrl: "",
    error: error.message || "Lookup unavailable"
  };
}

function getAppleChartUrl(country, chart) {
  const genrePart = chart.genre ? `/genre=${chart.genre}` : "";
  return `https://itunes.apple.com/${country}/rss/${chart.feed}/limit=100${genrePart}/json`;
}

async function getAppleRanks(appId, country, charts) {
  await Promise.all(
    charts.map(async (chart) => {
      try {
        const data = await fetchJson(getAppleChartUrl(country, chart));
        const entries = parseLegacyAppleFeed(data?.feed);
        const found = entries.find((entry) => entry.id === appId);
        chart.rank = {
          key: chart.key,
          label: chart.label,
          externalUrl: chart.externalUrl || "",
          rank: found?.rank ?? null,
          topLimit: 100,
          updatedAt: data?.feed?.updated?.label || "",
          leaders: entries.slice(0, 5)
        };
      } catch (error) {
        chart.rank = {
          key: chart.key,
          label: chart.label,
          externalUrl: chart.externalUrl || "",
          rank: null,
          topLimit: 100,
          updatedAt: "",
          leaders: [],
          error: error.message || "Chart unavailable"
        };
      }
    })
  );
  return charts.map((chart) => chart.rank);
}

function decodeHtml(value = "") {
  return value
    .replace(/&quot;/g, "\"")
    .replace(/&#34;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function absoluteAmazonUrl(baseUrl, path = "") {
  try {
    return new URL(path, baseUrl).toString();
  } catch {
    return "";
  }
}

function normalizeAmazonPrice(value = "") {
  const text = decodeHtml(value).replace(/^CNY\s*/i, "RMB ");
  if (!text || /^RMB\s/i.test(text)) return text;

  const normalized = text.replace(/\s/g, "");
  const currencyRates = [
    { pattern: /^€|€$/, rate: 8.3 },
    { pattern: /^\$/, rate: 7.3 },
    { pattern: /^£/, rate: 9.6 },
    { pattern: /^US\$/i, rate: 7.3 }
  ];
  const match = currencyRates.find((item) => item.pattern.test(normalized));
  if (!match) return text;

  const numericText = normalized
    .replace(/[€$£]/g, "")
    .replace(/^US/i, "")
    .replace(/[^\d.,]/g, "");
  let normalizedNumber = numericText;
  if (numericText.includes(",") && numericText.includes(".")) {
    normalizedNumber =
      numericText.lastIndexOf(",") > numericText.lastIndexOf(".")
        ? numericText.replace(/\./g, "").replace(",", ".")
        : numericText.replace(/,/g, "");
  } else if (numericText.includes(",")) {
    normalizedNumber = numericText.replace(",", ".");
  }

  const amount = Number(normalizedNumber);
  if (!Number.isFinite(amount)) return text;
  return `RMB ${numberFormatter.format(Math.round(amount * match.rate * 100) / 100)}`;
}

function parseAmazonBestsellerPage(html, baseUrl) {
  if (/Robot Check|captcha/i.test(html)) {
    throw new Error("Amazon returned robot check");
  }

  const title =
    decodeHtml((html.match(/<h1[^>]*class="[^"]*(?:a-size-large|card-title)[^"]*"[^>]*>([\s\S]*?)<\/h1>/i) || [])[1]) ||
    decodeHtml((html.match(/<title>([\s\S]*?)<\/title>/i) || [])[1]);
  const blocks = html.split(/<div id="p13n-asin-index-\d+"/).slice(1);
  const items = blocks
    .map((block) => {
      const rank = Number((block.match(/<span class="zg-bdg-text">#(\d+)<\/span>/) || [])[1]);
      const asin = (block.match(/data-asin="([^"]+)"/) || [])[1] || "";
      const title = decodeHtml(
        (block.match(/_cDEzb_p13n-sc-css-line-clamp-3_g3dy1">([\s\S]*?)<\/div>/) || [])[1] ||
          (block.match(/<img[^>]+alt="([^"]+)"/) || [])[1] ||
          ""
      );
      const productPath = (block.match(/href="([^"]*\/dp\/[^"]+)"/) || [])[1] || "";
      const imageUrl = decodeHtml((block.match(/<img[^>]+src="([^"]+)"/) || [])[1] || "");
      const ratingText = decodeHtml(
        (block.match(/aria-label="([^"]*(?:out of 5 stars|sur 5|su 5 stelle)[^"]*)"/i) || [])[1] || ""
      );
      const price = normalizeAmazonPrice(
        (block.match(/<span class="(?:p13n-sc-price|_cDEzb_p13n-sc-price_3mJ9Z)">([\s\S]*?)<\/span>/) || [])[1] || ""
      );

      return {
        rank,
        asin,
        title,
        url: absoluteAmazonUrl(baseUrl, productPath),
        imageUrl,
        ratingText,
        price
      };
    })
    .filter((item) => item.rank && item.asin && item.title);

  return {
    title,
    items,
    topLimit: items.length || 30
  };
}

function getAmazonBrandRanks(items, patterns = []) {
  return patterns.map((brand) => {
    const regex = new RegExp(brand.pattern, "i");
    const found = items.find((item) => regex.test(item.title));
    return {
      key: brand.key,
      label: brand.label,
      rank: found?.rank ?? null,
      asin: found?.asin || "",
      title: found?.title || ""
    };
  });
}

async function getAmazonBestseller(monitor, brandPatterns = [], force = false) {
  const cached = amazonCache.get(monitor.url);
  if (!force && cached && Date.now() - cached.cachedAt < AMAZON_CACHE_TTL_MS) {
    return { ...cached.data, cached: true };
  }

  const html = await fetchText(monitor.url);
  const parsed = parseAmazonBestsellerPage(html, monitor.url);
  const data = {
    ...monitor,
    ...parsed,
    leaders: parsed.items.slice(0, 10),
    brandRanks: getAmazonBrandRanks(parsed.items, brandPatterns),
    updatedAt: new Date().toISOString(),
    cacheTtlSeconds: AMAZON_CACHE_TTL_MS / 1000,
    cached: false
  };
  amazonCache.set(monitor.url, { cachedAt: Date.now(), data });
  return data;
}

async function collectMetrics(force = false, selectedDashboards = dashboards) {
  const now = new Date().toISOString();
  const metrics = await Promise.all(
    selectedDashboards.map(async (dashboard) => {
      const [steam, steamReviews, stockQuote] = await Promise.all([
        dashboard.steamAppId ? getSteamMetric(dashboard.steamAppId).catch((error) => ({ error: error.message })) : null,
        dashboard.steamAppId
          ? getSteamReviewMetric(dashboard.steamAppId).catch((error) => ({ error: error.message }))
          : null,
        dashboard.stockQuote ? getStockQuote(dashboard.stockQuote).catch((error) => ({ error: error.message })) : null
      ]);
      const apple = await Promise.all(
        (dashboard.appleMonitors || []).map(async (listing) => {
          const [lookup, ranks, comparisonRanks] = await Promise.all([
            getAppleLookup(listing.appId, listing.country).catch((error) =>
              getFallbackAppleLookup(listing.appId, listing.country, error)
            ),
            getAppleRanks(listing.appId, listing.country, listing.charts.map((chart) => ({ ...chart }))),
            dashboard.comparisonApp
              ? getAppleRanks(
                  dashboard.comparisonApp.appId,
                  listing.country,
                  listing.charts.map((chart) => ({ ...chart }))
                )
              : null
          ]);
          return {
            ...listing,
            lookup,
            ranks,
            comparison: dashboard.comparisonApp
              ? {
                  ...dashboard.comparisonApp,
                  ranks: comparisonRanks || []
                }
              : null
          };
        })
      );
      const amazon = await Promise.all(
        (dashboard.amazonMonitors || []).map((monitor) =>
          getAmazonBestseller(monitor, dashboard.amazonBrandPatterns || [], force).catch((error) => ({
            ...monitor,
            title: "",
            topLimit: 30,
            items: [],
            leaders: [],
            brandRanks: getAmazonBrandRanks([], dashboard.amazonBrandPatterns || []),
            updatedAt: new Date().toISOString(),
            error: error.message || "Amazon chart unavailable"
          }))
        )
      );
      return { ...dashboard, steam, steamReviews, stockQuote, apple, amazon };
    })
  );

  const payload = {
    generatedAt: now,
    cacheTtlSeconds: CACHE_TTL_MS / 1000,
    dashboards: metrics,
    sources: [
      {
        name: "Steam Web API",
        url: "https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1/"
      },
      {
        name: "Apple iTunes RSS",
        url: "https://itunes.apple.com/rss"
      },
      {
        name: "Apple Lookup API",
        url: "https://itunes.apple.com/lookup"
      },
      {
        name: "Tencent Finance delayed quote",
        url: "https://web.ifzq.gtimg.cn/appstock/app/fqkline/get"
      },
      {
        name: "Amazon Best Sellers",
        url: "https://www.amazon.com/Best-Sellers/zgbs"
      }
    ]
  };
  return payload;
}

async function getMetrics({ force = false, dashboardId = null } = {}) {
  const selectedDashboards = dashboardId ? dashboards.filter((dashboard) => dashboard.id === dashboardId) : dashboards;
  const cacheKey = dashboardId || "all";
  const cached = metricsCache.get(cacheKey);
  if (!force && cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    return { ...cached.data, cached: true };
  }
  const data = await collectMetrics(force, selectedDashboards);
  metricsCache.set(cacheKey, { cachedAt: Date.now(), data });
  return { ...data, cached: false };
}

function isLocalRequest(req) {
  const rawHost = req.headers.host || "";
  const host = rawHost.startsWith("[") ? rawHost.slice(1, rawHost.indexOf("]")) : rawHost.split(":")[0];
  return host === "localhost" || host === "127.0.0.1" || host === "::1";
}

async function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const requestPath = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
  const filePath = normalize(join(publicDir, requestPath));
  if (!filePath.startsWith(publicDir)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  try {
    const body = await readFile(filePath);
    const type = contentTypes[extname(filePath)] || "application/octet-stream";
    res.writeHead(200, { "content-type": type });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
}

createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (url.pathname === "/api/metrics") {
      const local = isLocalRequest(req);
      const requestedDashboardId = url.searchParams.get("dashboard") || "";
      const dashboardId = local ? requestedDashboardId || null : PUBLIC_DASHBOARD_ID;
      const force =
        url.searchParams.get("force") === "1" && (local || dashboardId === PUBLIC_DASHBOARD_ID);
      json(res, 200, await getMetrics({ force, dashboardId }));
      return;
    }
    if (url.pathname === "/api/health") {
      json(res, 200, { ok: true });
      return;
    }
    await serveStatic(req, res);
  } catch (error) {
    json(res, 500, { error: error.message || "Unknown error" });
  }
}).listen(PORT, "0.0.0.0", () => {
  console.log(`Game Radar running on port ${PORT}`);
});
