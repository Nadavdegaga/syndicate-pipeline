"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Settings,
  RefreshCw,
  Loader2,
  Globe,
  CheckCircle2,
  AlertTriangle,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { relativeOrDash } from "@/lib/utils/dates";
import { platformLabel, type PlatformKind } from "@/lib/platforms/registry";

export type ConnectionCard = {
  id: string;
  platform: PlatformKind;
  display_name: string;
  last_sync_at: string | null;
  last_sync_status: "success" | "error" | "running" | null;
  last_sync_error: string | null;
  active: boolean;
};

function freshness(
  last_sync_at: string | null,
): "fresh" | "stale" | "never" {
  if (!last_sync_at) return "never";
  const age = Date.now() - new Date(last_sync_at).getTime();
  return age < 12 * 3600_000 ? "fresh" : "stale";
}

export function ConnectionsStrip({
  connections: initial,
}: {
  connections: ConnectionCard[];
}) {
  const [connections, setConnections] = useState(initial);
  const [pending, setPending] = useState<string | null>(null);

  async function syncNow(c: ConnectionCard) {
    setPending(c.id);
    try {
      const r = await fetch(`/api/connections/${c.id}/sync`, {
        method: "POST",
      });
      const data = await r.json();
      if (!r.ok || !data.ok) {
        toast.error(data.error ?? `Sync failed (${r.status})`);
      } else {
        toast.success(
          `${c.display_name}: fetched ${data.offers_fetched}, +${data.offers_new} new, ~${data.offers_updated} updated`,
        );
        setConnections((cs) =>
          cs.map((x) =>
            x.id === c.id
              ? {
                  ...x,
                  last_sync_at: new Date().toISOString(),
                  last_sync_status: data.status,
                  last_sync_error: data.error ?? null,
                }
              : x,
          ),
        );
      }
    } catch (e) {
      toast.error("Network error: " + (e instanceof Error ? e.message : e));
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Platform connections
        </h3>
        <Button asChild variant="outline" size="sm">
          <Link
            href="/external-offers/connections"
            data-tour="manage-connections"
          >
            Manage all
          </Link>
        </Button>
      </div>
      {connections.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white px-6 py-10 text-center">
          <Globe className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-2 text-sm font-medium text-slate-900">
            No platforms connected yet
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Hook up an Everflow, Cake, or Affise account to start pulling offers
            here.
          </p>
          <Button asChild className="mt-4" size="sm">
            <Link href="/external-offers/connections">Add a connection</Link>
          </Button>
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {connections.map((c) => (
            <Card
              key={c.id}
              connection={c}
              onSync={() => syncNow(c)}
              pending={pending === c.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Card({
  connection: c,
  onSync,
  pending,
}: {
  connection: ConnectionCard;
  onSync: () => void;
  pending: boolean;
}) {
  const f = freshness(c.last_sync_at);
  const statusColor =
    c.last_sync_status === "error"
      ? "bg-red-500"
      : f === "fresh"
        ? "bg-emerald-500"
        : f === "stale"
          ? "bg-amber-500"
          : "bg-slate-300";

  const StatusIcon =
    c.last_sync_status === "error"
      ? AlertTriangle
      : f === "fresh"
        ? CheckCircle2
        : Clock;

  return (
    <div
      data-tour="connection-card"
      className={cn(
        "shrink-0 w-72 rounded-xl border bg-white p-4 shadow-sm",
        c.active ? "border-slate-200" : "border-slate-200 opacity-60",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={cn(
              "h-2 w-2 shrink-0 rounded-full ring-1 ring-white",
              statusColor,
            )}
          />
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-slate-900">
              {c.display_name}
            </div>
            <div className="text-[10px] uppercase tracking-wider text-slate-500">
              {platformLabel(c.platform)}
            </div>
          </div>
        </div>
        <Link
          href={`/external-offers/connections#${c.id}`}
          className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          title="Manage"
        >
          <Settings className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
        <StatusIcon className="h-3 w-3" />
        <span>Last sync {relativeOrDash(c.last_sync_at)}</span>
      </div>
      {c.last_sync_error && (
        <p className="mt-1 truncate text-[10px] text-red-600" title={c.last_sync_error}>
          {c.last_sync_error}
        </p>
      )}

      <Button
        size="sm"
        variant="outline"
        className="mt-3 w-full gap-1.5 text-xs"
        onClick={onSync}
        disabled={pending || !c.active}
      >
        {pending ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <RefreshCw className="h-3 w-3" />
        )}
        Sync now
      </Button>
    </div>
  );
}
