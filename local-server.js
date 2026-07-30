import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { getMetrics } from "./server.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const publicDir = join(__dirname, "public");
const PORT = Number(process.env.PORT || 5177);
const HOST = process.env.HOST || (process.env.PORT ? "0.0.0.0" : "127.0.0.1");
const PUBLIC_DASHBOARD_IDS = ["heartopia", "torchlight-infinite", "shiji-huatong"];
const TAPTAP_HISTORY_PATH = join(publicDir, "data", "taptap-history.json");
const TAPTAP_HISTORY_REMOTE_URL =
  process.env.TAPTAP_HISTORY_REMOTE_URL ||
  "https://raw.githubusercontent.com/athlongc/game-radar/main/public/data/taptap-history.json";
const TAPTAP_HISTORY_CACHE_TTL_MS = 5 * 60 * 1000;

let tapTapHistoryCache = null;

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webmanifest": "application/manifest+json; charset=utf-8"
};

function json(res, status, payload, headers = {}) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    ...headers
  });
  res.end(JSON.stringify(payload));
}

function validateTapTapHistory(payload) {
  if (!payload || typeof payload !== "object" || !payload.games || typeof payload.games !== "object") {
    throw new Error("TapTap history response is incomplete");
  }
  return payload;
}

async function fetchRemoteTapTapHistory() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(TAPTAP_HISTORY_REMOTE_URL, {
      headers: {
        accept: "application/json",
        "user-agent": "Game-Radar-Local-History-Sync/1.0"
      },
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`GitHub history request failed: ${response.status}`);
    return validateTapTapHistory(await response.json());
  } finally {
    clearTimeout(timeout);
  }
}

async function getTapTapHistory() {
  if (tapTapHistoryCache && Date.now() - tapTapHistoryCache.cachedAt < TAPTAP_HISTORY_CACHE_TTL_MS) {
    return { ...tapTapHistoryCache, cached: true };
  }

  try {
    const payload = await fetchRemoteTapTapHistory();
    tapTapHistoryCache = { payload, source: "github", cachedAt: Date.now() };
    return { ...tapTapHistoryCache, cached: false };
  } catch (error) {
    const payload = validateTapTapHistory(JSON.parse(await readFile(TAPTAP_HISTORY_PATH, "utf8")));
    tapTapHistoryCache = { payload, source: "local-fallback", cachedAt: Date.now() };
    console.warn(`TapTap history remote sync failed; using local fallback: ${error.message}`);
    return { ...tapTapHistoryCache, cached: false };
  }
}

function isLocalRequest(req) {
  const rawHost = req.headers.host || "";
  const host = rawHost.startsWith("[") ? rawHost.slice(1, rawHost.indexOf("]")) : rawHost.split(":")[0];
  return host === "localhost" || host === "127.0.0.1" || host === "::1";
}

async function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const requestPath = url.pathname === "/" ? "/local-index.html" : decodeURIComponent(url.pathname);
  const filePath = resolve(publicDir, `.${requestPath}`);
  if (filePath !== publicDir && !filePath.startsWith(`${publicDir}${sep}`)) {
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
      const dashboardId = local ? requestedDashboardId || null : null;
      const dashboardIds = local ? null : PUBLIC_DASHBOARD_IDS;
      const force = url.searchParams.get("force") === "1";
      json(res, 200, await getMetrics({ force, dashboardId, dashboardIds }));
      return;
    }
    if (url.pathname === "/api/health") {
      json(res, 200, { ok: true });
      return;
    }
    if (url.pathname === "/data/taptap-history.json" && isLocalRequest(req)) {
      const history = await getTapTapHistory();
      json(res, 200, history.payload, {
        "x-taptap-history-source": history.source,
        "x-taptap-history-cache": history.cached ? "hit" : "miss"
      });
      return;
    }
    await serveStatic(req, res);
  } catch (error) {
    const status = error instanceof RangeError ? 400 : 500;
    json(res, status, { error: error.message || "Unknown error" });
  }
}).listen(PORT, HOST, () => {
  console.log(`Game Radar running at http://${HOST}:${PORT}`);
});
