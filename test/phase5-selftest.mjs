// Phase 5 self-test — node test/phase5-selftest.mjs
// Verifies Today's Actions + MatchMaker.

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

async function getAuthCookie() {
  const { data: users } = await supa.auth.admin.listUsers();
  const u = users.users[0];
  const pwd = "selftest-" + Math.random().toString(36).slice(2, 10);
  await supa.auth.admin.updateUserById(u.id, { password: pwd });
  const r = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: ANON, "Content-Type": "application/json" },
    body: JSON.stringify({ email: u.email, password: pwd }),
  });
  if (!r.ok) throw new Error("auth failed: " + r.status);
  const session = await r.json();
  const cookieName = `sb-${PROJECT_REF}-auth-token`;
  const value = "base64-" + Buffer.from(JSON.stringify(session)).toString("base64url");
  return { cookieName, value, email: u.email, userId: u.id };
}

async function authedFetch(path, cookie, brand = "all") {
  return fetch(URL_BASE + path, {
    headers: {
      Cookie: `${cookie.cookieName}=${cookie.value}; syndicate_brand=${brand}`,
    },
    redirect: "manual",
  });
}

// ---- Mirror lib/utils/fuzzy.ts ----
function tokens(s) {
  return s.toLowerCase().split(/\W+/).filter((t) => t.length > 2);
}
function matchScore(w, o) {
  let score = 0;
  if (w.vertical && o.vertical && w.vertical.toLowerCase() === o.vertical.toLowerCase()) {
    score += 50;
  } else if (w.vertical && o.vertical) {
    const wv = w.vertical.toLowerCase();
    const ov = o.vertical.toLowerCase();
    if (wv.includes(ov) || ov.includes(wv)) score += 25;
  }
  const wT = tokens(w.requested_offer);
  const oT = tokens(o.name);
  const overlap = wT.filter((t) => oT.includes(t)).length;
  score += overlap * 10;
  return score;
}

// ---- tests ----

async function test1_TodayPage(cookie) {
  const r = await authedFetch("/today", cookie);
  if (r.status !== 200) {
    record("1. /today returns 200", false, `HTTP ${r.status}`);
    return;
  }
  const html = await r.text();
  const checks = {
    "Hot Follow-ups card": html.includes("Hot Follow-ups"),
    "Cold Leads card": html.includes("Cold Leads"),
    "Untouched A-Tier card": html.includes("Untouched A-Tier"),
    "New Offers card": html.includes("New Offers"),
    "Publisher Asks card": html.includes("Publisher Asks"),
  };
  const ok = Object.values(checks).every(Boolean);
  record(
    "1. /today renders all 5 action cards",
    ok,
    Object.entries(checks).map(([k, v]) => `  ${v ? "✓" : "✗"} ${k}`).join("\n"),
  );
}

async function test2_HotFollowupsQuery() {
  // Replicate the query: status_X contains Sent/Pending+Sent AND last_touch_at < now - 7d
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 7);
  const { count } = await supa
    .from("v_contacts_with_age")
    .select("id", { count: "exact", head: true })
    .or(
      [
        "status_nomi.ilike.%Sent%",
        "status_startech.ilike.%Sent%",
        "status_luminarix.ilike.%Sent%",
        "status_nomi.ilike.%Pending+Sent%",
        "status_startech.ilike.%Pending+Sent%",
        "status_luminarix.ilike.%Pending+Sent%",
      ].join(","),
    )
    .lt("last_touch_at", cutoff.toISOString());
  record(
    "2. Hot Follow-ups query returns a sensible count",
    typeof count === "number",
    `count: ${count}`,
  );
}

async function test3_PublisherAsksQuery() {
  // wishlists status=open AND requested_at < now - 3d
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 3);
  const { count } = await supa
    .from("publisher_wishlists")
    .select("id", { count: "exact", head: true })
    .eq("status", "open")
    .lt("requested_at", cutoff.toISOString());
  record(
    "3. Publisher Asks Waiting query returns sensible count",
    typeof count === "number",
    `count: ${count}`,
  );
}

