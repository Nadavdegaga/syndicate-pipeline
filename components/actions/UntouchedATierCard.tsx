import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { ActionCard } from "./ActionCard";
import { TierBadge } from "@/components/networks/TierBadge";
import { relativeOrDash } from "@/lib/utils/dates";
import type { NetworkWithActivityRow } from "@/lib/supabase/types";

export function UntouchedATierCard({
  rows,
  total,
}: {
  rows: NetworkWithActivityRow[];
  total: number;
}) {
  return (
    <ActionCard
      title="Untouched A-Tier Networks"
      emoji="🎯"
      count={total}
      description="A-tier networks with zero contact activity in 30 days."
      viewAllHref="/networks"
      emptyMessage="A-tier all warm"
    >
      {rows.map((n) => (
        <div
          key={n.id}
          className="flex items-center justify-between gap-3 px-3 py-3"
        >
          <div className="min-w-0 flex-1">
            <Link
              href={`/networks/${n.id}`}
              className="block truncate text-sm font-medium text-slate-900 hover:underline"
            >
              {n.name}
            </Link>
            <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
              <TierBadge tier={n.tier} />
              <span>·</span>
              <span>{n.contact_count} contacts</span>
              <span>·</span>
              <span>
                last activity {relativeOrDash(n.last_contact_touch_at)}
              </span>
            </div>
          </div>
          <Link
            href={`/networks/${n.id}`}
            className="shrink-0 text-slate-400 hover:text-slate-900"
            aria-label="Open network"
          >
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      ))}
    </ActionCard>
  );
}
