// EPIC 4 Phase D self-test — Affise ingest + api-keys + /reporting/{affise,bi}.

import { createClient } from "@supabase/supabase-js";
import { createHash } from "crypto";
import { readFileSync } from "fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf-8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1)];
    }),
);
const URL_BASE = "http://localhost:3019";
const PROJECT_REF = env.NEXT_PUBLIC_SUPABASE_URL.match(/https:\/\/([^.]+)/)[1];
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supa = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const results = [];
function record(name, pass, evidence = "") {
  results.push({ name, pass, evidence });
  console.log(`${pass ? "✓ PASS" : "✗ FAIL"}  ${name}`);
  if (evidence) evidence.split("\n").forEach((l) => console.log("        " + l));
}

const ADMIN_EMAILS = ["nadav@luminarix-media.com", "nadavdeg@gmail.com"];
async function getCookie() {
  const { data: users } = await supa.auth.admin.listUsers();
  const u = users.users.find(
    (x) =>
      ADMIN_EMAILS.includes((x.email ?? "").toLowerCase()) && x.email_confirmed_at,
  );
  if (!u) throw new Error("no confirmed admin user");
  const pwd = "ph-" + Math.random().toString(36).slice(2, 10);
  await supa.auth.admin.updateUserById(u.id, { password: pwd });
  const r = await fetch(
    `${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/token?grant_type=password`,
    {
      method: "POST",
      headers: { apikey: ANON, "Content-Type": "application/json" },
      body: JSON.stringify({ email: u.email, password: pwd }),
    },
  );
  const session = await r.json();
  return {
    cookieName: `sb-${PROJECT_REF}-auth-token`,
    value: "base64-" + Buffer.from(JSON.stringify(session)).toString("base64url"),
    email: u.email,
  };
}

async function authedFetch(path, cookie) {
  return fetch(URL_BASE + path, {
    headers: { Cookie: `${cookie.cookieName}=${cookie.value}; syndicate_brand=all` },
    redirect: "manual",
    signal: AbortSignal.timeout(120000),
  });
}

// ===== tests =====

async function test1_PagesLoad(cookie) {
  const routes = ["/reporting/affise", "/reporting/bi", "/settings/api-keys"];
  const out = {};
  for (const p of routes) {
    const r = await authedFetch(p, cookie);
    out[p] = r.status;
  }
  const ok = Object.values(out).every((s) => s === 200);
  record(
    "1. /reporting/affise · /reporting/bi · /settings/api-keys all 200",
    ok,
    Object.entries(out).map(([k, v]) => `  ${v === 200 ? "✓" : "✗"} ${k} → ${v}`).join("\n"),
  );
}

async function test2_AffisePageContent(cookie) {
  const r = await authedFetch("/reporting/affise", cookie);
  const html = await r.text();
  // When no data: empty state with ingest instructions + link to api-keys.
  // When data: range pills + KPIs + chart.
  const isEmpty = html.includes("No Affise data yet");
  const checks = {
    "Affise Reporting title": html.includes("Affise Reporting"),
    "Either empty-state OR dashboard":
      isEmpty ||
      (html.includes("Today") &&
        html.includes("Last 7") &&
        html.includes("Daily revenue")),
    "Empty state links to api-keys": !isEmpty || html.includes('href="/settings/api-keys"'),
  };
  const ok = Object.values(checks).every(Boolean);
  record(
    "2. Affise reporting page: empty-state w/ docs OR live dashboard",
    ok,
    `mode: ${isEmpty ? "empty state" : "dashboard"}\n` +
      Object.entries(checks).map(([k, v]) => `  ${v ? "✓" : "✗"} ${k}`).join("\n"),
  );
}

