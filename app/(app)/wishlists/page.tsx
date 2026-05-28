import { Handshake } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { WishlistsTable } from "@/components/wishlists/WishlistsTable";
import { SearchBar } from "@/components/shared/SearchBar";
import { Pagination } from "@/components/shared/Pagination";
import { PageHeader } from "@/components/shared/PageHeader";
import { FilterBuilder } from "@/components/shared/FilterBuilder";
import { SavedViewsBar } from "@/components/shared/SavedViewsBar";
import {
  applyFilterSpec,
  decodeFilter,
  WISHLIST_FIELDS,
} from "@/lib/utils/filter";
import { listSavedViews } from "@/lib/actions/saved-views";
import { DEFAULT_VIEWS } from "@/lib/saved-views/defaults";
import type { WishlistRow } from "@/lib/supabase/types";

const PAGE_SIZE = 50;

type SearchParams = { q?: string; page?: string; f?: string };

export default async function WishlistsPage({
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
    .from("publisher_wishlists")
    .select("*", { count: "exact" })
    .order("requested_at", { ascending: false, nullsFirst: false })
    .range(from, to);

  if (q) {
    const esc = q.replace(/[%,]/g, "");
    query = query.or(
      `publisher_name.ilike.%${esc}%,requested_offer.ilike.%${esc}%,vertical.ilike.%${esc}%`,
    );
  }
  query = applyFilterSpec(query, filter);

  const [{ data, count, error }, savedViews] = await Promise.all([
    query,
    listSavedViews("wishlist"),
  ]);
  const rows = (data ?? []) as WishlistRow[];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Publisher Wishlists"
        icon={Handshake}
        description="Things publishers asked us to find for them. Match them in MatchMaker."
        meta={
          error
            ? undefined
            : `${(count ?? 0).toLocaleString()} wishlist items`
        }
      />

      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SearchBar placeholder="Search publisher, offer, vertical…" />
          <div className="flex items-center gap-2">
            <FilterBuilder fields={WISHLIST_FIELDS} entity="wishlist" />
            {error && (
              <span className="text-sm text-red-600">Error: {error.message}</span>
            )}
          </div>
        </div>
        <SavedViewsBar
          defaultViews={DEFAULT_VIEWS.wishlist}
          userViews={savedViews}
        />
      </div>

      <WishlistsTable rows={rows} />

      <Pagination page={page} pageSize={PAGE_SIZE} total={count ?? 0} />
    </div>
  );
}
