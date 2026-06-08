// Nomi daily-stats ingest endpoint.
// POST with header X-API-Key: <plaintext> and a JSON body that is either
//   a single row { report_date, offer_id, source?, clicks?, conversions?, revenue?, cost? }
//   or an array of such rows.
// We upsert on (report_date, offer_id, source) so re-sends are idempotent.

import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type IngestRow = {
  report_date: string;
  offer_id: string | number;
  source?: string;
  clicks?: number;
  conversions?: number;
  revenue?: number | string;
  cost?: number | string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  raw_data?: any;
};

function isValidISODate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + "T00:00:00Z");
  return !isNaN(d.getTime());
}

function normalize(r: IngestRow): { ok: true; row: Record<string, unknown> } | { ok: false; error: string } {
  if (!r || typeof r !== "object") return { ok: false, error: "row is not an object" };
  if (!r.report_date || !isValidISODate(String(r.report_date))) {
    return { ok: false, error: `report_date must be YYYY-MM-DD (got ${r.report_date})` };
  }
  if (r.offer_id === undefined || r.offer_id === null || r.offer_id === "") {
    return { ok: false, error: "offer_id is required" };
  }
  const clicks = Number(r.clicks ?? 0);
  const conversions = Number(r.conversions ?? 0);
  const revenue = Number(r.revenue ?? 0);
  const cost = Number(r.cost ?? 0);
  if ([clicks, conversions, revenue, cost].some((n) => isNaN(n))) {
    return { ok: false, error: "clicks/conversions/revenue/cost must be numbers" };
  }
  return {
    ok: true,
    row: {
      report_date: r.report_date,
      offer_id: String(r.offer_id),
      source: r.source && String(r.source).trim() ? String(r.source).trim() : "nomi",
      clicks,
      conversions,
      revenue,
      cost,
      raw_data: r.raw_data ?? null,
      updated_at: new Date().toISOString(),
    },
  };
}

export async function POST(request: Request) {
  const presented = request.headers.get("x-api-key") ?? "";
  if (!presented) {
    return NextResponse.json(
      { error: "Missing X-API-Key header" },
      { status: 401 },
    );
  }
  const presentedHash = createHash("sha256").update(presented).digest("hex");

  const supabase = createServiceClient();
  const { data: keyRow } = await supabase
    .from("api_ingest_keys")
    .select("id, scopes, revoked_at")
    .eq("key_hash", presentedHash)
    .maybeSingle();
  if (!keyRow) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }
  if (keyRow.revoked_at) {
    return NextResponse.json({ error: "API key has been revoked" }, { status: 401 });
  }
  const scopes: string[] = keyRow.scopes ?? [];
  if (!scopes.includes("nomi") && !scopes.includes("*")) {
    return NextResponse.json(
      { error: "Key does not have 'nomi' scope" },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const rawRows: IngestRow[] = Array.isArray(body) ? (body as IngestRow[]) : [body as IngestRow];
  if (rawRows.length === 0) {
    return NextResponse.json({ error: "Empty payload" }, { status: 400 });
  }
  if (rawRows.length > 5000) {
    return NextResponse.json(
      { error: "Too many rows (max 5000 per request)" },
      { status: 400 },
    );
  }

  const valid: Record<string, unknown>[] = [];
  const errors: { index: number; error: string }[] = [];
  rawRows.forEach((r, i) => {
    const n = normalize(r);
    if (n.ok) valid.push(n.row);
    else errors.push({ index: i, error: n.error });
  });

  if (valid.length === 0) {
    return NextResponse.json(
      { ok: false, inserted: 0, updated: 0, errors },
      { status: 400 },
    );
  }

  const { data: upserted, error: upErr } = await supabase
    .from("nomi_daily_stats")
    .upsert(valid, { onConflict: "report_date,offer_id,source" })
    .select("id");
  if (upErr) {
    return NextResponse.json(
      { ok: false, error: upErr.message, errors },
      { status: 500 },
    );
  }

  await supabase
    .from("api_ingest_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", keyRow.id);

  await supabase.from("activity_log").insert({
    entity_type: "offer",
    entity_id: "00000000-0000-0000-0000-000000000000",
    action: "nomi_ingest",
    to_value: `${valid.length} rows`,
  });

  return NextResponse.json({
    ok: true,
    received: rawRows.length,
    processed: valid.length,
    skipped: errors.length,
    errors,
    upserted_ids: upserted?.length ?? 0,
  });
}