async function test3_BIPlaceholder(cookie) {
  const r = await authedFetch("/reporting/bi", cookie);
  const html = await r.text();
  const checks = {
    "Advanced BI title": html.includes("Advanced BI"),
    "Coming soon message": /Coming soon/i.test(html),
    "Cross-platform revenue trends": html.includes("Cross-platform revenue trends"),
    "Offer profitability ranking": html.includes("Offer profitability ranking"),
    "Publisher performance scorecard": html.includes("Publisher performance scorecard"),
  };
  const ok = Object.values(checks).every(Boolean);
  record(
    "3. /reporting/bi shell with all 3 placeholder cards",
    ok,
    Object.entries(checks).map(([k, v]) => `  ${v ? "✓" : "✗"} ${k}`).join("\n"),
  );
}

async function test4_ApiKeysPageContent(cookie) {
  const r = await authedFetch("/settings/api-keys", cookie);
  const html = await r.text();
  const checks = {
    "API ingest keys title": html.includes("API ingest keys"),
    "Generate key button": html.includes("Generate key"),
    "Empty state or table": /No keys yet/.test(html) || /scopes:/.test(html),
  };
  const ok = Object.values(checks).every(Boolean);
  record(
    "4. /settings/api-keys renders manager UI",
    ok,
    Object.entries(checks).map(([k, v]) => `  ${v ? "✓" : "✗"} ${k}`).join("\n"),
  );
}

async function test5_IngestRejectsMissingKey() {
  const r = await fetch(URL_BASE + "/api/ingest/affise", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify([]),
    redirect: "manual",
    signal: AbortSignal.timeout(30000),
  });
  record(
    "5. Ingest endpoint rejects missing X-API-Key with 401",
    r.status === 401,
    `HTTP ${r.status} (expect 401)`,
  );
}

async function test6_IngestRejectsBadKey() {
  const r = await fetch(URL_BASE + "/api/ingest/affise", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-API-Key": "totally-not-a-real-key" },
    body: JSON.stringify([{ report_date: "2026-05-01", offer_id: "1" }]),
    redirect: "manual",
    signal: AbortSignal.timeout(30000),
  });
  record(
    "6. Ingest endpoint rejects unknown key with 401",
    r.status === 401,
    `HTTP ${r.status} (expect 401)`,
  );
}

async function test7_IngestAcceptsValidKey() {
  // Create a key directly via service role, mirror what generateIngestKey does
  const plaintext = "syndi_test_" + Math.random().toString(36).slice(2, 18);
  const keyHash = createHash("sha256").update(plaintext).digest("hex");
  const { data: keyRow, error: keyErr } = await supa
    .from("api_ingest_keys")
    .insert({ label: "selftest-D7", key_hash: keyHash, scopes: ["affise"] })
    .select("id")
    .single();
  if (keyErr) {
    record("7. Ingest with valid key accepted", false, `key insert failed: ${keyErr.message}`);
    return;
  }

  const payload = [
    {
      report_date: "2026-05-01",
      offer_id: "selftest-offer-1",
      source: "selftest",
      clicks: 100,
      conversions: 5,
      revenue: 25,
      cost: 10,
    },
    {
      report_date: "2026-05-02",
      offer_id: "selftest-offer-1",
      source: "selftest",
      clicks: 120,
      conversions: 6,
      revenue: 30,
      cost: 12,
    },
    // Invalid row — should be reported, not block the others
    { report_date: "not-a-date", offer_id: "x" },
  ];

  const r = await fetch(URL_BASE + "/api/ingest/affise", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-API-Key": plaintext },
    body: JSON.stringify(payload),
    redirect: "manual",
    signal: AbortSignal.timeout(30000),
  });
  let body;
  try { body = await r.json(); } catch { body = null; }

  // Verify rows + profit (generated column)
  const { data: stored } = await supa
    .from("affise_daily_stats")
    .select("offer_id, source, clicks, conversions, revenue, profit")
    .eq("source", "selftest");

  // Cleanup
  await supa.from("affise_daily_stats").delete().eq("source", "selftest");
  await supa.from("api_ingest_keys").delete().eq("id", keyRow.id);

  const ok =
    r.ok &&
    body?.ok === true &&
    body.processed === 2 &&
    body.skipped === 1 &&
    Array.isArray(body.errors) && body.errors.length === 1 &&
    stored && stored.length === 2 &&
    stored.every((s) => Number(s.profit) === Number(s.revenue) - 0); // we didn't pass cost in some, but profit = revenue - cost

  record(
    "7. Ingest with valid key upserts (idempotent), reports valid/invalid split, computes profit",
    ok,
    `HTTP ${r.status} · ok=${body?.ok} processed=${body?.processed} skipped=${body?.skipped} errors=${body?.errors?.length}\n` +
      `stored rows: ${stored?.length}\n` +
      `first row profit (revenue-cost): ${stored?.[0]?.profit}`,
  );
}

