import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const INSPECTOR_URL = "http://127.0.0.1:9229/json/list";
const DEFAULT_GAMES = [
  { appId: "172664", title: "火炬之光：无限" },
  { appId: "45213", title: "心动小镇" }
];

function parseGames(args) {
  if (args.length === 0) return DEFAULT_GAMES;
  return args.map((argument) => {
    const [appId, ...titleParts] = argument.split(":");
    if (!/^\d+$/.test(appId)) throw new Error(`无效的 TapTap 游戏 ID：${appId}`);
    return { appId, title: titleParts.join(":") || `TapTap ${appId}` };
  });
}

async function findTapTapPid() {
  const { stdout } = await execFileAsync("ps", ["-axo", "pid=,command="]);
  const processLine = stdout
    .split("\n")
    .map((line) => line.trim())
    .find((line) => /\/Applications\/TapTap\.app\/Contents\/MacOS\/TapTap(?:\s|$)/.test(line));

  if (!processLine) {
    throw new Error("TapTap 未运行。请先启动并登录 TapTap Mac 客户端。");
  }

  return Number(processLine.match(/^\d+/)?.[0]);
}

async function fetchInspectorTarget() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 500);
  try {
    const response = await fetch(INSPECTOR_URL, { signal: controller.signal });
    if (!response.ok) return null;
    const targets = await response.json();
    return (
      targets.find(
        (target) =>
          target?.type === "node" &&
          target?.title === "electron/js2c/browser_init" &&
          typeof target?.webSocketDebuggerUrl === "string"
      ) || null
    );
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function ensureInspector(pid) {
  const existing = await fetchInspectorTarget();
  if (existing) return { target: existing, openedByCollector: false };

  process.kill(pid, "SIGUSR1");
  for (let attempt = 0; attempt < 40; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    const target = await fetchInspectorTarget();
    if (target) return { target, openedByCollector: true };
  }

  throw new Error("无法连接 TapTap 后台进程。请退出并重新打开 TapTap 后再试。");
}

class DevToolsConnection {
  constructor(url) {
    this.socket = new WebSocket(url);
    this.pending = new Map();
    this.nextId = 1;
  }

  async open() {
    this.socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      const resolver = this.pending.get(message.id);
      if (!resolver) return;
      this.pending.delete(message.id);
      resolver(message);
    });

    await new Promise((resolve, reject) => {
      this.socket.addEventListener("open", resolve, { once: true });
      this.socket.addEventListener("error", reject, { once: true });
    });
    await this.send("Runtime.enable");
  }

  send(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolve) => {
      this.pending.set(id, resolve);
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    this.socket.close();
  }
}

function buildQueryExpression(games) {
  return `(async () => {
    const net = process.mainModule.require("node:net");
    const os = process.mainModule.require("node:os");
    const path = process.mainModule.require("node:path");
    const socketPath = path.join(
      os.homedir(),
      "Library/Caches/TapTap/run/ipc/tappc_cn_http.sock"
    );
    const games = ${JSON.stringify(games)};

    function dechunk(body) {
      const output = [];
      let offset = 0;
      while (offset < body.length) {
        const sizeEnd = body.indexOf("\\r\\n", offset);
        if (sizeEnd < 0) break;
        const size = Number.parseInt(body.slice(offset, sizeEnd), 16);
        if (!Number.isFinite(size) || size === 0) break;
        const start = sizeEnd + 2;
        output.push(body.slice(start, start + size));
        offset = start + size + 2;
      }
      return output.join("");
    }

    function request(requestPath) {
      return new Promise((resolve, reject) => {
        const socket = net.createConnection(socketPath);
        const chunks = [];
        socket.setTimeout(15000);
        socket.on("connect", () => {
          socket.write(
            "GET " + requestPath + " HTTP/1.1\\r\\n" +
              "Host: api.taptapdada.com\\r\\n" +
              "Accept: application/json\\r\\n" +
              "Accept-Encoding: identity\\r\\n" +
              "User-Agent: TapTap/2026.7.28-rel.3\\r\\n" +
              "X-TAPPC-PROXY: taptap\\r\\n" +
              "Connection: close\\r\\n\\r\\n"
          );
        });
        socket.on("data", (chunk) => chunks.push(chunk));
        socket.on("end", () => {
          try {
            const raw = Buffer.concat(chunks).toString("utf8");
            const separator = raw.indexOf("\\r\\n\\r\\n");
            if (separator < 0) throw new Error("TapTap 返回了无法识别的数据");
            const headers = raw.slice(0, separator).toLowerCase();
            let body = raw.slice(separator + 4);
            if (headers.includes("transfer-encoding: chunked")) body = dechunk(body);
            resolve(JSON.parse(body));
          } catch (error) {
            reject(error);
          }
        });
        socket.on("timeout", () => {
          socket.destroy();
          reject(new Error("TapTap 请求超时"));
        });
        socket.on("error", reject);
      });
    }

    const results = [];
    for (const game of games) {
      const online = await request(
        "/group/v1/online-players-count?app_id=" + encodeURIComponent(game.appId)
      );
      await new Promise((resolve) => setTimeout(resolve, 150));
      const team = await request(
        "/group/v1/team-list-count?app_id=" + encodeURIComponent(game.appId)
      );
      results.push({
        ...game,
        online: online?.success ? online.data?.total : null,
        team: team?.success ? team.data?.total : null,
        onlineError: online?.success ? null : online?.data?.msg || "查询失败",
        teamError: team?.success ? null : team?.data?.msg || "查询失败"
      });
      await new Promise((resolve) => setTimeout(resolve, 350));
    }
    return results;
  })()`;
}

async function closeInspector(connection) {
  await connection.send("Runtime.evaluate", {
    expression:
      "setTimeout(() => process.mainModule.require('node:inspector').close(), 100); true",
    returnByValue: true
  });
}

async function main() {
  const games = parseGames(process.argv.slice(2));
  const pid = await findTapTapPid();
  const { target, openedByCollector } = await ensureInspector(pid);
  const connection = new DevToolsConnection(target.webSocketDebuggerUrl);

  try {
    await connection.open();
    const response = await connection.send("Runtime.evaluate", {
      expression: buildQueryExpression(games),
      awaitPromise: true,
      returnByValue: true
    });
    if (response.result?.exceptionDetails) {
      throw new Error(response.result.exceptionDetails.text || "TapTap 查询执行失败");
    }

    const results = response.result?.result?.value;
    if (!Array.isArray(results)) throw new Error("TapTap 查询没有返回有效结果");

    const capturedAt = new Date().toISOString();
    console.log(JSON.stringify({ capturedAt, games: results }, null, 2));
  } finally {
    if (openedByCollector) {
      try {
        await closeInspector(connection);
      } catch {
        // TapTap remains usable even if the temporary inspector is already closed.
      }
    }
    connection.close();
  }
}

await main();
