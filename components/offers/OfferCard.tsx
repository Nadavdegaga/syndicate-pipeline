import Link from "next/link";
import { ExternalLink, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { getOfferStatusStyle } from "@/lib/utils/status";
import type { OfferRow } from "@/lib/supabase/types";

export function OfferCard({ offer }: { offer: OfferRow }) {
  const statusStyle = getOfferStatusStyle(offer.status);

  return (
    <Link
      href={`/offers/${offer.id}`}
      className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3
            className="truncate text-base font-semibold leading-tight text-slate-900 group-hover:text-slate-700"
            title={offer.name}
          >
            {offer.name}
          </h3>
          {offer.network_name && (
            <p className="mt-1 truncate text-sm text-slate-500">
              {offer.network_name}
            </p>
          )}
        </div>
        <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-300 transition-colors group-hover:text-slate-700" />
      </div>

      {offer.vertical && (
        <div className="mt-3">
          <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-slate-600">
            {offer.vertical}
          </span>
        </div>
      )}

      <div className="mt-4 flex items-end justify-between">
        <div>
          {offer.payout ? (
            <p className="text-xl font-semibold tabular-nums text-slate-900">
              {offer.payout}
            </p>
          ) : (
            <p className="text-sm text-slate-400">No payout</p>
          )}
        </div>
        <span
          className={cn(
            "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ring-1 ring-inset",
            statusStyle.bg,
            statusStyle.text,
            statusStyle.ring,
          )}
        >
          {statusStyle.label}
        </span>
      </div>

      {offer.traffic_sources && (
        <div className="mt-4 border-t border-slate-100 pt-3">
          <p
            className="truncate text-xs text-slate-500"
            title={offer.traffic_sources}
          >
            {offer.traffic_sources}
          </p>
        </div>
      )}

      {offer.preview_link && (
        <div className="mt-3 flex items-center gap-1 text-xs text-slate-400">
          <ExternalLink className="h-3 w-3" />
          Preview available
        </div>
      )}
    </Link>
  );
}
