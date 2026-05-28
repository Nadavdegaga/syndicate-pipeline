// Phase 7 self-test — node test/phase7-selftest.mjs
// Final end-to-end smoke + driver.js tour wiring + skeletons + error boundary.

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
  return { cookieName, value, email: u.email };
}

async function authedFetch(path, cookie) {
  return fetch(URL_BASE + path, {
    headers: { Cookie: `${cookie.cookieName}=${cookie.value}; syndicate_brand=all` },
    redirect: "manual",
  });
}

// ---- tests ----

async function test1_DriverJsInstalled() {
  let installed = false;
  try {
    const pkg = JSON.parse(readFileSync("package.json", "utf-8"));
    installed = !!pkg.dependencies?.["driver.js"];
  } catch {}
  record(
    "1. driver.js installed",
    installed,
    installed ? `version: ${JSON.parse(readFileSync("package.json", "utf-8")).dependencies["driver.js"]}` : "not in dependencies",
  );
}

async function test2_TourFilesExist() {
  const files = [
    "lib/tour.ts",
    "components/shell/HelpButton.tsx",
    "components/shell/TourLauncher.tsx",
  ];
  const missing = files.filter((f) => !existsSync(f));
  record(
    "2. Tour files exist",
    missing.length === 0,
    files.map((f) => `  ${existsSync(f) ? "✓" : "✗"} ${f}`).join("\n"),
  );
}

