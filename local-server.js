import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

import { getMetrics } from "./server.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const publicDir = join(__dirname, "public");
const PORT = Number(process.env.PORT || 5177);

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webmanifest": "application/manifest+json; charset=utf-8"
};

function json(res, status, payload) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  });
  res.end(JSON.stringify(payload));
}

async function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const requestPath = url.pathname === "/" ? "/local-index.html" : decodeURIComponent(url.pathname);
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
      const dashboardId = url.searchParams.get("dashboard") || null;
      const force = url.searchParams.get("force") === "1";
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
