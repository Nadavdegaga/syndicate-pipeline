# Syndicate Pipeline

A multi-user CRM + BI workspace for managing affiliate-network relationships across three brands — Nomi Media, StarTech, and Luminarix. All three brands contact the same pool of networks and publishers independently, so every contact has three parallel relationship statuses. The app replaces the original Excel workflow with a Next.js 14 + Supabase workspace featuring an Insights dashboard, an AI Ask feature powered by Claude, a Kanban view, MatchMaker for pairing publisher wishlists with offers, a 6-step CSV/Excel import wizard, saved views, realtime updates, and a Welcome tour for new users.

## Stack

Next.js 14 (App Router) · TypeScript strict · Tailwind v3 · shadcn/ui (slate) · Supabase (Auth + Postgres + Realtime) · `@anthropic-ai/sdk` for the Ask feature · `@tanstack/react-table` · `recharts` · `papaparse` + `xlsx` for import · `driver.js` for the tour · deployed on Vercel.

## Dev setup

```bash
# 1. Install deps
npm install

# 2. Copy the env template and fill in real values from Supabase + Anthropic dashboards
cp .env.example .env.local

# 3. Run the dev server
npm run dev
# → http://localhost:3000

# 4. (One-time) Apply the schema addendum if you haven't already
# Open supabase/migrations/002_app_tables.sql in the Supabase SQL editor and Run.
```

## Required env vars

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
```

## Project structure

- `app/` — Next.js App Router routes (`(auth)/login`, `(app)/{insights,ask,today,contacts,networks,offers,wishlists,demand,matchmaker,import,settings}`)
- `components/` — Shell, per-entity tables, drawers, charts, shared primitives (FilterBuilder, SavedViewsBar, DataTable, EmptyState…)
- `lib/actions/` — Server actions (contacts, networks, offers, today, matchmaker, import, saved-views, activity)
- `lib/ai/` — Claude tool definitions + run loop for the `/ask` feature
- `lib/utils/` — Status palette, brand helpers, filter spec, fuzzy match scoring, dates
- `lib/supabase/` — Browser + server + middleware clients, row types
- `hooks/` — `useBrand`, `useDebounce`, `useRealtime`
- `supabase/migrations/` — SQL migrations (002 adds `saved_views` + `ask_history`)
- `test/` — Self-test scripts for each build phase (`node test/phase{3..7}-selftest.mjs`)

## Self-tests

```bash
node test/phase3-selftest.mjs   # CRUD + drawer + activity log
node test/phase4-selftest.mjs   # Insights + Ask (uses Anthropic credits)
node test/phase5-selftest.mjs   # Today's Actions + MatchMaker
node test/phase6-selftest.mjs   # Filter + Saved Views + Kanban + Import + Realtime
node test/phase7-selftest.mjs   # Tour + skeletons + error boundaries + responsive
```

Self-tests require the dev server running on `http://localhost:3019` and a Supabase user that exists in `auth.users`. They authenticate via a temporary password reset on that user, so don't run them against production accounts you care about.

## Deploy

Push to GitHub and connect the repo to Vercel. Set the 4 env vars in Vercel Project Settings → Environment Variables. Vercel auto-detects Next.js and builds.
