"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  Sparkles,
  Bell,
  AlertTriangle,
  Clock,
  Snowflake,
  Zap,
  ShieldAlert,
  X,
  ArrowRight,
  Loader2,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { dismissInsight } from "@/lib/actions/smart-insights";

export type InsightRow = {
  id: string;
  kind:
    | "matchmaker_hit"
    | "followup_reminder"
    | "cold_atier"
    | "new_offer_pitch"
    | "pending_too_long"
    | "new_external_offer"
    | "data_quality";
  title: string;
  body: string | null;
  priority: number;
  cta_label: string | null;
  cta_href: string | null;
  brand_context: string | null;
};

const KIND_META: Record<
  InsightRow["kind"],
  { icon: LucideIcon; bg: string; iconBg: string; iconColor: string; ring: string; label: string }
> = {
  matchmaker_hit: {
    icon: Sparkles,
    bg: "from-emerald-50 to-white",
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-600",
    ring: "ring-emerald-200/60",
    label: "Match opportunity",
  },
  followup_reminder: {
    icon: Bell,
    bg: "from-amber-50 to-white",
    iconBg: "bg-amber-100",
    iconColor: "text-amber-600",
    ring: "ring-amber-200/60",
    label: "Follow up",
  },
  cold_atier: {
    icon: Snowflake,
    bg: "from-sky-50 to-white",
    iconBg: "bg-sky-100",
    iconColor: "text-sky-600",
    ring: "ring-sky-200/60",
    label: "A-tier cooling",
  },
  new_offer_pitch: {
    icon: Zap,
    bg: "from-violet-50 to-white",
    iconBg: "bg-violet-100",
    iconColor: "text-violet-600",
    ring: "ring-violet-200/60",
    label: "Pitch-ready",
  },
  pending_too_long: {
    icon: Clock,
    bg: "from-red-50 to-white",
    iconBg: "bg-red-100",
    iconColor: "text-red-600",
    ring: "ring-red-200/60",
    label: "Stalled",
  },
  new_external_offer: {
    icon: AlertTriangle,
    bg: "from-blue-50 to-white",
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
    ring: "ring-blue-200/60",
    label: "External offer",
  },
  data_quality: {
    icon: ShieldAlert,
    bg: "from-slate-50 to-white",
    iconBg: "bg-slate-100",
    iconColor: "text-slate-500",
    ring: "ring-slate-200/60",
    label: "Cleanup",
  },
};

const MAX_VISIBLE = 6;

export function SmartInsights({ initialRows }: { initialRows: InsightRow[] }) {
  const [rows, setRows] = useState(initialRows);
  const visible = rows.slice(0, MAX_VISIBLE);

  if (visible.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white/60 p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
          <Sparkles className="h-5 w-5 text-emerald-600" />
        </div>
        <p className="mt-3 text-sm font-medium text-slate-900">
          No urgent insights right now
        </p>
        <p className="mt-1 text-xs text-slate-500">
          We&apos;ll surface match opportunities, stalled leads, and cleanup work
          here as they arise.
        </p>
      </div>
    );
  }

  return (
    <div data-tour="smart-insights" className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
          💡 Smart insights
        </h2>
        <span className="text-xs text-slate-400">
          {visible.length} of {rows.length}
        </span>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((r) => (
          <Card
            key={r.id}
            row={r}
            onDismiss={() => setRows((rs) => rs.filter((x) => x.id !== r.id))}
          />
        ))}
      </div>
    </div>
  );
}

function Card({ row, onDismiss }: { row: InsightRow; onDismiss: () => void }) {
  const meta = KIND_META[row.kind];
  const Icon = meta.icon;
  const [pending, startTransition] = useTransition();

  function dismiss() {
    startTransition(async () => {
      const r = await dismissInsight(row.id);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      onDismiss();
    });
  }

  return (
    <div
      className={cn(
        "group relative flex flex-col rounded-2xl border border-slate-200 bg-gradient-to-br p-4 shadow-sm transition-shadow hover:shadow-md",
        meta.bg,
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset",
            meta.iconBg,
            meta.ring,
          )}
        >
          <Icon className={cn("h-4 w-4", meta.iconColor)} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
              {meta.label}
            </span>
            {row.brand_context && (
              <span className="rounded-full bg-white/60 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-slate-500">
                {row.brand_context}
              </span>
            )}
          </div>
          <h3 className="mt-0.5 text-sm font-semibold leading-tight text-slate-900">
            {row.title}
          </h3>
          {row.body && (
            <p className="mt-1 text-xs text-slate-600">{row.body}</p>
          )}
        </div>
        <button
          type="button"
          onClick={dismiss}
          disabled={pending}
          aria-label="Dismiss"
          className="shrink-0 text-slate-400 opacity-0 transition-opacity hover:text-slate-700 group-hover:opacity-100 disabled:opacity-50"
        >
          {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
        </button>
      </div>
      {row.cta_href && row.cta_label && (
        <div className="mt-3 pt-2 border-t border-white/60">
          <Button asChild variant="ghost" size="sm" className="-ml-2 h-7 gap-1 text-xs text-slate-700 hover:text-slate-900">
            <Link href={row.cta_href}>
              {row.cta_label}
              <ArrowRight className="h-3 w-3" />
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
