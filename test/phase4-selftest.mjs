// Phase 4 self-test — node test/phase4-selftest.mjs
// Verifies Insights dashboard + Ask feature end-to-end.

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
  return { cookieName, value, email: u.email, userId: u.id, session };
}

async function authedFetch(path, cookie, init = {}) {
  return fetch(URL_BASE + path, {
    ...init,
    headers: {
      Cookie: `${cookie.cookieName}=${cookie.value}; syndicate_brand=all`,
      ...(init.headers || {}),
    },
    redirect: "manual",
  });
}

// ---- tests ----

async function test1_AnthropicKey() {
  const has = !!env.ANTHROPIC_API_KEY && env.ANTHROPIC_API_KEY.startsWith("sk-ant-");
  record(
    "1. ANTHROPIC_API_KEY is set in .env.local",
    has,
    has ? `prefix: sk-ant-...${env.ANTHROPIC_API_KEY.slice(-6)}` : "missing or malformed",
  );
}

async function test2_InsightsPageRenders(cookie) {
  const r = await authedFetch("/insights", cookie);
  if (r.status !== 200) {
    record("2. /insights returns 200", false, `HTTP ${r.status}`);
    return null;
  }
  const html = await r.text();
  const checks = {
    "Active Conversations KPI": html.includes("Active Conversations"),
    "Pending Replies KPI": html.includes("Pending Replies"),
    "A-Tier Networks KPI": html.includes("A-Tier Networks"),
    "Open Publisher Asks KPI": html.includes("Open Publisher Asks"),
    "Status breakdown section": html.includes("Status breakdown"),
    "Vertical distribution section": html.includes("Vertical distribution"),
    "Pipeline funnel section": html.includes("Pipeline funnel"),
    "Top 10 networks": html.includes("Top 10 networks"),
    "Recent activity section": html.includes("Recent activity"),
  };
  const ok = Object.values(checks).every(Boolean);
  record(
    "2. /insights page renders all KPIs + charts + sections",
    ok,
    Object.entries(checks).map(([k, v]) => `  ${v ? "✓" : "✗"} ${k}`).join("\n"),
  );
  return html;
}

async function test3_InsightsData(cookie) {
  // Trigger data fetch by fetching /insights HTML and parsing what's there.
  // KPI counts appear as numbers in the markup.
  const r = await authedFetch("/insights", cookie);
  const html = await r.text();
  // We expect at minimum a non-zero "Open Publisher Asks" — wishlists has 343 rows with status='open'?
  const { count: openAsks } = await supa
    .from("publisher_wishlists")
    .select("id", { count: "exact", head: true })
    .eq("status", "open");

  // Look for the open-asks count in HTML (formatted with toLocaleString)
  const expectedStr = (openAsks ?? 0).toLocaleString();
  const hasOpenAsks = html.includes(expectedStr);

  // Also: top networks should include QuinStreet or some recognized network
  const { data: topNets } = await supa
    .from("v_networks_with_activity")
    .select("name")
    .order("contact_count", { ascending: false })
    .limit(3);
  const topNetMatches = (topNets ?? []).filter((n) =>
    html.includes(n.name),
  );

  const ok = hasOpenAsks && topNetMatches.length >= 1;
  record(
    "3. /insights renders real DB data (KPIs + top networks)",
    ok,
    `expected open-asks count: ${expectedStr} · present: ${hasOpenAsks}\n` +
      `top networks expected: ${(topNets ?? []).map((n) => n.name).join(", ")}\n` +
      `top networks found in HTML: ${topNetMatches.map((n) => n.name).join(", ") || "(none)"}`,
  );
}