async function test3_DataTourAttrs() {
  // Verify data-tour attributes added to sidebar nav + brand switcher
  const sidebar = readFileSync("components/shell/Sidebar.tsx", "utf-8");
  const switcher = readFileSync("components/shell/BrandSwitcher.tsx", "utf-8");
  const checks = {
    "Sidebar adds data-tour={`nav-${...}`}": /data-tour=\{`nav-/.test(sidebar),
    'BrandSwitcher has data-tour="brand-switcher"': switcher.includes('data-tour="brand-switcher"'),
  };
  const ok = Object.values(checks).every(Boolean);
  record(
    "3. data-tour attributes wired in shell components",
    ok,
    Object.entries(checks).map(([k, v]) => `  ${v ? "✓" : "✗"} ${k}`).join("\n"),
  );
}

async function test4_TourMountedInPage(cookie) {
  // Verify TourLauncher + HelpButton appear in /insights HTML or in source
  // (TourLauncher renders no markup; check via source).
  const appShell = readFileSync("components/shell/AppShell.tsx", "utf-8");
  const topbar = readFileSync("components/shell/Topbar.tsx", "utf-8");
  const launcherWired = appShell.includes("<TourLauncher />");
  const helpWired = topbar.includes("<HelpButton />");

  // Verify /insights HTML loads okay (renders the brand switcher with data-tour)
  const r = await authedFetch("/insights", cookie);
  const html = await r.text();
  const switcherInHtml = html.includes('data-tour="brand-switcher"');
  const helpInHtml = /aria-label="Replay welcome tour"/.test(html);
  const ok = launcherWired && helpWired && switcherInHtml && helpInHtml;
  record(
    "4. TourLauncher + HelpButton mounted in shell, present in /insights",
    ok,
    `TourLauncher in AppShell: ${launcherWired}\n` +
      `HelpButton in Topbar: ${helpWired}\n` +
      `brand-switcher data-tour in HTML: ${switcherInHtml}\n` +
      `Help button in HTML: ${helpInHtml}`,
  );
}

async function test5_LoadingSkeletons() {
  const routes = [
    "app/(app)/contacts/loading.tsx",
    "app/(app)/networks/loading.tsx",
    "app/(app)/offers/loading.tsx",
    "app/(app)/wishlists/loading.tsx",
    "app/(app)/demand/loading.tsx",
    "app/(app)/insights/loading.tsx",
    "app/(app)/today/loading.tsx",
  ];
  const missing = routes.filter((f) => !existsSync(f));
  record(
    `5. Loading skeletons in ${routes.length} routes`,
    missing.length === 0,
    routes.map((r) => `  ${existsSync(r) ? "✓" : "✗"} ${r}`).join("\n"),
  );
}

async function test6_ErrorBoundaries() {
  const files = ["app/(app)/error.tsx", "app/global-error.tsx"];
  const missing = files.filter((f) => !existsSync(f));
  record(
    "6. Error boundaries present (app-group + global)",
    missing.length === 0,
    files.map((f) => `  ${existsSync(f) ? "✓" : "✗"} ${f}`).join("\n"),
  );
}

async function test7_MobileResponsivePadding() {
  // Check that AppShell + Topbar use responsive padding classes
  const shell = readFileSync("components/shell/AppShell.tsx", "utf-8");
  const topbar = readFileSync("components/shell/Topbar.tsx", "utf-8");
  const checks = {
    "AppShell main padding responsive (p-4 sm:p-6 md:p-8)":
      /p-4\s+sm:p-6\s+md:p-8/.test(shell),
    "Topbar padding responsive (px-4 sm:px-6 md:px-8)":
      /px-4\s+backdrop-blur-md\s+sm:px-6\s+md:px-8/.test(topbar) ||
      /px-4\s+.*sm:px-6\s+md:px-8/.test(topbar),
    "Sidebar hidden on mobile (hidden md:flex)": /hidden\s+md:flex/.test(
      readFileSync("components/shell/Sidebar.tsx", "utf-8"),
    ),
  };
  const ok = Object.values(checks).every(Boolean);
  record(
    "7. Mobile responsive padding present",
    ok,
    Object.entries(checks).map(([k, v]) => `  ${v ? "✓" : "✗"} ${k}`).join("\n"),
  );
}

async function test8_AllRoutesLoad(cookie) {
  const routes = [
    "/insights",
    "/ask",
    "/today",
    "/contacts",
    "/contacts/kanban",
    "/networks",
    "/offers",
    "/wishlists",
    "/demand",
    "/matchmaker",
    "/import",
    "/settings",
  ];
  const out = {};
  for (const r of routes) {
    const res = await authedFetch(r, cookie);
    out[r] = res.status;
  }
  const allOk = Object.values(out).every((c) => c === 200);
  record(
    `8. All ${routes.length} app routes load (200)`,
    allOk,
    Object.entries(out)
      .map(([r, s]) => `  ${s === 200 ? "✓" : "✗"} ${r} → ${s}`)
      .join("\n"),
  );
}

async function test9_NoTscErrorsAndCleanLog() {
  const { execSync } = await import("child_process");
  let tsClean = true;
  let tsOut = "";
  try {
    tsOut = execSync("npx tsc --noEmit", { stdio: "pipe", encoding: "utf-8" });
  } catch (e) {
    tsClean = false;
    tsOut = (e.stdout?.toString() ?? "") + (e.stderr?.toString() ?? "");
  }
  let logErrors = 0;
  try {
    const log = readFileSync(".dev.log", "utf-8");
    const tail = log.split("\n").slice(-150);
    logErrors = tail.filter(
      (l) =>
        l.includes("Attempted import error") ||
        l.match(/^Error:/) ||
        l.includes("Failed to compile"),
    ).length;
  } catch {}
  record(
    "9. tsc --noEmit clean + dev log clean",
    tsClean && logErrors === 0,
    `tsc: ${tsClean ? "clean" : "errors: " + tsOut.slice(0, 200)}\n` +
      `errors in last 150 dev log lines: ${logErrors}`,
  );
}

// ---- run ----
(async () => {
  console.log("Phase 7 self-test\n=================");
  const cookie = await getAuthCookie();
  console.log(`Authenticated as ${cookie.email}\n`);

  await test1_DriverJsInstalled();
  await test2_TourFilesExist();
  await test3_DataTourAttrs();
  await test4_TourMountedInPage(cookie);
  await test5_LoadingSkeletons();
  await test6_ErrorBoundaries();
  await test7_MobileResponsivePadding();
  await test8_AllRoutesLoad(cookie);
  await test9_NoTscErrorsAndCleanLog();

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
