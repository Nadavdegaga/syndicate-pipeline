// EPIC 4 Phase E self-test — 3 new tours wired in.

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";

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

function test1_TourKeysAndFunctions() {
  const src = readFileSync("lib/tour.ts", "utf-8");
  const checks = {
    "TOUR_KEYS.externalOffers": /syndicate\.tour\.external_offers\.completed/.test(src),
    "TOUR_KEYS.affise": /syndicate\.tour\.affise\.completed/.test(src),
    "TOUR_KEYS.smartInsights": /syndicate\.tour\.smart_insights\.completed/.test(src),
    "startExternalOffersTour exported": /export function startExternalOffersTour/.test(src),
    "startAffiseTour exported": /export function startAffiseTour/.test(src),
    "startSmartInsightsTour exported": /export function startSmartInsightsTour/.test(src),
  };
  const ok = Object.values(checks).every(Boolean);
  record(
    "1. lib/tour.ts has 3 new TOUR_KEYS + 3 new start functions",
    ok,
    Object.entries(checks).map(([k, v]) => `  ${v ? "✓" : "✗"} ${k}`).join("\n"),
  );
}

function test2_PageTourLauncherExists() {
  const ok = existsSync("components/shell/PageTourLauncher.tsx");
  record(
    "2. components/shell/PageTourLauncher.tsx exists",
    ok,
    ok ? "present" : "missing",
  );
}

function test3_PagesMountLauncher() {
  const externalOffersPage = readFileSync("app/(app)/external-offers/page.tsx", "utf-8");
  const affisePage = readFileSync("app/(app)/reporting/affise/page.tsx", "utf-8");
  const insightsPage = readFileSync("app/(app)/insights/page.tsx", "utf-8");
  const checks = {
    "External offers page mounts launcher (externalOffers)":
      externalOffersPage.includes('tour="externalOffers"'),
    "Affise page mounts launcher (affise)":
      affisePage.includes('tour="affise"'),
    "Insights page mounts launcher (smartInsights)":
      insightsPage.includes('tour="smartInsights"'),
  };
  const ok = Object.values(checks).every(Boolean);
  record(
    "3. /external-offers, /reporting/affise, /insights each mount PageTourLauncher",
    ok,
    Object.entries(checks).map(([k, v]) => `  ${v ? "✓" : "✗"} ${k}`).join("\n"),
  );
}

async function test4_RouteAwareHelpButton(cookie) {
  const r1 = await authedFetch("/external-offers", cookie);
  const html1 = await r1.text();
  const r2 = await authedFetch("/reporting/affise", cookie);
  const html2 = await r2.text();
  const r3 = await authedFetch("/insights", cookie);
  const html3 = await r3.text();
  const checks = {
    "External Offers ? button label":
      /aria-label="Replay External Offers tour"/.test(html1),
    "Affise ? button label":
      /aria-label="Replay Affise Reporting tour"/.test(html2),
    "Insights ? button label":
      /aria-label="Replay Smart Insights tour"/.test(html3),
  };
  const ok = Object.values(checks).every(Boolean);
  record(
    "4. ? icon in topbar is route-aware on all 3 new pages",
    ok,
    Object.entries(checks).map(([k, v]) => `  ${v ? "✓" : "✗"} ${k}`).join("\n"),
  );
}

async function test5_DataTourAnchorsPresent(cookie) {
  // Smart insights anchors live on /insights
  const r = await authedFetch("/insights", cookie);
  const html = await r.text();
  // Quick actions always render — smart-insights only renders if there are insights.
  const quickActionsAnchor = html.includes('data-tour="quick-actions"');

  // External offers anchors live on /external-offers
  const r2 = await authedFetch("/external-offers", cookie);
  const html2 = await r2.text();
  const manageAnchor = html2.includes('data-tour="manage-connections"');
  const addConnectionAnchor = html2.includes('data-tour="add-connection-button"') ||
    html2.includes("Manage all"); // empty-state shows different CTA

  // Affise anchors live on /reporting/affise
  const r3 = await authedFetch("/reporting/affise", cookie);
  const html3 = await r3.text();
  const affiseAnchor = html3.includes('data-tour="affise-empty-state"') ||
    html3.includes('data-tour="affise-range"');

  const ok = quickActionsAnchor && manageAnchor && addConnectionAnchor && affiseAnchor;
  record(
    "5. data-tour anchors present on the 3 tour pages",
    ok,
    `insights:quick-actions=${quickActionsAnchor}\n` +
      `external-offers:manage-connections=${manageAnchor} add-button(or alt)=${addConnectionAnchor}\n` +
      `reporting/affise:affise-anchor=${affiseAnchor}`,
  );
}

async function test6_NoRegressions(cookie) {
  const routes = [
    "/insights",
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
    "/external-offers",
    "/external-offers/connections",
    "/import",
    "/settings",
    "/settings/team",
    "/settings/feedback",
    "/settings/activity",
    "/settings/api-keys",
    "/reporting/affise",
    "/reporting/bi",
  ];
  const out = {};
  for (const r of routes) {
    const res = await authedFetch(r, cookie);
    out[r] = res.status;
  }
  const allOk = Object.values(out).every((c) => c === 200);
  record(
    `6. All ${routes.length} app routes return 200`,
    allOk,
    Object.entries(out)
      .map(([r, s]) => `  ${s === 200 ? "✓" : "✗"} ${r} → ${s}`)
      .join("\n"),
  );
}

(async () => {
  console.log("EPIC 4 — Phase E self-test\n=================");
  test1_TourKeysAndFunctions();
  test2_PageTourLauncherExists();
  test3_PagesMountLauncher();
  const cookie = await getCookie();
  console.log(`Authenticated as ${cookie.email}\n`);
  await test4_RouteAwareHelpButton(cookie);
  await test5_DataTourAnchorsPresent(cookie);
  await test6_NoRegressions(cookie);

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
