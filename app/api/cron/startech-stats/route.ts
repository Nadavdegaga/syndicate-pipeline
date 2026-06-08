// Vercel Cron — runs daily at 04:00 UTC to ingest the previous day's StarTech stats.
// Auth: CRON_SECRET (Bearer header or x-cron-secret header).
// Optional query param ?date=YYYY-MM-DD to sync a specific date (useful for backfill).

import { NextResponse } from "next/server";
import { syncStarTechStatsForDate } from "@/lib/startech/sync-stats";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get("authorization") ?? "";
  if (auth === `Bearer ${secret}`) return true;
  if (request.headers.get("x-cron-secret") === secret) return true;
  return false;
}

function yesterday(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
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

  const url = new URL(request.url);
  const date = url.searchParams.get("date") ?? yesterday();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Invalid date format, expected YYYY-MM-DD" }, { status: 400 });
  }

  const result = await syncStarTechStatsForDate(date);

  return NextResponse.json(
    {
      ok: result.ok,
      date: result.date,
      fetched: result.fetched,
      upserted: result.upserted,
      ...(result.error ? { error: result.error } : {}),
    },
    { status: result.ok ? 200 : 500 },
  );
}
