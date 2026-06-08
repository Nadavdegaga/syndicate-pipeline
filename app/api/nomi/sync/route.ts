// Manual Nomi stats sync — authenticated via user session.
// POST /api/nomi/sync
// Body: { date?: "YYYY-MM-DD" }  — defaults to yesterday if omitted.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { syncNomiStatsForDate } from "@/lib/nomi/sync-stats";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function yesterday(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let date = yesterday();
  try {
    const body = await request.json();
    if (body?.date && /^\d{4}-\d{2}-\d{2}$/.test(body.date)) {
      date = body.date;
    }
  } catch {
    // No body or invalid JSON — use yesterday
  }

  const result = await syncNomiStatsForDate(date);

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
