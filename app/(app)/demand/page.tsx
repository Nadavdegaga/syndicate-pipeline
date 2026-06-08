import Link from "next/link";
import { TrendingUp, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { DemandTable } from "@/components/demand/DemandTable";
import { Button } from "@/components/ui/button";
import { SearchBar } from "@/components/shared/SearchBar";
import { Pagination } from "@/components/shared/Pagination";
import { PageHeader } from "@/components/shared/PageHeader";
import { FilterBuilder } from "@/components/shared/FilterBuilder";
import { SavedViewsBar } from "@/components/shared/SavedViewsBar";
import {
  applyFilterSpec,
  decodeFilter,
  DEMAND_FIELDS,
} from "@/lib/utils/filter";
import { listSavedViews } from "@/lib/actions/saved-views";
import { DEFAULT_VIEWS } from "@/lib/saved-views/defaults";
import type { DemandRow } from "@/lib/supabase/types";
import { getServerBrand } from "@/lib/utils/server-brand";

const PAGE_SIZE = 50;

type SearchParams = { q?: string; page?: string; f?: string };

export default async function DemandPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const q = (searchParams.q ?? "").trim();
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  const filter = decodeFilter(searchParams.f);

  const brand = getServerBrand();
  const supabase = createClient();
  let query = supabase
    .from("network_demand")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (brand !== "all") {
    query = query.or(`brand_context.eq.${brand},brand_context.is.null`);
  }

  if (q) {
    const esc = q.replace(/[%,]/g, "");
    query = query.or(
      `network_name.ilike.%${esc}%,offer_name.ilike.%${esc}%,vertical.ilike.%${esc}%`,
    );
  }
  query = applyFilterSpec(query, filter);

  const [{ data, count, error }, savedViews] = await Promise.all([
    query,
    listSavedViews("demand"),
  ]);
  const rows = (data ?? []) as DemandRow[];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Network Demand"
        icon={TrendingUp}
        description="Offers networks have explicitly told us they need traffic for."
        meta={
          error
            ? undefined
            : `${(count ?? 0).toLocaleString()} demand items`
        }
        actions={
          <Button asChild size="sm" className="gap-2" data-tour="add-demand-button">
            <Link href="/demand/new">
              <Plus className="h-4 w-4" /> Add Demand
            </Link>
          </Button>
        }
      />

      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SearchBar placeholder="Search network, offer, vertical…" />
          <div className="flex items-center gap-2">
            <FilterBuilder fields={DEMAND_FIELDS} entity="demand" />
            {error && (
              <span className="text-sm text-red-600">Error: {error.message}</span>
            )}
          </div>
        </div>
        <SavedViewsBar
          defaultViews={DEFAULT_VIEWS.demand}
          userViews={savedViews}
        />
      </div>

      <DemandTable rows={rows} />

      <Pagination page={page} pageSize={PAGE_SIZE} total={count ?? 0} />
    </div>
  );
}
