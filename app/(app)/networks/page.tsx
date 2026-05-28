import { Radio } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { NetworksTable } from "@/components/networks/NetworksTable";
import { SearchBar } from "@/components/shared/SearchBar";
import { Pagination } from "@/components/shared/Pagination";
import { PageHeader } from "@/components/shared/PageHeader";
import { FilterBuilder } from "@/components/shared/FilterBuilder";
import { SavedViewsBar } from "@/components/shared/SavedViewsBar";
import {
  applyFilterSpec,
  decodeFilter,
  NETWORK_FIELDS,
} from "@/lib/utils/filter";
import { listSavedViews } from "@/lib/actions/saved-views";
import { DEFAULT_VIEWS } from "@/lib/saved-views/defaults";
import type { NetworkWithActivityRow } from "@/lib/supabase/types";

const PAGE_SIZE = 50;

type SearchParams = { q?: string; page?: string; f?: string };

export default async function NetworksPage({
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
    .from("v_networks_with_activity")
    .select("*", { count: "exact" })
    .order("contact_count", { ascending: false })
    .range(from, to);

  if (q) {
    const esc = q.replace(/[%,]/g, "");
    query = query.ilike("name", `%${esc}%`);
  }
  query = applyFilterSpec(query, filter);

  const [{ data, count, error }, savedViews] = await Promise.all([
    query,
    listSavedViews("network"),
  ]);
  const rows = (data ?? []) as NetworkWithActivityRow[];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Networks"
        icon={Radio}
        description="Affiliate and ad networks we work with, tiered by strategic value."
        meta={
          error
            ? undefined
            : `${(count ?? 0).toLocaleString()} networks · click a row for the full detail page`
        }
      />

      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SearchBar placeholder="Search networks…" />
          <div className="flex items-center gap-2">
            <FilterBuilder fields={NETWORK_FIELDS} entity="network" />
            {error && (
              <span className="text-sm text-red-600">Error: {error.message}</span>
            )}
          </div>
        </div>
        <SavedViewsBar
          defaultViews={DEFAULT_VIEWS.network}
          userViews={savedViews}
        />
      </div>

      <NetworksTable rows={rows} />

      <Pagination page={page} pageSize={PAGE_SIZE} total={count ?? 0} />
    </div>
  );
}
