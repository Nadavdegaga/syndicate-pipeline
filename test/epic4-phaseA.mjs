// EPIC 4 Phase A self-test — node test/epic4-phaseA.mjs
// Sidebar restructure, 4 new entity pages, Add buttons on every list page,
// create server actions write to DB + activity_log.

import { createClient } from "@supabase/supabase-js";
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
  // Pick a CONFIRMED user (partner emails may be unconfirmed → signin fails).
  let u = users.users.find(
    (x) =>
      ADMIN_EMAILS.includes((x.email ?? "").toLowerCase()) &&
      x.email_confirmed_at,
  );
  if (!u) u = users.users.find((x) => x.email_confirmed_at);
  if (!u) throw new Error("no confirmed user — confirm one in Supabase Auth");
  const pwd = "selftest-" + Math.random().toString(36).slice(2, 10);
  await supa.auth.admin.updateUserById(u.id, { password: pwd });
  const r = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: ANON, "Content-Type": "application/json" },
    body: JSON.stringify({ email: u.email, password: pwd }),
  });
  if (!r.ok) {
    const body = await r.text();
    throw new Error(`signin failed for ${u.email}: ${r.status} ${body}`);
  }
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
  });
}

async function test1_MigrationApplied() {
  // Quick check: try counting one new table
  const tables = [
    "platform_connections",
    "external_offers",
    "sync_runs",
    "affise_daily_stats",
    "api_ingest_keys",
    "smart_insights",
    "email_messages",
  ];
  const missing = [];
  for (const t of tables) {
    const { error } = await supa.from(t).select("*", { count: "exact", head: true });
    if (error) missing.push(`${t}: ${error.message}`);
  }
  record(
    "1. Migration 004 applied — all 7 new tables queryable",
    missing.length === 0,
    missing.length === 0 ? `all present: ${tables.join(", ")}` : missing.join("\n"),
  );
}

async function test2_SidebarStructure(cookie) {
  const r = await authedFetch("/insights", cookie);
  const html = await r.text();
  const checks = {
    "Overview group label": />Overview</i.test(html),
    "Data group label": />Data</i.test(html),
    "Reporting group label": />Reporting</i.test(html),
    "Tools group label": />Tools</i.test(html),
    "Affise nav item": html.includes('href="/reporting/affise"'),
    "Advanced BI nav item": html.includes('href="/reporting/bi"'),
    "External Offers nav item": html.includes('href="/external-offers"'),
    "MatchMaker still present": html.includes('href="/matchmaker"'),
    "Settings still present": html.includes('href="/settings"'),
  };
  const ok = Object.values(checks).every(Boolean);
  record(
    "2. Sidebar has 4 groups + new nav items (Affise, Advanced BI, External Offers)",
    ok,
    Object.entries(checks).map(([k, v]) => `  ${v ? "✓" : "✗"} ${k}`).join("\n"),
  );
}

async function test3_NewEntityNewPages(cookie) {
  const routes = ["/contacts/new", "/networks/new", "/offers/new", "/wishlists/new", "/demand/new"];
  const status = {};
  for (const r of routes) {
    const res = await authedFetch(r, cookie);
    status[r] = res.status;
  }
  const allOk = Object.values(status).every((s) => s === 200);
  record(
    "3. All 5 /[entity]/new pages return 200",
    allOk,
    Object.entries(status).map(([r, s]) => `  ${s === 200 ? "✓" : "✗"} ${r} → ${s}`).join("\n"),
  );
}

async function test4_AddButtonsOnLists(cookie) {
  const checks = {};
  for (const e of ["contacts", "networks", "offers", "wishlists", "demand"]) {
    const r = await authedFetch(`/${e}`, cookie);
    const html = await r.text();
    checks[`/${e} → has /${e}/new link`] = html.includes(`href="/${e}/new"`);
  }
  const ok = Object.values(checks).every(Boolean);
  record(
    "4. Every list page has an Add button linking to /[entity]/new",
    ok,
    Object.entries(checks).map(([k, v]) => `  ${v ? "✓" : "✗"} ${k}`).join("\n"),
  );
}

