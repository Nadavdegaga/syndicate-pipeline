"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  Key,
  Download,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  CartesianGrid,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export type DailyStat = {
  report_date: string;
  offer_id: string;
  source: string;
  clicks: number;
  conversions: number;
  revenue: number;
  cost: number;
  profit: number;
};

type Range = "today" | "yesterday" | "7d" | "30d" | "custom";

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function rangeBounds(r: Range, custom?: { from: string; to: string }): { from: string; to: string } {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  if (r === "today") return { from: isoDate(today), to: isoDate(today) };
  if (r === "yesterday") {
    const y = new Date(today);
    y.setUTCDate(today.getUTCDate() - 1);
    return { from: isoDate(y), to: isoDate(y) };
  }
  if (r === "7d") {
    const from = new Date(today);
    from.setUTCDate(today.getUTCDate() - 6);
    return { from: isoDate(from), to: isoDate(today) };
  }
  if (r === "30d") {
    const from = new Date(today);
    from.setUTCDate(today.getUTCDate() - 29);
    return { from: isoDate(from), to: isoDate(today) };
  }
  return { from: custom?.from ?? "", to: custom?.to ?? "" };
}

function daysBetween(from: string, to: string): number {
  const a = new Date(from + "T00:00:00Z").getTime();
  const b = new Date(to + "T00:00:00Z").getTime();
  return Math.max(1, Math.floor((b - a) / 86400_000) + 1);
}

function previousRange(from: string, to: string): { from: string; to: string } {
  const days = daysBetween(from, to);
  const f = new Date(from + "T00:00:00Z");
  f.setUTCDate(f.getUTCDate() - days);
  const t = new Date(to + "T00:00:00Z");
  t.setUTCDate(t.getUTCDate() - days);
  return { from: isoDate(f), to: isoDate(t) };
}

function formatUSD(n: number): string {
  return "$" + (Math.round(n * 100) / 100).toLocaleString();
}
function formatInt(n: number): string {
  return Math.round(n).toLocaleString();
}

function pctChange(curr: number, prev: number): number | null {
  if (prev === 0) return curr === 0 ? 0 : null;
  return ((curr - prev) / prev) * 100;
}

type SyncState = "idle" | "syncing" | "done" | "error";

