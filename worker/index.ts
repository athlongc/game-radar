import handler from "vinext/server/app-router-entry";

interface Env {
  ASSETS: Fetcher;
  SRM_SECRET?: string;
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (env.SRM_SECRET) process.env.SRM_SECRET = env.SRM_SECRET;
    return handler.fetch(request, env, ctx);
  }
};

export default worker;
