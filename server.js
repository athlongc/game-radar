import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const publicDir = join(__dirname, "public");

const PORT = Number(process.env.PORT || 5177);
const CACHE_TTL_MS = 5 * 60 * 1000;
const AMAZON_CACHE_TTL_MS = 60 * 60 * 1000;
const STEAM_TOP_SELLER_TOP_LIMIT = 100;
const PUBLIC_DASHBOARD_ID = "heartopia";
const NAVIMOW_DIANDIAN_URL = "https://app.diandian.com/app/np2ugugwm3x1ei7/ios-grank?market=1&country=13&id=1602205067&n=Navimow";
const SAFE_RMB_QUERY_URL = "https://www.safe.gov.cn/AppStructured/hlw/RMBQuery.do";
const SINA_FX_QUOTE_URL = "https://hq.sinajs.cn/list=fx_susdcnh,fx_seurcnh";
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
    steamTopSellerMarkets: [
      { country: "global", label: "全球畅销", displayCode: "Global", url: "https://store.steampowered.com/charts/topselling/global" },
      { country: "th", label: "泰区畅销", displayCode: "TH", url: "https://store.steampowered.com/charts/topselling/TH" },
      { country: "jp", label: "日区畅销", displayCode: "JP", url: "https://store.steampowered.com/charts/topselling/JP" },
      { country: "kr", label: "韩区畅销", displayCode: "KR", url: "https://store.steampowered.com/charts/topselling/KR" },
      { country: "tw", label: "台区畅销", displayCode: "TW", url: "https://store.steampowered.com/charts/topselling/TW" },
      { country: "us", label: "美区畅销", displayCode: "US", url: "https://store.steampowered.com/charts/topselling/US" },
      { country: "fr", label: "法国畅销", displayCode: "FR", url: "https://store.steampowered.com/charts/topselling/FR" },
      { country: "br", label: "巴西畅销", displayCode: "BR", url: "https://store.steampowered.com/charts/topselling/BR" }
    ],
    stockQuote: {
      symbol: "02400.HK",
      code: "hk02400",
      label: "心动公司股价",
      externalUrl: "https://xueqiu.com/S/02400"
    },
    tapTap: {
      label: "TapTap",
      appId: "45213",
      url: "https://www.taptap.cn/app/45213"
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
            key: "freeGames",
            label: "泰区免费游戏榜",
            feed: "topfreeapplications",
            genre: "6014"
          },
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
        charts: [
          { key: "freeGames", label: "韩区免费游戏榜", feed: "topfreeapplications", genre: "6014" },
          { key: "grossingGames", label: "韩区畅销游戏榜", feed: "topgrossingapplications", genre: "6014" }
        ]
      },
      {
        country: "tw",
        label: "台区 iOS",
        appId: "6746151928",
        charts: [
          { key: "freeGames", label: "台区免费游戏榜", feed: "topfreeapplications", genre: "6014" },
          { key: "grossingGames", label: "台区畅销游戏榜", feed: "topgrossingapplications", genre: "6014" }
        ]
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
      { country: "au", label: "澳大利亚 iOS", appId: "1484302191", charts: [{ key: "freeUtilities", label: "澳大利亚工具免费榜", feed: "topfreeapplications", genre: "6002" }] },
      { country: "nl", label: "荷兰 iOS", appId: "1484302191", charts: [{ key: "freeUtilities", label: "荷兰工具免费榜", feed: "topfreeapplications", genre: "6002" }] },
      { country: "ch", label: "瑞士 iOS", appId: "1484302191", charts: [{ key: "freeUtilities", label: "瑞士工具免费榜", feed: "topfreeapplications", genre: "6002" }] }
    ],
    researchReports: {
      label: "研报",
      url: "https://zh-cn.ninebot.com/bin/reportList",
      pageSize: 3,
      sourceUrl: "https://zh-cn.ninebot.com/explore/investor.html",
      bidUrl: "https://srm2.segway-ninebot.com/#/login?showBid=1",
      jdRankUrl:
        "https://pro.jd.com/mall/active/4JRfHorUDXgL77E9YdNxSCNMKwkJ/index.html?pageNum=1&bbtf=1&queryType=1&rankId=3167530&rankType=10&fromName=ProductdetailPC&preSrc=null&currSku=10219899905845&currSpu=10034692185667&transparent=1",
      jdEmotorcycleRankUrl:
        "https://pro.jd.com/mall/active/4JRfHorUDXgL77E9YdNxSCNMKwkJ/index.html?pageNum=1&bbtf=1&queryType=1&rankId=3167646&rankType=10&fromName=ProductdetailPC"
    },
    exchangeRates: true
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
      },
      {
        country: "at",
        label: "奥地利 iOS",
        appId: "1602205067",
        charts: [
          { key: "freeUtilities", label: "奥地利工具免费榜", feed: "topfreeapplications", genre: "6002", externalUrl: NAVIMOW_DIANDIAN_URL }
        ]
      },
      {
        country: "lt",
        label: "立陶宛 iOS",
        appId: "1602205067",
        charts: [
          { key: "freeUtilities", label: "立陶宛工具免费榜", feed: "topfreeapplications", genre: "6002", externalUrl: NAVIMOW_DIANDIAN_URL }
        ]
      },
      {
        country: "ie",
        label: "爱尔兰 iOS",
        appId: "1602205067",
        charts: [
          { key: "freeUtilities", label: "爱尔兰工具免费榜", feed: "topfreeapplications", genre: "6002", externalUrl: NAVIMOW_DIANDIAN_URL }
        ]
      },
      {
        country: "se",
        label: "瑞典 iOS",
        appId: "1602205067",
        charts: [
          { key: "freeUtilities", label: "瑞典工具免费榜", feed: "topfreeapplications", genre: "6002", externalUrl: NAVIMOW_DIANDIAN_URL }
        ]
      },
      {
        country: "ch",
        label: "瑞士 iOS",
        appId: "1602205067",
        charts: [
          { key: "freeUtilities", label: "瑞士工具免费榜", feed: "topfreeapplications", genre: "6002", externalUrl: NAVIMOW_DIANDIAN_URL }
        ]
      },
      {
        country: "lu",
        label: "卢森堡 iOS",
        appId: "1602205067",
        charts: [
          { key: "freeUtilities", label: "卢森堡工具免费榜", feed: "topfreeapplications", genre: "6002", externalUrl: NAVIMOW_DIANDIAN_URL }
        ]
      },
      {
        country: "fi",
        label: "芬兰 iOS",
        appId: "1602205067",
        charts: [
          { key: "freeUtilities", label: "芬兰工具免费榜", feed: "topfreeapplications", genre: "6002", externalUrl: NAVIMOW_DIANDIAN_URL }
        ]
      },
      {
        country: "is",
        label: "冰岛 iOS",
        appId: "1602205067",
        charts: [
          { key: "freeUtilities", label: "冰岛工具免费榜", feed: "topfreeapplications", genre: "6002", externalUrl: NAVIMOW_DIANDIAN_URL }
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

async function postJson(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 9000);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        "user-agent": "GameRadar/0.1"
      },
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

function parseTapTapMetric(html, config) {
  const jsonLdBlocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)]
    .map((match) => {
      try {
        return JSON.parse(match[1]);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
  const gameData = jsonLdBlocks.find((item) => item?.["@type"] === "VideoGame") || {};
  const downloadCount = Number(gameData?.interactionStatistic?.userInteractionCount ?? NaN);
  const rating = Number(gameData?.aggregateRating?.ratingValue ?? NaN);
  const ratingCount = Number(gameData?.aggregateRating?.ratingCount ?? NaN);
  const rank = (html.match(/热门下载榜","(#[^"]+)"/) || [])[1] || "";
  return {
    label: config.label || "TapTap",
    appId: config.appId || "",
    url: config.url,
    downloadCount: Number.isFinite(downloadCount) ? downloadCount : null,
    rating: Number.isFinite(rating) ? rating : null,
    ratingCount: Number.isFinite(ratingCount) ? ratingCount : null,
    downloadRank: rank,
    updatedAt: new Date().toISOString()
  };
}

async function getTapTapMetric(config) {
  const html = await fetchText(config.url, {
    "accept-language": "zh-CN,zh;q=0.9,en;q=0.8",
    "user-agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
  });
  return parseTapTapMetric(html, config);
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

function getSteamTopSellerSearchUrl(country) {
  const isGlobal = !country || country === "global";
  const url = new URL("https://store.steampowered.com/search/results/");
  url.searchParams.set("query", "");
  url.searchParams.set("start", "0");
  url.searchParams.set("count", String(STEAM_TOP_SELLER_TOP_LIMIT));
  url.searchParams.set("dynamic_data", "");
  url.searchParams.set("sort_by", "_ASC");
  url.searchParams.set("snr", "1_7_7_7000_7");
  url.searchParams.set("filter", isGlobal ? "globaltopsellers" : "topsellers");
  url.searchParams.set("infinite", "1");
  url.searchParams.set("l", "english");
  if (!isGlobal) {
    url.searchParams.set("cc", country.toUpperCase());
  }
  return url.toString();
}

function getFallbackSteamChartsUrl(country) {
  return `https://store.steampowered.com/charts/topselling/${country === "global" ? "global" : country.toUpperCase()}`;
}

function parseSteamSearchResults(html = "") {
  return [...html.matchAll(/<a\b[^>]*class="[^"]*search_result_row[\s\S]*?<\/a>/gi)]
    .map((match) => {
      const block = match[0];
      const appId = (block.match(/data-ds-appid="(\d+)"/) || [])[1] || "";
      const url = decodeHtml((block.match(/href="([^"]+)"/) || [])[1] || "");
      const title = decodeHtml((block.match(/<span class="title">([\s\S]*?)<\/span>/i) || [])[1] || "");
      const imageUrl = decodeHtml((block.match(/<img[^>]+src="([^"]+)"/i) || [])[1] || "");
      const price = decodeHtml((block.match(/<div class="discount_final_price[^"]*">([\s\S]*?)<\/div>/i) || [])[1] || "");
      return { appId, title, url, imageUrl, price };
    })
    .filter((item) => item.appId && item.title);
}

async function getSteamTopSellerMarket(appId, market) {
  const country = (market.country || "global").toLowerCase();
  const searchUrl = getSteamTopSellerSearchUrl(country);
  const data = await fetchJson(searchUrl);
  if (data?.success !== 1) {
    throw new Error(`Steam top sellers unavailable for ${market.displayCode || country}`);
  }
  const items = parseSteamSearchResults(data.results_html || "");
  const foundIndex = items.findIndex((item) => item.appId === appId);
  return {
    ...market,
    country,
    displayCode: market.displayCode || country.toUpperCase(),
    rank: foundIndex >= 0 ? foundIndex + 1 : null,
    topLimit: STEAM_TOP_SELLER_TOP_LIMIT,
    totalCount: data.total_count ?? null,
    leaders: items.slice(0, 5),
    url: market.url || getFallbackSteamChartsUrl(country),
    sourceUrl: searchUrl,
    updatedAt: new Date().toISOString()
  };
}

async function getSteamTopSellers(appId, markets = []) {
  const selectedMarkets = markets.length ? markets : [{ country: "global", label: "全球畅销", displayCode: "Global" }];
  const results = await Promise.all(
    selectedMarkets.map((market) =>
      getSteamTopSellerMarket(appId, market).catch((error) => ({
        ...market,
        country: (market.country || "global").toLowerCase(),
        displayCode: market.displayCode || (market.country || "global").toUpperCase(),
        rank: null,
        topLimit: STEAM_TOP_SELLER_TOP_LIMIT,
        leaders: [],
        url: market.url || getFallbackSteamChartsUrl((market.country || "global").toLowerCase()),
        updatedAt: new Date().toISOString(),
        error: error.message || "Steam top sellers unavailable"
      }))
    )
  );
  return {
    appId,
    markets: results,
    global: results.find((market) => market.country === "global") || null,
    updatedAt: new Date().toISOString()
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

function getShanghaiDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Shanghai",
    year: "numeric"
  }).formatToParts(date);
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

function formatDate({ year, month, day }) {
  return `${year}-${month}-${day}`;
}

function getQuarterStartDate() {
  const parts = getShanghaiDateParts();
  const month = Number(parts.month);
  const quarterStartMonth = String(Math.floor((month - 1) / 3) * 3 + 1).padStart(2, "0");
  return `${parts.year}-${quarterStartMonth}-01`;
}

function addDays(dateText, days) {
  const date = new Date(`${dateText}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function parseSafeRmbRows(html = "") {
  return [...html.matchAll(/<tr[\s\S]*?<\/tr>/gi)]
    .map((match) =>
      [...match[0].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)]
        .map((cell) => decodeHtml(cell[1]))
        .filter(Boolean)
    )
    .filter((cells) => /^\d{4}-\d{2}-\d{2}$/.test(cells[0]) && cells.length >= 3)
    .map((cells) => ({
      date: cells[0],
      usd: Number(cells[1]) / 100,
      eur: Number(cells[2]) / 100
    }))
    .filter((row) => Number.isFinite(row.usd) && Number.isFinite(row.eur));
}

function buildExchangeRateItem(code, label, latest, quarterBase) {
  const latestValue = latest[code];
  const startValue = quarterBase[code];
  return {
    code: code.toUpperCase(),
    label,
    kind: "middleRate",
    value: latestValue,
    quarterBaseValue: startValue,
    changeLabel: "本季度",
    quarterChangePercent: Number.isFinite(latestValue) && Number.isFinite(startValue) ? ((latestValue - startValue) / startValue) * 100 : null
  };
}

function parseSinaFxQuotes(text = "") {
  const labels = {
    fx_susdcnh: "美元/离岸人民币",
    fx_seurcnh: "欧元/离岸人民币"
  };
  return [...text.matchAll(/var hq_str_(fx_s(?:usd|eur)cnh)="([^"]*)";/g)]
    .map((match) => {
      const symbol = match[1];
      const fields = match[2].split(",");
      const value = Number(fields[1]);
      const change = Number(fields[11]);
      const changePercent = Number(fields[10]);
      return {
        code: symbol === "fx_susdcnh" ? "USD/CNH" : "EUR/CNH",
        label: labels[symbol] || symbol,
        kind: "offshoreSpot",
        value,
        change,
        changeLabel: "实时涨跌",
        changePercent: Number.isFinite(changePercent) ? changePercent : null,
        quoteTime: [fields.at(-1), fields[0]].filter(Boolean).join(" "),
        source: "新浪财经"
      };
    })
    .filter((item) => Number.isFinite(item.value));
}

async function getOffshoreRmbRates() {
  const text = await fetchText(SINA_FX_QUOTE_URL, {
    referer: "https://finance.sina.com.cn",
    "user-agent": "GameRadar/0.1"
  });
  const items = parseSinaFxQuotes(text);
  if (!items.length) {
    throw new Error("Offshore RMB quote unavailable");
  }
  return items;
}

async function getExchangeRates() {
  const endDate = formatDate(getShanghaiDateParts());
  const quarterStartDate = getQuarterStartDate();
  const startDate = addDays(quarterStartDate, -14);
  const url = `${SAFE_RMB_QUERY_URL}?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}&queryYN=true`;
  const [html, offshoreItems] = await Promise.all([
    fetchText(url, {
      "accept-language": "zh-CN,zh;q=0.9,en;q=0.8",
      "user-agent": "GameRadar/0.1"
    }),
    getOffshoreRmbRates().catch(() => [])
  ]);
  const rows = parseSafeRmbRows(html);
  if (!rows.length) {
    throw new Error("SAFE RMB middle-rate data unavailable");
  }
  const latest = rows[0];
  const quarterBase = rows.find((row) => row.date < quarterStartDate) || rows.at(-1);
  return {
    label: "人民币汇率中间价",
    latestDate: latest.date,
    quarterBaseDate: quarterBase.date,
    source: "国家外汇管理局",
    sourceUrl: SAFE_RMB_QUERY_URL,
    items: [
      buildExchangeRateItem("usd", "美元/人民币", latest, quarterBase),
      buildExchangeRateItem("eur", "欧元/人民币", latest, quarterBase),
      ...offshoreItems
    ],
    updatedAt: new Date().toISOString()
  };
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

async function getResearchReports(config = {}) {
  const pageSize = config.pageSize || 3;
  const url = `${config.url}?pageNum=0&pageSize=${pageSize}`;
  const data = await postJson(url);
  if (data?.code !== "0" || !Array.isArray(data.rows)) {
    throw new Error(data?.msg || "Research reports unavailable");
  }
  return {
    label: config.label || "研报",
    sourceUrl: config.sourceUrl || "",
    bidUrl: config.bidUrl || "",
    jdRankUrl: config.jdRankUrl || "",
    jdEmotorcycleRankUrl: config.jdEmotorcycleRankUrl || "",
    items: data.rows.slice(0, pageSize).map((item) => ({
      id: item.id || "",
      title: item.title || "",
      publishDate: item.publishDate || "",
      organizationName: item.organizationName || "",
      rating: item.rating || "",
      url: item.attachmentUrl || ""
    })),
    total: data.total || 0,
    updatedAt: new Date().toISOString()
  };
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
      const [steam, steamReviews, steamTopSellers, stockQuote, tapTap, exchangeRates] = await Promise.all([
        dashboard.steamAppId ? getSteamMetric(dashboard.steamAppId).catch((error) => ({ error: error.message })) : null,
        dashboard.steamAppId
          ? getSteamReviewMetric(dashboard.steamAppId).catch((error) => ({ error: error.message }))
          : null,
        dashboard.steamAppId
          ? getSteamTopSellers(dashboard.steamAppId, dashboard.steamTopSellerMarkets || []).catch((error) => ({
              appId: dashboard.steamAppId,
              markets: [],
              global: null,
              error: error.message || "Steam top sellers unavailable"
            }))
          : null,
        dashboard.stockQuote ? getStockQuote(dashboard.stockQuote).catch((error) => ({ error: error.message })) : null,
        dashboard.tapTap ? getTapTapMetric(dashboard.tapTap).catch((error) => ({ ...dashboard.tapTap, error: error.message })) : null,
        dashboard.exchangeRates ? getExchangeRates().catch((error) => ({ error: error.message })) : null
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
      const researchReports = dashboard.researchReports
        ? await getResearchReports(dashboard.researchReports).catch((error) => ({
            label: dashboard.researchReports.label || "研报",
            sourceUrl: dashboard.researchReports.sourceUrl || "",
            bidUrl: dashboard.researchReports.bidUrl || "",
            jdRankUrl: dashboard.researchReports.jdRankUrl || "",
            jdEmotorcycleRankUrl: dashboard.researchReports.jdEmotorcycleRankUrl || "",
            items: [],
            total: 0,
            updatedAt: new Date().toISOString(),
            error: error.message || "Research reports unavailable"
          }))
        : null;
      return { ...dashboard, steam, steamReviews, steamTopSellers, stockQuote, tapTap, exchangeRates, apple, amazon, researchReports };
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
        name: "Steam Top Sellers Search",
        url: "https://store.steampowered.com/search/?filter=topsellers"
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
        name: "SAFE RMB middle rate",
        url: SAFE_RMB_QUERY_URL
      },
      {
        name: "Sina Finance FX quote",
        url: SINA_FX_QUOTE_URL
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