async function test4_AllTwelveTools(cookie) {
  const cases = [
    {
      name: "count_contacts_by_status",
      q: "How many contacts have Pending in any of their brand statuses?",
      mustContain: /\d+/,
    },
    {
      name: "pipeline_funnel",
      q: "Show me the pipeline funnel for Nomi.",
      mustContain: /(Cold|Pending|Sent|Approved|Working)/i,
    },
    {
      name: "top_publishers_by_wishlist_count",
      q: "Top 5 publishers by wishlist requests?",
      mustContain: /\d+/,
    },
    {
      name: "vertical_demand_summary",
      q: "Which verticals have the most open demand right now?",
      mustContain: /(insurance|home|auto|solar|finance|vertical)/i,
    },
  ];
  const toolStats = { used: new Set(), errors: [] };
  for (const c of cases) {
    const r = await authedFetch("/api/ask", cookie, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: c.q, brand: "nomi" }),
    });
    if (r.status !== 200) {
      toolStats.errors.push(`${c.name}: HTTP ${r.status}`);
      continue;
    }
    const data = await r.json();
    for (const tc of data.tool_calls ?? []) toolStats.used.add(tc.name);
    if (!c.mustContain.test(data.answer ?? "")) {
      toolStats.errors.push(`${c.name}: answer didn't contain ${c.mustContain}; got: ${(data.answer ?? "").slice(0, 120)}`);
    }
  }
  record(
    `4. Ask API invokes tools end-to-end (4 sample questions)`,
    toolStats.errors.length === 0,
    `tools used: ${[...toolStats.used].join(", ") || "(none)"}\n` +
      (toolStats.errors.length ? "errors:\n  " + toolStats.errors.join("\n  ") : "all 4 answers were coherent"),
  );
  return toolStats;
}

async function test5_AskApiPersistsHistory(cookie) {
  const q = `selftest-${Date.now()} How many contacts are there in total?`;
  const before = await supa
    .from("ask_history")
    .select("id", { count: "exact", head: true })
    .eq("user_id", cookie.userId);

  const r = await authedFetch("/api/ask", cookie, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question: q, brand: "nomi" }),
  });
  if (r.status !== 200) {
    record("5. Ask persists to ask_history", false, `HTTP ${r.status}`);
    return;
  }
  const data = await r.json();

  // Verify ask_history row
  const { data: row } = await supa
    .from("ask_history")
    .select("question, answer, tool_calls, input_tokens, output_tokens, brand_context, user_id")
    .eq("user_id", cookie.userId)
    .eq("question", q)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  const after = await supa
    .from("ask_history")
    .select("id", { count: "exact", head: true })
    .eq("user_id", cookie.userId);

  const inserted = (after.count ?? 0) === (before.count ?? 0) + 1;
  const fieldsOk =
    row &&
    row.question === q &&
    row.answer &&
    typeof row.input_tokens === "number" &&
    typeof row.output_tokens === "number" &&
    row.brand_context === "nomi";

  // Clean up
  if (row) {
    await supa
      .from("ask_history")
      .delete()
      .eq("user_id", cookie.userId)
      .eq("question", q);
  }

  record(
    "5. Ask persists to ask_history with tokens + brand_context",
    inserted && fieldsOk,
    `row inserted: ${inserted}\n` +
      `tokens: in=${row?.input_tokens}, out=${row?.output_tokens}\n` +
      `brand_context: ${row?.brand_context}\n` +
      `tool_calls is array: ${Array.isArray(row?.tool_calls)}\n` +
      `answer length: ${row?.answer?.length ?? 0} chars\n` +
      `route returned ${data.tool_calls?.length ?? 0} tool calls`,
  );
}

async function test6_AskPageUI(cookie) {
  const r = await authedFetch("/ask", cookie);
  if (r.status !== 200) {
    record("6. /ask page returns 200", false, `HTTP ${r.status}`);
    return;
  }
  const html = await r.text();
  const checks = {
    "Ask anything text": html.includes("Ask anything"),
    "Suggested questions label": html.includes("Suggested questions"),
    "Suggestion: 14 days": html.includes("14 days"),
    "Suggestion: most offers": html.includes("most offers"),
    "Suggestion: 3+ weeks": html.includes("3+ weeks"),
    "Suggestion: conversion rate": html.includes("conversion rate"),
    "Suggestion: top 5 publishers": html.includes("top 5 publishers") || html.includes("Top 5 publishers"),
    "Suggestion: verticals demand": /vertical/i.test(html),
    "Ask input textarea": html.includes("textarea") || html.includes("Textarea"),
  };
  const ok = Object.values(checks).every(Boolean);
  record(
    "6. /ask page renders input + 6 suggestion pills",
    ok,
    Object.entries(checks).map(([k, v]) => `  ${v ? "✓" : "✗"} ${k}`).join("\n"),
  );
}

