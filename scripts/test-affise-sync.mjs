// Quick test script — runs the Affise stats fetch + ingest without needing the web server.
// Usage:
//   node scripts/test-affise-sync.mjs                        → yesterday
//   node scripts/test-affise-sync.mjs 2026-05-30             → single date
//   node scripts/test-affise-sync.mjs 2026-02-01 2026-02-28  → date range

import { readFileSync } from "fs";
import { resolve } from "path";

// Parse .env.local
const envLines = readFileSync(resolve(process.cwd(), ".env.local"), "utf8").split("\n");
for (const line of envLines) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eq = trimmed.indexOf("=");
  if (eq === -1) continue;
  const key = trimmed.slice(0, eq).trim();
  const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
  process.env[key] = val;
}

const AFFISE_API_KEY  = process.env.AFFISE_API_KEY;
const AFFISE_BASE_URL = (process.env.AFFISE_BASE_URL ?? "").replace(/\/+$/, "").replace(/\/3\.0$/, "");
const SUPABASE_URL    = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY    = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!AFFISE_API_KEY)  { console.error("ERROR: AFFISE_API_KEY not set");  process.exit(1); }
if (!AFFISE_BASE_URL) { console.error("ERROR: AFFISE_BASE_URL not set"); process.exit(1); }
if (!SUPABASE_URL)    { console.error("ERROR: NEXT_PUBLIC_SUPABASE_URL not set"); process.exit(1); }
if (!SUPABASE_KEY)    { console.error("ERROR: SUPABASE_SERVICE_ROLE_KEY not set"); process.exit(1); }

// Build date list
function yesterday() {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

function datesInRange(from, to) {
  const dates = [];
  const cur = new Date(from + "T00:00:00Z");
  const end = new Date(to   + "T00:00:00Z");
  while (cur <= end) {
    dates.push(cur.toISOString().slice(0, 10));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return dates;
}

const arg1 = process.argv[2];
const arg2 = process.argv[3];
const dates = arg1 && arg2
  ? datesInRange(arg1, arg2)
  : arg1
    ? [arg1]
    : [yesterday()];

console.log("=== Affise Sync ===");
console.log(`Range:    ${dates[0]} → ${dates[dates.length - 1]} (${dates.length} day${dates.length > 1 ? "s" : ""})`);
console.log(`Base URL: ${AFFISE_BASE_URL}`);
console.log(`API Key:  ${AFFISE_API_KEY.slice(0, 8)}...`);
console.log("");

// ── Fetch one date from Affise ─────────────────────────────────────────────
async function fetchDate(date) {
  const rows = [];
  for (let page = 1; page <= 20; page++) {
    const url = new URL(`${AFFISE_BASE_URL}/3.0/stats/getbyprogram`);
    url.searchParams.set("filter[date_from]", date);
    url.searchParams.set("filter[date_to]",   date);
    url.searchParams.set("limit",     "500");
    url.searchParams.set("page",      String(page));
    url.searchParams.set("orderType", "asc");

    const res = await fetch(url.toString(), { headers: { "API-Key": AFFISE_API_KEY } });
    if (!res.ok) throw new Error(`Affise HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const json = await res.json();
    const stats = json.stats ?? [];

    for (const s of stats) {
      const confirmed = s.actions?.confirmed ?? {};
      rows.push({
        report_date:  date,
        offer_id:     String(s.slice.offer.id),
        source:       "affise",
        clicks:       Number(s.traffic?.raw) || 0,
        conversions:  confirmed.count   || 0,
        revenue:      confirmed.charge  || 0,
        cost:         confirmed.revenue || 0,
        raw_data:     s,
        updated_at:   new Date().toISOString(),
      });
    }

    const total   = json.pagination?.total_count ?? 0;
    const fetched = (page - 1) * 500 + stats.length;
    if (fetched >= total || stats.length < 500) break;
  }
  return rows;
}

// ── Upsert batch to Supabase ───────────────────────────────────────────────
async function upsert(rows) {
  const BATCH = 500;
  let total = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const res = await fetch(`${SUPABASE_URL}/rest/v1/affise_daily_stats`, {
      method: "POST",
      headers: {
        "apikey":        SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
        "Content-Type":  "application/json",
        "Prefer":        "resolution=merge-duplicates,return=representation",
      },
      body: JSON.stringify(batch),
    });
    if (!res.ok) throw new Error(`Supabase ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const data = await res.json();
    total += Array.isArray(data) ? data.length : 0;
  }
  return total;
}

// ── Main loop ──────────────────────────────────────────────────────────────
let totalFetched = 0;
let totalUpserted = 0;
let errors = 0;

for (const date of dates) {
  process.stdout.write(`  ${date} ... `);
  try {
    const rows    = await fetchDate(date);
    const upserted = rows.length > 0 ? await upsert(rows) : 0;
    totalFetched  += rows.length;
    totalUpserted += upserted;
    const nonZero = rows.filter(r => r.clicks > 0 || r.conversions > 0 || r.revenue > 0);
    console.log(`fetched ${rows.length} offers, upserted ${upserted}${nonZero.length > 0 ? `, ${nonZero.length} with activity` : ""}`);
  } catch (e) {
    console.log(`ERROR: ${e.message}`);
    errors++;
  }
}

console.log("");
console.log(`=== Done ===`);
console.log(`Dates processed: ${dates.length - errors}/${dates.length}`);
console.log(`Total rows fetched:   ${totalFetched}`);
console.log(`Total rows upserted:  ${totalUpserted}`);
if (errors > 0) console.log(`Errors: ${errors}`);
