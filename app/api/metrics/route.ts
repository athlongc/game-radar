import { getMetrics } from "../../../server.js";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const dashboardId = url.searchParams.get("dashboard") || null;
    const force = url.searchParams.get("force") === "1";
    const payload = await getMetrics({ force, dashboardId });
    return Response.json(payload, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: message }, { status: 500, headers: { "cache-control": "no-store" } });
  }
}