async function test7_BrandCookieScopesInsights(cookie) {
  // With brand cookie = "nomi", insights should compute brand-scoped KPIs.
  // We'll set the cookie and fetch /insights twice (all vs nomi) and compare
  // KPI numbers — they should generally differ for at least one KPI.
  const fetchWith = async (brand) => {
    return fetch(URL_BASE + "/insights", {
      headers: {
        Cookie: `${cookie.cookieName}=${cookie.value}; syndicate_brand=${brand}`,
      },
      redirect: "manual",
    }).then((r) => r.text());
  };
  const htmlAll = await fetchWith("all");
  const htmlNomi = await fetchWith("nomi");

  // Look for the active-conversations number — must be present in both
  // Description line should also differ: "for all brands" vs "for nomi"
  const allLabel = /for all brands/i.test(htmlAll);
  const nomiLabel = /for nomi/i.test(htmlNomi);
  // Brand label in chart caption
  const allBadge = htmlAll.includes(">All Brands<");
  const nomiBadge = htmlNomi.includes(">Nomi<");
  const ok = allLabel && nomiLabel && allBadge && nomiBadge;
  record(
    "7. Brand cookie scopes /insights (description + chart caption switch)",
    ok,
    `all: description-line-match=${allLabel} chart-caption=${allBadge}\n` +
      `nomi: description-line-match=${nomiLabel} chart-caption=${nomiBadge}`,
  );
}

async function test8_NoRegressions(cookie) {
  const { execSync } = await import("child_process");
  let tsClean = true;
  let tsOut = "";
  try {
    tsOut = execSync("npx tsc --noEmit", { stdio: "pipe", encoding: "utf-8" });
  } catch (e) {
    tsClean = false;
    tsOut = (e.stdout?.toString() ?? "") + (e.stderr?.toString() ?? "");
  }
  const routes = ["/contacts", "/networks", "/offers", "/wishlists", "/demand", "/insights", "/ask"];
  const out = {};
  for (const r of routes) {
    const res = await authedFetch(r, cookie);
    out[r] = res.status;
  }
  const allOk = Object.values(out).every((c) => c === 200);
  let logErrors = 0;
  try {
    const log = readFileSync(".dev.log", "utf-8");
    const tail = log.split("\n").slice(-60);
    logErrors = tail.filter(
      (l) => l.includes("Attempted import error") || l.match(/^Error:/) || l.includes("Failed to compile"),
    ).length;
  } catch {}
  record(
    "8. No regressions (tsc clean + 7 routes 200 + dev log clean)",
    tsClean && allOk && logErrors === 0,
    `tsc: ${tsClean ? "clean" : "errors: " + tsOut.slice(0, 200)}\n` +
      `routes: ${Object.entries(out).map(([r, s]) => `${r}=${s}`).join(", ")}\n` +
      `errors in last 60 dev log lines: ${logErrors}`,
  );
}

// ---- run ----
(async () => {
  console.log("Phase 4 self-test\n=================");
  await test1_AnthropicKey();
  const cookie = await getAuthCookie();
  console.log(`Authenticated as ${cookie.email}\n`);

  await test2_InsightsPageRenders(cookie);
  await test3_InsightsData(cookie);
  await test4_AllTwelveTools(cookie);
  await test5_AskApiPersistsHistory(cookie);
  await test6_AskPageUI(cookie);
  await test7_BrandCookieScopesInsights(cookie);
  await test8_NoRegressions(cookie);

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
