import Link from "next/link";
import { Briefcase, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { OfferCard } from "@/components/offers/OfferCard";
import { Button } from "@/components/ui/button";
import { SearchBar } from "@/components/shared/SearchBar";
import { Pagination } from "@/components/shared/Pagination";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { FilterBuilder } from "@/components/shared/FilterBuilder";
import { SavedViewsBar } from "@/components/shared/SavedViewsBar";
import {
  applyFilterSpec,
  decodeFilter,
  OFFER_FIELDS,
} from "@/lib/utils/filter";
import { listSavedViews } from "@/lib/actions/saved-views";
import { DEFAULT_VIEWS } from "@/lib/saved-views/defaults";
import type { OfferRow } from "@/lib/supabase/types";

const PAGE_SIZE = 24;

type SearchParams = { q?: string; page?: string; f?: string };

export default async function OffersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const q = (searchParams.q ?? "").trim();
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  const filter = decodeFilter(searchParams.f);

  const supabase = createClient();
  let query = supabase
    .from("offers")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (q) {
    const esc = q.replace(/[%,]/g, "");
    query = query.or(
      `name.ilike.%${esc}%,network_name.ilike.%${esc}%,vertical.ilike.%${esc}%`,
    );
  }
  query = applyFilterSpec(query, filter);

  const [{ data, count, error }, savedViews] = await Promise.all([
    query,
    listSavedViews("offer"),
  ]);
  const rows = (data ?? []) as OfferRow[];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Offers"
        icon={Briefcase}
        description="Cataloged campaigns across networks — click a card for full details."
        meta={error ? undefined : `${(count ?? 0).toLocaleString()} offers`}
        actions={
          <Button asChild size="sm" className="gap-2" data-tour="add-offer-button">
            <Link href="/offers/new">
              <Plus className="h-4 w-4" /> Add Offer
            </Link>
          </Button>
        }
      />

      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SearchBar placeholder="Search offer name, network, vertical…" />
          <div className="flex items-center gap-2">
            <FilterBuilder fields={OFFER_FIELDS} entity="offer" />
            {error && <span className="text-sm text-red-600">Error: {error.message}</span>}
          </div>
        </div>
        <SavedViewsBar
          defaultViews={DEFAULT_VIEWS.offer}
          userViews={savedViews}
        />
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <EmptyState
            icon={Briefcase}
            title="No offers match your filters"
            description="Try a broader query or clear the filter to see all 231 offers."
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {rows.map((o) => (
            <OfferCard key={o.id} offer={o} />
          ))}
        </div>
      )}

      <Pagination page={page} pageSize={PAGE_SIZE} total={count ?? 0} />
    </div>
  );
}
