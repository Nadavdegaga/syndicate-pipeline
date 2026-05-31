// Vercel Cron endpoint — runs every 6 hours per vercel.json.
// Picks active connections whose last_sync_at is older than sync_frequency_hours
// (or null) and runs syncConnection for each, up to 5 concurrent.

import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { syncConnection } from "@/lib/platforms/sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_CONCURRENT = 5;

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get("authorization") ?? "";
  // Vercel Cron sends "Bearer <secret>". Also accept x-cron-secret for ad-hoc calls.
  if (auth === `Bearer ${secret}`) return true;
  if (request.headers.get("x-cron-secret") === secret) return true;
  return false;
}

async function runWithLimit<T, R>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length) as R[];
  let i = 0;
  async function next(): Promise<void> {
    while (true) {
      const idx = i++;
      if (idx >= items.length) return;
      results[idx] = await worker(items[idx]);
    }
  }
  const workers = Array.from({ length: Math.min(limit, items.length) }, () =>
    next(),
  );
  await Promise.all(workers);
  return results;
}

export async function GET(request: Request) {
  return handle(request);
}
export async function POST(request: Request) {
  return handle(request);
}

async function handle(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const { data: connections, error } = await supabase
    .from("platform_connections")
    .select("id, sync_frequency_hours, last_sync_at, active, platform")
    .eq("active", true);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const now = Date.now();
  const due = (connections ?? []).filter((c) => {
    if (!c.last_sync_at) return true;
    const last = new Date(c.last_sync_at).getTime();
    const hours = c.sync_frequency_hours ?? 24;
    return now - last >= hours * 3600_000;
  });

  if (due.length === 0) {
    return NextResponse.json({
      ok: true,
      message: "No connections due for sync",
      considered: connections?.length ?? 0,
      ran: 0,
    });
  }

  const results = await runWithLimit(due, MAX_CONCURRENT, async (c) => {
    try {
      const r = await syncConnection(c.id, "cron");
      return {
        connection_id: c.id,
        platform: c.platform,
        status: r.status,
        fetched: r.offers_fetched,
        new: r.offers_new,
        updated: r.offers_updated,
        deactivated: r.offers_deactivated,
        error: r.error,
      };
    } catch (e) {
      return {
        connection_id: c.id,
        platform: c.platform,
        status: "error" as const,
        fetched: 0,
        new: 0,
        updated: 0,
        deactivated: 0,
        error: e instanceof Error ? e.message : String(e),
      };
    }
  });

  return NextResponse.json({
    ok: true,
    considered: connections?.length ?? 0,
    ran: results.length,
    results,
  });
}
