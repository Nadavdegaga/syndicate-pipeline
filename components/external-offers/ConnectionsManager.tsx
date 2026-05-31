"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2, RefreshCw, Loader2, Power, PowerOff, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { relativeOrDash } from "@/lib/utils/dates";
import { AddConnectionWizard } from "./AddConnectionWizard";
import {
  deleteConnection,
  updateConnection,
} from "@/lib/actions/connections";
import { platformLabel, type PlatformKind } from "@/lib/platforms/registry";

export type ConnectionFull = {
  id: string;
  platform: PlatformKind;
  display_name: string;
  base_url: string;
  sync_frequency_hours: number;
  last_sync_at: string | null;
  last_sync_status: "success" | "error" | "running" | null;
  last_sync_error: string | null;
  active: boolean;
  created_at: string;
};

export function ConnectionsManager({
  initialConnections,
}: {
  initialConnections: ConnectionFull[];
}) {
  const [connections, setConnections] = useState(initialConnections);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function syncNow(c: ConnectionFull) {
    setPendingId(c.id);
    try {
      const r = await fetch(`/api/connections/${c.id}/sync`, { method: "POST" });
      const data = await r.json();
      if (!r.ok || !data.ok) {
        toast.error(data.error ?? "Sync failed");
      } else {
        toast.success(
          `Synced ${data.offers_fetched} (+${data.offers_new} new, -${data.offers_deactivated} stale)`,
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
      setPendingId(null);
    }
  }

  function toggleActive(c: ConnectionFull) {
    startTransition(async () => {
      const r = await updateConnection(c.id, { active: !c.active });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      setConnections((cs) =>
        cs.map((x) => (x.id === c.id ? { ...x, active: !c.active } : x)),
      );
      toast.success(c.active ? "Paused" : "Resumed");
    });
  }

  function remove(c: ConnectionFull) {
    if (
      !confirm(
        `Delete the "${c.display_name}" connection? This removes all ${c.display_name} external offers we've pulled (your /offers entries remain).`,
      )
    )
      return;
    startTransition(async () => {
      const r = await deleteConnection(c.id);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      setConnections((cs) => cs.filter((x) => x.id !== c.id));
      toast.success("Connection deleted");
    });
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
          Connections
        </h2>
        <Button
          onClick={() => setWizardOpen(true)}
          className="gap-2"
          data-tour="add-connection-button"
        >
          <Plus className="h-4 w-4" /> Add connection
        </Button>
      </div>

      {connections.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center">
          <p className="text-sm font-medium text-slate-900">
            No connections yet
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Click <strong>Add connection</strong> to wire up your first
            platform.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {connections.map((c) => (
            <div
              key={c.id}
              id={c.id}
              className={cn(
                "rounded-2xl border bg-white p-5 shadow-sm",
                c.active ? "border-slate-200" : "border-slate-200 opacity-70",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[10px] uppercase tracking-wider text-slate-500">
                    {platformLabel(c.platform)}
                  </div>
                  <h3 className="truncate text-base font-semibold text-slate-900">
                    {c.display_name}
                  </h3>
                </div>
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider ring-1 ring-inset",
                    c.active
                      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                      : "bg-slate-100 text-slate-500 ring-slate-200",
                  )}
                >
                  {c.active ? "Active" : "Paused"}
                </span>
              </div>

              <Separator className="my-3" />

              <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                <dt className="text-slate-500">Base URL</dt>
                <dd className="truncate font-mono text-[10px]" title={c.base_url}>
                  {c.base_url || "—"}
                </dd>
                <dt className="text-slate-500">Frequency</dt>
                <dd>Every {c.sync_frequency_hours}h</dd>
                <dt className="text-slate-500">Last sync</dt>
                <dd>{relativeOrDash(c.last_sync_at)}</dd>
                <dt className="text-slate-500">Status</dt>
                <dd
                  className={cn(
                    c.last_sync_status === "error"
                      ? "text-red-600"
                      : c.last_sync_status === "running"
                        ? "text-amber-600"
                        : c.last_sync_status === "success"
                          ? "text-emerald-600"
                          : "text-slate-500",
                  )}
                >
                  {c.last_sync_status ?? "—"}
                </dd>
              </dl>

              {c.last_sync_error && (
                <p
                  className="mt-2 truncate rounded bg-red-50 px-2 py-1 text-[11px] text-red-700"
                  title={c.last_sync_error}
                >
                  {c.last_sync_error}
                </p>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  disabled={pendingId === c.id || !c.active}
                  onClick={() => syncNow(c)}
                >
                  {pendingId === c.id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3 w-3" />
                  )}
                  Sync now
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="gap-1.5 text-xs"
                  onClick={() => toggleActive(c)}
                >
                  {c.active ? (
                    <>
                      <PowerOff className="h-3 w-3" /> Pause
                    </>
                  ) : (
                    <>
                      <Power className="h-3 w-3" /> Resume
                    </>
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="gap-1.5 text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
                  onClick={() => remove(c)}
                >
                  <Trash2 className="h-3 w-3" /> Delete
                </Button>
                {c.base_url && (
                  <a
                    href={c.base_url}
                    target="_blank"
                    rel="noreferrer"
                    className="ml-auto inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-800"
                  >
                    {new URL(c.base_url).host}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <AddConnectionWizard open={wizardOpen} onOpenChange={setWizardOpen} />
    </>
  );
}