export function NomiDashboard({
  rows,
  canSync = false,
}: {
  rows: DailyStat[];
  canSync?: boolean;
}) {
  const router = useRouter();
  const [range, setRange] = useState<Range>("7d");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const [syncState, setSyncState] = useState<SyncState>("idle");
  const [syncMsg, setSyncMsg] = useState("");
  const [syncDate, setSyncDate] = useState(() => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - 1);
    return d.toISOString().slice(0, 10);
  });

  async function handleSync() {
    setSyncState("syncing");
    setSyncMsg("");
    try {
      const res = await fetch("/api/nomi/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: syncDate }),
      });
      const json = await res.json();
      if (json.ok) {
        setSyncState("done");
        setSyncMsg(`Synced ${json.upserted} rows for ${json.date}`);
        router.refresh();
      } else {
        setSyncState("error");
        setSyncMsg(json.error ?? "Sync failed");
      }
    } catch (e) {
      setSyncState("error");
      setSyncMsg(e instanceof Error ? e.message : "Sync failed");
    }
  }

  const bounds = rangeBounds(range, { from: customFrom, to: customTo });

  const filtered = useMemo(() => {
    if (!bounds.from || !bounds.to) return [];
    return rows.filter((r) => r.report_date >= bounds.from && r.report_date <= bounds.to);
  }, [rows, bounds.from, bounds.to]);

  const prevBounds = previousRange(bounds.from || isoDate(new Date()), bounds.to || isoDate(new Date()));
  const prevRows = useMemo(() => {
    if (!prevBounds.from || !prevBounds.to) return [];
    return rows.filter(
      (r) => r.report_date >= prevBounds.from && r.report_date <= prevBounds.to,
    );
  }, [rows, prevBounds.from, prevBounds.to]);

  function sum(rows: DailyStat[], key: keyof DailyStat): number {
    return rows.reduce((s, r) => s + (Number(r[key]) || 0), 0);
  }

  const cur = {
    clicks: sum(filtered, "clicks"),
    conversions: sum(filtered, "conversions"),
    revenue: sum(filtered, "revenue"),
    profit: sum(filtered, "profit"),
  };
  const prev = {
    clicks: sum(prevRows, "clicks"),
    conversions: sum(prevRows, "conversions"),
    revenue: sum(prevRows, "revenue"),
    profit: sum(prevRows, "profit"),
  };

  const dailySeries = useMemo(() => {
    const map = new Map<string, { revenue: number; profit: number }>();
    for (const r of filtered) {
      const prev = map.get(r.report_date) ?? { revenue: 0, profit: 0 };
      prev.revenue += Number(r.revenue) || 0;
      prev.profit += Number(r.profit) || 0;
      map.set(r.report_date, prev);
    }
    return Array.from(map.entries())
      .map(([date, v]) => ({ date, ...v }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [filtered]);

  const perOffer = useMemo(() => {
    const map = new Map<string, DailyStat & { rows_count: number }>();
    for (const r of filtered) {
      const existing = map.get(r.offer_id);
      if (existing) {
        existing.clicks += r.clicks;
        existing.conversions += r.conversions;
        existing.revenue += Number(r.revenue);
        existing.cost += Number(r.cost);
        existing.profit += Number(r.profit);
        existing.rows_count += 1;
      } else {
        map.set(r.offer_id, { ...r, rows_count: 1 });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
  }, [filtered]);

  if (rows.length === 0) {
    return <EmptyNomiState canSync={canSync} syncDate={syncDate} setSyncDate={setSyncDate} onSync={handleSync} syncState={syncState} syncMsg={syncMsg} />;
  }

  return (
    <div className="space-y-6" data-tour="nomi-dashboard">
      {/* Sync bar */}
      {canSync && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <RefreshCw className={cn("h-4 w-4 text-slate-400", syncState === "syncing" && "animate-spin")} />
          <span className="text-xs font-medium text-slate-600">Sync from Nomi</span>
          <input
            type="date"
            value={syncDate}
            onChange={(e) => { setSyncDate(e.target.value); setSyncState("idle"); setSyncMsg(""); }}
            className="rounded-md border border-slate-200 px-2 py-1 text-xs"
          />
          <button
            onClick={handleSync}
            disabled={syncState === "syncing"}
            className="rounded-full border border-slate-900 bg-slate-900 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-slate-700 disabled:opacity-50"
          >
            {syncState === "syncing" ? "Syncing…" : "Sync now"}
          </button>
          {syncMsg && (
            <span className={cn("text-xs", syncState === "done" ? "text-emerald-600" : "text-red-600")}>
              {syncMsg}
            </span>
          )}
          <span className="ml-auto text-xs text-slate-400">Runs automatically every day at 03:00 UTC</span>
        </div>
      )}

      {/* Date range picker */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <span className="text-xs uppercase tracking-wider text-slate-500">Range</span>
        {(
          [
            ["today", "Today"],
            ["yesterday", "Yesterday"],
            ["7d", "Last 7"],
            ["30d", "Last 30"],
            ["custom", "Custom"],
          ] as Array<[Range, string]>
        ).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setRange(k)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              range === k
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
            )}
          >
            {label}
          </button>
        ))}
        {range === "custom" && (
          <>
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="ml-2 rounded-md border border-slate-200 px-2 py-1 text-xs"
            />
            <span className="text-xs text-slate-400">→</span>
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="rounded-md border border-slate-200 px-2 py-1 text-xs"
            />
          </>
        )}
        <span className="ml-auto text-xs text-slate-500">
          {bounds.from} → {bounds.to} ({daysBetween(bounds.from, bounds.to)}d)
        </span>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiWithDelta label="Clicks" value={cur.clicks} prev={prev.clicks} format={formatInt} />
        <KpiWithDelta label="Conversions" value={cur.conversions} prev={prev.conversions} format={formatInt} />
        <KpiWithDelta label="Revenue" value={cur.revenue} prev={prev.revenue} format={formatUSD} />
        <KpiWithDelta label="Profit" value={cur.profit} prev={prev.profit} format={formatUSD} />
      </div>

      {/* Daily revenue line */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">Daily revenue & profit</h3>
          <span className="text-xs text-slate-400">{dailySeries.length} day(s)</span>
        </div>
        <Separator className="my-4" />
        {dailySeries.length === 0 ? (
          <div className="flex h-48 items-center justify-center text-sm text-slate-400">
            No data in selected range
          </div>
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailySeries}>
                <CartesianGrid stroke="#f1f5f9" />
                <XAxis dataKey="date" fontSize={11} stroke="#94a3b8" />
                <YAxis fontSize={11} stroke="#94a3b8" />
                <RechartsTooltip
                  contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}
                  formatter={(v) => formatUSD(Number(v))}
                />
                <Line type="monotone" dataKey="revenue" stroke="#0ea5e9" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="profit" stroke="#22c55e" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Per-offer breakdown */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="px-6 py-4">
          <h3 className="text-sm font-semibold text-slate-900">Per-offer breakdown</h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Aggregated across {bounds.from} → {bounds.to}. Sorted by revenue.
          </p>
        </div>
        <Separator />
        {perOffer.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-slate-400">
            No offer data in this range
          </div>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50/60">
                <tr className="text-left text-[10px] uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-2 font-semibold">Offer ID</th>
                  <th className="px-4 py-2 text-right font-semibold">Clicks</th>
                  <th className="px-4 py-2 text-right font-semibold">Conv.</th>
                  <th className="px-4 py-2 text-right font-semibold">CR</th>
                  <th className="px-4 py-2 text-right font-semibold">EPC</th>
                  <th className="px-4 py-2 text-right font-semibold">Revenue</th>
                  <th className="px-4 py-2 text-right font-semibold">Profit</th>
                </tr>
              </thead>
              <tbody>
                {perOffer.map((o, i) => {
                  const cr = o.clicks > 0 ? (o.conversions / o.clicks) * 100 : 0;
                  const epc = o.clicks > 0 ? o.revenue / o.clicks : 0;
                  return (
                    <tr
                      key={o.offer_id}
                      className={cn(
                        "border-b border-slate-100 last:border-b-0",
                        i % 2 === 1 && "bg-slate-50/40",
                      )}
                    >
                      <td className="px-4 py-2 font-mono text-xs text-slate-700">{o.offer_id}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{formatInt(o.clicks)}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{formatInt(o.conversions)}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{cr.toFixed(2)}%</td>
                      <td className="px-4 py-2 text-right tabular-nums">${epc.toFixed(2)}</td>
                      <td className="px-4 py-2 text-right tabular-nums font-medium text-slate-900">
                        {formatUSD(o.revenue)}
                      </td>
                      <td
                        className={cn(
                          "px-4 py-2 text-right tabular-nums font-medium",
                          o.profit >= 0 ? "text-emerald-700" : "text-red-700",
                        )}
                      >
                        {formatUSD(o.profit)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function KpiWithDelta({
  label,
  value,
  prev,
  format,
}: {
  label: string;
  value: number;
  prev: number;
  format: (n: number) => string;
}) {
  const pct = pctChange(value, prev);
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wider text-slate-500">{label}</div>
      <div className="mt-3 text-3xl font-semibold tabular-nums text-slate-900">{format(value)}</div>
      <div className="mt-1 text-xs">
        {pct === null ? (
          <span className="text-slate-400">vs prev: no data</span>
        ) : (
          <span
            className={cn(
              "inline-flex items-center gap-1",
              pct === 0 ? "text-slate-500" : pct > 0 ? "text-emerald-600" : "text-red-600",
            )}
          >
            {pct > 0 ? <ArrowUp className="h-3 w-3" /> : pct < 0 ? <ArrowDown className="h-3 w-3" /> : null}
            {pct === 0 ? "no change" : `${Math.abs(pct).toFixed(1)}% vs prev`}
          </span>
        )}
      </div>
    </div>
  );
}

function EmptyNomiState({
  canSync,
  syncDate,
  setSyncDate,
  onSync,
  syncState,
  syncMsg,
}: {
  canSync: boolean;
  syncDate: string;
  setSyncDate: (d: string) => void;
  onSync: () => void;
  syncState: SyncState;
  syncMsg: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8">
      <div className="mx-auto max-w-xl space-y-4 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-violet-100">
          <Download className="h-6 w-6 text-violet-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900">No Nomi data yet</h2>
          <p className="mt-1 text-sm text-slate-500">
            Once your Nomi stats are flowing in, you&apos;ll see KPIs, daily trends, and a
            per-offer breakdown here.
          </p>
        </div>
        <Separator />

        {canSync ? (
          <div className="space-y-3 text-left text-sm">
            <p className="font-medium text-slate-900">Pull stats directly from Nomi</p>
            <p className="text-slate-500">
              Your Nomi credentials are configured. Pick a date and sync to get started.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="date"
                value={syncDate}
                onChange={(e) => setSyncDate(e.target.value)}
                className="rounded-md border border-slate-200 px-2 py-1.5 text-sm"
              />
              <Button onClick={onSync} disabled={syncState === "syncing"} className="gap-2">
                <RefreshCw className={cn("h-4 w-4", syncState === "syncing" && "animate-spin")} />
                {syncState === "syncing" ? "Syncing…" : "Sync now"}
              </Button>
            </div>
            {syncMsg && (
              <p className={cn("text-xs", syncState === "done" ? "text-emerald-600" : "text-red-600")}>
                {syncMsg}
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-2 text-left text-sm">
            <p className="font-medium text-slate-900">How to send data (for your engineer)</p>
            <ol className="list-decimal space-y-2 pl-5 text-slate-700">
              <li>
                Generate an API key on{" "}
                <Link href="/settings/api-keys" className="text-blue-600 underline">
                  Settings → API ingest keys
                </Link>
                .
              </li>
              <li>
                POST daily stats to{" "}
                <code className="rounded bg-slate-100 px-1 text-xs">/api/ingest/nomi</code>{" "}
                with header{" "}
                <code className="rounded bg-slate-100 px-1 text-xs">X-API-Key: &lt;key&gt;</code>.
              </li>
              <li>
                Body: a JSON array (or single object). Required fields per row:{" "}
                <code className="rounded bg-slate-100 px-1 text-xs">report_date</code>{" "}
                (YYYY-MM-DD) and{" "}
                <code className="rounded bg-slate-100 px-1 text-xs">offer_id</code>. Numeric:{" "}
                <code className="rounded bg-slate-100 px-1 text-xs">clicks</code>,{" "}
                <code className="rounded bg-slate-100 px-1 text-xs">conversions</code>,{" "}
                <code className="rounded bg-slate-100 px-1 text-xs">revenue</code>,{" "}
                <code className="rounded bg-slate-100 px-1 text-xs">cost</code>. Re-sends for the same{" "}
                <code className="rounded bg-slate-100 px-1 text-xs">(report_date, offer_id, source)</code>{" "}
                are idempotent.
              </li>
            </ol>
            <Button asChild className="mt-2 gap-2">
              <Link href="/settings/api-keys">
                <Key className="h-4 w-4" /> Generate API key
                <ExternalLink className="h-3 w-3" />
              </Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