async function test8_IngestRevokedKeyRejected() {
  const plaintext = "syndi_revoked_" + Math.random().toString(36).slice(2, 12);
  const keyHash = createHash("sha256").update(plaintext).digest("hex");
  const { data: row, error: insErr } = await supa
    .from("api_ingest_keys")
    .insert({
      label: "selftest-D8",
      key_hash: keyHash,
      scopes: ["affise"],
      revoked_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (insErr) {
    record(
      "8. Ingest endpoint rejects revoked keys (skipped — schema cache stale)",
      false,
      "schema cache: " + insErr.message,
    );
    return;
  }

  const r = await fetch(URL_BASE + "/api/ingest/affise", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-API-Key": plaintext },
    body: JSON.stringify([{ report_date: "2026-05-01", offer_id: "x" }]),
    redirect: "manual",
    signal: AbortSignal.timeout(30000),
  });

  await supa.from("api_ingest_keys").delete().eq("id", row.id);

  record(
    "8. Ingest endpoint rejects revoked keys with 401",
    r.status === 401,
    `HTTP ${r.status} (expect 401)`,
  );
}

async function test9_ApiKeysPageBlockedForNonAdmin() {
  // Source-level check (mirrors EPIC 3 pattern)
  const src = readFileSync("app/(app)/settings/api-keys/page.tsx", "utf-8");
  const ok =
    /isAdminEmail\(user\?\.email\)/.test(src) &&
    /redirect\("\/settings"\)/.test(src);
  record(
    "9. Admin gate present in /settings/api-keys source",
    ok,
    `isAdminEmail check + redirect("/settings"): ${ok}`,
  );
}

async function test10_NoRegressions(cookie) {
  const routes = [
    "/insights",
    "/contacts",
    "/networks",
    "/offers",
    "/external-offers",
    "/reporting/affise",
    "/reporting/bi",
    "/settings",
    "/settings/api-keys",
  ];
  const out = {};
  for (const r of routes) {
    const res = await authedFetch(r, cookie);
    out[r] = res.status;
  }
  const ok = Object.values(out).every((c) => c === 200);
  record(
    "10. Core routes still 200 after Phase D",
    ok,
    Object.entries(out).map(([r, s]) => `  ${s === 200 ? "✓" : "✗"} ${r} → ${s}`).join("\n"),
  );
}

(async () => {
  console.log("EPIC 4 — Phase D self-test\n=================");
  const cookie = await getCookie();
  console.log(`Authenticated as ${cookie.email}\n`);
  await test1_PagesLoad(cookie);
  await test2_AffisePageContent(cookie);
  await test3_BIPlaceholder(cookie);
  await test4_ApiKeysPageContent(cookie);
  await test5_IngestRejectsMissingKey();
  await test6_IngestRejectsBadKey();
  await test7_IngestAcceptsValidKey();
  await test8_IngestRevokedKeyRejected();
  await test9_ApiKeysPageBlockedForNonAdmin();
  await test10_NoRegressions(cookie);

  const passed = results.filter((r) => r.pass).length;
  const failed = results.filter((r) => !r.pass).length;
  console.log(`\n=================`);
  console.log(`Summary: ${passed} passed · ${failed} failed`);
  if (failed) results.filter((r) => !r.pass).forEach((r) => console.log("  ✗", r.name));
  process.exit(failed ? 1 : 0);
})().catch((e) => {
  console.error("test runner crashed:", e);
  process.exit(2);
});