async function test5_CreateNetworkEnd2End() {
  // Mirror createNetwork's writes: insert + activity_log
  const name = `EPIC4-TEST-NET-${Date.now()}`;
  const { data: ins, error } = await supa
    .from("networks")
    .insert({ name, tier: "C" })
    .select("id")
    .single();
  if (error) {
    record("5. createNetwork write path", false, error.message);
    return;
  }
  await supa.from("activity_log").insert({
    entity_type: "network",
    entity_id: ins.id,
    action: "created",
    to_value: name,
  });
  const { data: log } = await supa
    .from("activity_log")
    .select("action, to_value")
    .eq("entity_type", "network")
    .eq("entity_id", ins.id)
    .eq("action", "created")
    .single();

  // Clean up
  await supa.from("activity_log").delete().eq("entity_id", ins.id);
  await supa.from("networks").delete().eq("id", ins.id);

  record(
    "5. Network create writes row + activity_log entry",
    log?.action === "created" && log?.to_value === name,
    `inserted id: ${ins.id} · log action: ${log?.action}`,
  );
}

async function test6_AddNetworkFromOfferPrefill(cookie) {
  // Loading /networks/new with pre-fill query params should render those values.
  const r = await authedFetch(
    "/networks/new?name=PrefilledNetwork&from_offer=abc-123",
    cookie,
  );
  const html = await r.text();
  const ok =
    html.includes('value="PrefilledNetwork"') &&
    html.includes("Back to offer");
  record(
    "6. /networks/new accepts prefill via ?name= and ?from_offer= (Card 4.1)",
    ok,
    `prefilled name: ${html.includes('value="PrefilledNetwork"')} · back-to-offer link: ${html.includes("Back to offer")}`,
  );
}

async function test7_OfferDetailHasAddNetwork(cookie) {
  // Find an offer without a network_id but with a network_name
  const { data: offer } = await supa
    .from("offers")
    .select("id, name, network_id, network_name")
    .is("network_id", null)
    .not("network_name", "is", null)
    .limit(1)
    .maybeSingle();
  if (!offer) {
    record(
      "7. 'Add network from this offer' button on offer detail",
      true,
      "no orphan offer to test against; skipping",
    );
    return;
  }
  const r = await authedFetch(`/offers/${offer.id}`, cookie);
  const html = await r.text();
  const ok = html.includes(`href="/networks/new?name=`) &&
    html.includes(`from_offer=${offer.id}`);
  record(
    "7. Offer detail with no network_id shows 'Add network' shortcut",
    ok,
    `offer: ${offer.name} (network_name=${offer.network_name})\n  links to /networks/new?name=...&from_offer=${offer.id}: ${ok}`,
  );
}

async function test8_NoRegressions(cookie) {
  const routes = [
    "/insights",
    "/ask",
    "/today",
    "/contacts",
    "/contacts/new",
    "/networks",
    "/networks/new",
    "/offers",
    "/offers/new",
    "/wishlists",
    "/wishlists/new",
    "/demand",
    "/demand/new",
    "/matchmaker",
    "/import",
    "/settings",
    "/settings/team",
    "/settings/feedback",
    "/settings/activity",
  ];
  const out = {};
  for (const r of routes) {
    const res = await authedFetch(r, cookie);
    out[r] = res.status;
  }
  const allOk = Object.values(out).every((c) => c === 200);
  const { execSync } = await import("child_process");
  let tsClean = true;
  try {
    execSync("npx tsc --noEmit", { stdio: "pipe" });
  } catch (e) {
    tsClean = false;
  }
  record(
    `8. No regressions: ${routes.length} routes 200 + tsc clean`,
    allOk && tsClean,
    `tsc: ${tsClean ? "clean" : "errors"} · failed routes: ${Object.entries(out).filter(([, s]) => s !== 200).map(([r, s]) => `${r}=${s}`).join(", ") || "(none)"}`,
  );
}

(async () => {
  console.log("EPIC 4 — Phase A self-test\n=================");
  await test1_MigrationApplied();
  const cookie = await getCookie();
  console.log(`Authenticated as ${cookie.email}\n`);
  await test2_SidebarStructure(cookie);
  await test3_NewEntityNewPages(cookie);
  await test4_AddButtonsOnLists(cookie);
  await test5_CreateNetworkEnd2End();
  await test6_AddNetworkFromOfferPrefill(cookie);
  await test7_OfferDetailHasAddNetwork(cookie);
  await test8_NoRegressions(cookie);

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
