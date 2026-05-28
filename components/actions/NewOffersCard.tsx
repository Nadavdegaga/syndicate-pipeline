"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Loader2, CheckCircle2, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ActionCard } from "./ActionCard";
import { markOfferPitchedToday } from "@/lib/actions/today";
import { relativeOrDash } from "@/lib/utils/dates";
import { getOfferStatusStyle } from "@/lib/utils/status";
import { cn } from "@/lib/utils";
import type { OfferRow } from "@/lib/supabase/types";

export function NewOffersCard({
  rows: initialRows,
  total,
}: {
  rows: OfferRow[];
  total: number;
}) {
  const [rows, setRows] = useState(initialRows);
  return (
    <ActionCard
      title="New Offers to Pitch"
      emoji="💼"
      count={rows.length === 0 ? 0 : total}
      description="Created in the last 30 days · ready to match with publishers."
      viewAllHref="/offers"
      emptyMessage="No new offers"
    >
      {rows.map((o) => (
        <Row
          key={o.id}
          offer={o}
          onResolve={() => setRows((r) => r.filter((x) => x.id !== o.id))}
        />
      ))}
    </ActionCard>
  );
}

function Row({
  offer,
  onResolve,
}: {
  offer: OfferRow;
  onResolve: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const status = getOfferStatusStyle(offer.status);
  function pitch() {
    startTransition(async () => {
      const r = await markOfferPitchedToday(offer.id);
      if (r.ok) {
        toast.success(`Marked ${offer.name} as pitched`);
        onResolve();
      } else toast.error(r.error);
    });
  }
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-3">
      <div className="min-w-0 flex-1">
        <Link
          href={`/offers/${offer.id}`}
          className="block truncate text-sm font-medium text-slate-900 hover:underline"
        >
          {offer.name}
        </Link>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
          {offer.network_name && (
            <span className="truncate">{offer.network_name}</span>
          )}
          {offer.payout && <span>· {offer.payout}</span>}
          <span>· created {relativeOrDash(offer.created_at)}</span>
          <span
            className={cn(
              "inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] uppercase tracking-wide ring-1 ring-inset",
              status.bg,
              status.text,
              status.ring,
            )}
          >
            {status.label}
          </span>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Link
          href={`/matchmaker?offer=${offer.id}`}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          title="Find publishers"
        >
          <Search className="h-4 w-4" />
        </Link>
        <Button
          variant="ghost"
          size="sm"
          onClick={pitch}
          disabled={pending}
          title="Mark pitched"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