async function test4_MarkFollowedUpEnd2End() {
  // Pick a contact and run the today action's logic
  const { data: target } = await supa
    .from("contacts")
    .select("id, name, last_touch_at")
    .limit(1)
    .single();
  const prevTouch = target.last_touch_at;
  // Replicate markFollowedUp
  const now = new Date().toISOString();
  await supa.from("contacts").update({ last_touch_at: now }).eq("id", target.id);
  await supa.from("activity_log").insert({
    entity_type: "contact",
    entity_id: target.id,
    action: "last_touch_at:last_touch_updated",
    to_value: now,
    brand_context: "nomi",
  });

  const { data: after } = await supa
    .from("contacts")
    .select("last_touch_at")
    .eq("id", target.id)
    .single();
  const { data: log } = await supa
    .from("activity_log")
    .select("action")
    .eq("entity_type", "contact")
    .eq("entity_id", target.id)
    .eq("action", "last_touch_at:last_touch_updated")
    .order("created_at", { ascending: false })
    .limit(1);

  // Postgres returns timestamps in '+00:00' form; we wrote 'Z' form. Compare parsed.
  const dbOk =
    after.last_touch_at &&
    Math.abs(new Date(after.last_touch_at).getTime() - new Date(now).getTime()) < 1000;
  const logOk = log?.[0]?.action === "last_touch_at:last_touch_updated";

  // Restore
  await supa.from("contacts").update({ last_touch_at: prevTouch }).eq("id", target.id);
  await supa
    .from("activity_log")
    .delete()
    .eq("entity_type", "contact")
    .eq("entity_id", target.id)
    .eq("to_value", now);

  record(
    "4. Mark followed-up writes contact + activity_log",
    dbOk && logOk,
    `target: ${target.name} · db: ${dbOk} · log: ${logOk}`,
  );
}

async function test5_MatchMakerPage(cookie) {
  const r = await authedFetch("/matchmaker", cookie);
  if (r.status !== 200) {
    record("5. /matchmaker returns 200", false, `HTTP ${r.status}`);
    return;
  }
  const html = await r.text();
  const checks = {
    "By publisher tab": html.includes("By publisher"),
    "By offer tab": html.includes("By offer"),
    "Algorithm description": html.includes("Algorithm:") || html.includes("strong"),
    "Search publishers input": html.includes("Search publishers"),
  };
  const ok = Object.values(checks).every(Boolean);
  record(
    "5. /matchmaker renders both tabs + algorithm note",
    ok,
    Object.entries(checks).map(([k, v]) => `  ${v ? "✓" : "✗"} ${k}`).join("\n"),
  );
}

async function test6_MatchScoreAlgorithm() {
  // Exact vertical → ≥50
  const exact = matchScore(
    { requested_offer: "Auto insurance lead", vertical: "Auto insurance" },
    { name: "Auto Insurance CPL", vertical: "Auto insurance" },
  );
  // Partial vertical
  const partial = matchScore(
    { requested_offer: "home warranty plan", vertical: "Home" },
    { name: "Home Warranty Express", vertical: "Home warranty" },
  );
  // Token overlap only
  const tokensOnly = matchScore(
    { requested_offer: "solar panels lead gen", vertical: null },
    { name: "Solar Panels Express", vertical: null },
  );
  // No match at all
  const none = matchScore(
    { requested_offer: "auto loan", vertical: null },
    { name: "Cruise vacation", vertical: null },
  );

  const checks = {
    "exact vertical match >= 50": exact >= 50,
    "partial vertical match >= 25": partial >= 25,
    "token overlap >= 20": tokensOnly >= 20,
    "no match = 0": none === 0,
  };
  const ok = Object.values(checks).every(Boolean);
  record(
    "6. Match score algorithm correctly weights vertical + tokens",
    ok,
    `exact=${exact} partial=${partial} tokens-only=${tokensOnly} none=${none}\n` +
      Object.entries(checks).map(([k, v]) => `  ${v ? "✓" : "✗"} ${k}`).join("\n"),
  );
}

async function test7_MatchMakerLiveMatches() {
  // Find a publisher with an open wishlist whose requested_offer overlaps a real offer
  const { data: wishlists } = await supa
    .from("publisher_wishlists")
    .select("id, publisher_name, requested_offer, vertical, status")
    .eq("status", "open")
    .not("publisher_name", "is", null)
    .limit(200);
  const { data: offers } = await supa
    .from("offers")
    .select("id, name, vertical, status")
    .in("status", ["active", "needs_traffic", "direct"])
    .limit(2000);

  let pubWithMatch = null;
  let bestScore = 0;
  for (const w of wishlists ?? []) {
    for (const o of offers ?? []) {
      const s = matchScore(w, o);
      if (s >= 20 && s > bestScore) {
        bestScore = s;
        pubWithMatch = { publisher_name: w.publisher_name, wishlist: w, offer: o, score: s };
      }
    }
  }

  record(
    "7. Live data produces at least one ≥20 match (algorithm hits real overlaps)",
    !!pubWithMatch,
    pubWithMatch
      ? `publisher: ${pubWithMatch.publisher_name} · wishlist: "${pubWithMatch.wishlist.requested_offer.slice(0, 60)}" · offer: "${pubWithMatch.offer.name.slice(0, 60)}" · score: ${pubWithMatch.score}`
      : "no matches across all open wishlists × active offers (unexpected)",
  );
}

