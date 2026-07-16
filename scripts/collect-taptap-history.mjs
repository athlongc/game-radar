import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const TIME_ZONE = "Asia/Shanghai";
const MAX_SNAPSHOTS = 730;
const X_UA =
  "V=1&PN=WebApp&LANG=zh_CN&VN_CODE=102&LOC=CN&PLT=PC&DS=Android&UID=d52ddf3e-6028-4fa4-ba5a-56d8a7bb4729&OS=Windows&OSV=10&DT=PC";
const APPS = [
  { dashboardId: "heartopia", appId: "45213", title: "心动小镇" },
  { dashboardId: "torchlight-infinite", appId: "172664", title: "火炬之光：无限" }
];

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const outputPath = path.resolve(scriptDirectory, "../public/data/taptap-history.json");

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function getShanghaiDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function toFiniteNumber(value, fieldName) {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new Error(`TapTap field unavailable: ${fieldName}`);
  return number;
}

async function fetchTapTapApp(appId) {
  const params = new URLSearchParams({
    id: String(appId),
    Identifier: `auto_${appId}`,
    "X-UA": X_UA
  });
  let lastError;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    try {
      const response = await fetch(`https://api.taptapdada.com/app/v3/detail?${params}`, {
        headers: {
          accept: "application/json",
          "user-agent": "Game-Radar-Daily-Snapshot/1.0"
        },
        signal: controller.signal
      });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      const payload = await response.json();
      if (!payload?.success || !payload?.data?.app) throw new Error("TapTap returned an incomplete response");
      return payload.data.app;
    } catch (error) {
      lastError = error;
      if (attempt < 3) await delay(500 * attempt);
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError;
}

function createSnapshot(app, capturedAt) {
  const stat = app.stat || {};
  const rating = stat.rating || {};
  const mobileDownloadCount = toFiniteNumber(stat.hits_total, "hits_total");
  const pcDownloadCount = toFiniteNumber(stat.pc_download_count, "pc_download_count");

  return {
    date: getShanghaiDateKey(new Date(capturedAt)),
    capturedAt,
    downloadCount: mobileDownloadCount + pcDownloadCount,
    mobileDownloadCount,
    pcDownloadCount,
    fansCount: toFiniteNumber(stat.fans_count, "fans_count"),
    reviewCount: toFiniteNumber(stat.review_count, "review_count"),
    rating: toFiniteNumber(rating.score, "rating.score"),
    latestScore: toFiniteNumber(rating.latest_score, "rating.latest_score"),
    latestReviewCount: toFiniteNumber(rating.latest_review_count, "rating.latest_review_count"),
    latestVersionScore: toFiniteNumber(rating.latest_version_score, "rating.latest_version_score"),
    latestVersionReviewCount: toFiniteNumber(
      rating.latest_version_review_count,
      "rating.latest_version_review_count"
    ),
    version: app.download?.apk?.version_name || "",
    updateDate: app.update_date || ""
  };
}

async function readHistory() {
  try {
    const value = JSON.parse(await readFile(outputPath, "utf8"));
    return value && typeof value === "object" ? value : {};
  } catch (error) {
    if (error.code === "ENOENT") return {};
    throw error;
  }
}

async function main() {
  const capturedAt = new Date().toISOString();
  const collected = [];

  for (const config of APPS) {
    const app = await fetchTapTapApp(config.appId);
    collected.push({ config, snapshot: createSnapshot(app, capturedAt), title: app.title || config.title });
    await delay(350);
  }

  const history = await readHistory();
  history.schemaVersion = 1;
  history.timezone = TIME_ZONE;
  history.updatedAt = capturedAt;
  history.games = history.games && typeof history.games === "object" ? history.games : {};

  for (const { config, snapshot, title } of collected) {
    const existing = history.games[config.dashboardId]?.snapshots || [];
    const snapshots = [...existing.filter((item) => item?.date !== snapshot.date), snapshot]
      .sort((left, right) => String(left.date).localeCompare(String(right.date)))
      .slice(-MAX_SNAPSHOTS);
    history.games[config.dashboardId] = {
      appId: config.appId,
      title,
      snapshots
    };
  }

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(history, null, 2)}\n`, "utf8");

  for (const { config, snapshot } of collected) {
    console.log(
      `${config.dashboardId}: PC ${snapshot.pcDownloadCount}, total ${snapshot.downloadCount}, date ${snapshot.date}`
    );
  }
}

await main();
