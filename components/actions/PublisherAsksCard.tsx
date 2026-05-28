import Link from "next/link";
import { Search } from "lucide-react";
import { ActionCard } from "./ActionCard";
import type { WishlistRow } from "@/lib/supabase/types";

export function PublisherAsksCard({
  rows,
  total,
}: {
  rows: (WishlistRow & { age_days: number })[];
  total: number;
}) {
  return (
    <ActionCard
      title="Publisher Asks Waiting"
      emoji="🤝"
      count={total}
      description="Open wishlists waiting 3+ days for a match. Pair them up."
      viewAllHref="/wishlists?q=open"
      emptyMessage="No pending asks"
    >
      {rows.map((w) => (
        <div
          key={w.id}
          className="flex items-center justify-between gap-3 px-3 py-3"
        >
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-slate-900">
              {w.publisher_name ?? "(unknown publisher)"}
            </div>
            <div className="mt-0.5 truncate text-xs text-slate-500">
              wants <span className="text-slate-700">{w.requested_offer}</span>
              {w.vertical && <span> · {w.vertical}</span>}
              <span> · {w.age_days}d ago</span>
            </div>
          </div>
          <Link
            href={`/matchmaker?wishlist=${w.id}`}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            title="Find matching offers"
          >
            <Search className="h-4 w-4" />
          </Link>
        </div>
      ))}
    </ActionCard>
  );
}