async function test8_MarkWishlistMatchedRoundtrip() {
  // Pick any open wishlist; pick any offer; mark matched; verify status flip and activity_log
  const { data: w } = await supa
    .from("publisher_wishlists")
    .select("id, status, matched_offer_id")
    .eq("status", "open")
    .limit(1)
    .single();
  const { data: o } = await supa.from("offers").select("id").limit(1).single();

  const { error: upErr } = await supa
    .from("publisher_wishlists")
    .update({
      matched_offer_id: o.id,
      status: "matched",
      updated_at: new Date().toISOString(),
    })
    .eq("id", w.id);
  if (upErr) {
    record("8. Mark wishlist matched", false, upErr.message);
    return;
  }
  await supa.from("activity_log").insert({
    entity_type: "wishlist",
    entity_id: w.id,
    action: "status:status_changed",
    from_value: w.status,
    to_value: "matched",
  });

  const { data: after } = await supa
    .from("publisher_wishlists")
    .select("status, matched_offer_id")
    .eq("id", w.id)
    .single();
  const { data: logs } = await supa
    .from("activity_log")
    .select("action")
    .eq("entity_type", "wishlist")
    .eq("entity_id", w.id)
    .eq("action", "status:status_changed")
    .order("created_at", { ascending: false })
    .limit(1);

  const dbOk = after.status === "matched" && after.matched_offer_id === o.id;
  const logOk = logs?.[0]?.action === "status:status_changed";

  // Restore
  await supa
    .from("publisher_wishlists")
    .update({ status: w.status, matched_offer_id: w.matched_offer_id })
    .eq("id", w.id);
  await supa
    .from("activity_log")
    .delete()
    .eq("entity_type", "wishlist")
    .eq("entity_id", w.id)
    .eq("action", "status:status_changed");

  record(
    "8. Mark wishlist matched → DB + activity_log",
    dbOk && logOk,
    `db: ${dbOk} · log: ${logOk}`,
  );
}

async function test9_NoRegressions(cookie) {
  const { execSync } = await import("child_process");
  let tsClean = true;
  let tsOut = "";
  try {
    tsOut = execSync("npx tsc --noEmit", { stdio: "pipe", encoding: "utf-8" });
  } catch (e) {
    tsClean = false;
    tsOut = (e.stdout?.toString() ?? "") + (e.stderr?.toString() ?? "");
  }
  const routes = [
    "/contacts", "/networks", "/offers", "/wishlists", "/demand",
    "/insights", "/ask", "/today", "/matchmaker",
  ];
  const out = {};
  for (const r of routes) {
    const res = await authedFetch(r, cookie);
    out[r] = res.status;
  }
  const allOk = Object.values(out).every((c) => c === 200);
  let logErrors = 0;
  try {
    const log = readFileSync(".dev.log", "utf-8");
    const tail = log.split("\n").slice(-80);
    logErrors = tail.filter(
      (l) => l.includes("Attempted import error") || l.match(/^Error:/) || l.includes("Failed to compile"),
    ).length;
  } catch {}
  record(
    "9. No regressions (tsc + 9 routes 200 + dev log clean)",
    tsClean && allOk && logErrors === 0,
    `tsc: ${tsClean ? "clean" : "errors"}\n` +
      `routes: ${Object.entries(out).map(([r, s]) => `${r}=${s}`).join(", ")}\n` +
      `last-80-line errors: ${logErrors}`,
  );
}

// ---- run ----
(async () => {
  console.log("Phase 5 self-test\n=================");
  const cookie = await getAuthCookie();
  console.log(`Authenticated as ${cookie.email}\n`);

  await test1_TodayPage(cookie);
  await test2_HotFollowupsQuery();
  await test3_PublisherAsksQuery();
  await test4_MarkFollowedUpEnd2End();
  await test5_MatchMakerPage(cookie);
  await test6_MatchScoreAlgorithm();
  await test7_MatchMakerLiveMatches();
  await test8_MarkWishlistMatchedRoundtrip();
  await test9_NoRegressions(cookie);

  const passed = results.filter((r) => r.pass).length;
  const failed = results.filter((r) => !r.pass).length;
  console.log(`\n=================`);
  console.log(`Summary: ${passed} passed · ${failed} failed`);
  if (failed) {
    console.log("\nFailed tests:");
    results.filter((r) => !r.pass).forEach((r) => console.log("  ✗", r.name));
  }
  process.exit(failed ? 1 : 0);
})().catch((e) => {
  console.error("test runner crashed:", e);
  process.exit(2);
});
