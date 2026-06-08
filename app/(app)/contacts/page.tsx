import { Users, Kanban, UserPlus } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ContactsTable } from "@/components/contacts/ContactsTable";
import { SearchBar } from "@/components/shared/SearchBar";
import { Pagination } from "@/components/shared/Pagination";
import { PageHeader } from "@/components/shared/PageHeader";
import { FilterBuilder } from "@/components/shared/FilterBuilder";
import { SavedViewsBar } from "@/components/shared/SavedViewsBar";
import { RealtimeBridge } from "@/components/shared/RealtimeBridge";
import { Button } from "@/components/ui/button";
import {
  applyFilterSpec,
  decodeFilter,
  CONTACT_FIELDS,
} from "@/lib/utils/filter";
import { listSavedViews } from "@/lib/actions/saved-views";
import { DEFAULT_VIEWS } from "@/lib/saved-views/defaults";
import type { ContactWithAgeRow } from "@/lib/supabase/types";
import { getServerBrand } from "@/lib/utils/server-brand";
import { statusFieldFor } from "@/lib/utils/brand";

const PAGE_SIZE = 50;

type SearchParams = { q?: string; page?: string; f?: string };

export default async function ContactsPage({
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
    .from("v_contacts_with_age")
    .select("*", { count: "exact" })
    .order("last_touch_at", { ascending: false, nullsFirst: false })
    .range(from, to);

  if (brand !== "all") {
    const field = statusFieldFor(brand)!;
    query = query.not(field, "is", null);
  }

  if (q) {
    const esc = q.replace(/[%,]/g, "");
    query = query.or(
      `name.ilike.%${esc}%,company.ilike.%${esc}%,role.ilike.%${esc}%,network_name_lookup.ilike.%${esc}%`,
    );
  }
  query = applyFilterSpec(query, filter);

  const [{ data, count, error }, savedViews] = await Promise.all([
    query,
    listSavedViews("contact"),
  ]);
  const rows = (data ?? []) as ContactWithAgeRow[];

  return (
    <div className="space-y-6">
      <RealtimeBridge
        channel="contacts-page"
        tables={["contacts", "activity_log"]}
      />
      <PageHeader
        title="Contacts"
        icon={Users}
        description="Affiliate managers, publishers, and network reps across all three brands."
        meta={
          error
            ? undefined
            : `${(count ?? 0).toLocaleString()} contacts · click a row to open the detail drawer`
        }
        actions={
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm" className="gap-2">
              <Link href="/contacts/kanban">
                <Kanban className="h-4 w-4" /> Kanban
              </Link>
            </Button>
            <Button
              asChild
              size="sm"
              className="gap-2"
              data-tour="add-contact-button"
            >
              <Link href="/contacts/new">
                <UserPlus className="h-4 w-4" /> Add Contact
              </Link>
            </Button>
          </div>
        }
      />

      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SearchBar placeholder="Search name, company, role, network…" />
          <div className="flex items-center gap-2">
            <FilterBuilder fields={CONTACT_FIELDS} entity="contact" />
            {error && (
              <span className="text-sm text-red-600">Error: {error.message}</span>
            )}
          </div>
        </div>
        <SavedViewsBar
          defaultViews={DEFAULT_VIEWS.contact}
          userViews={savedViews}
        />
      </div>

      <ContactsTable rows={rows} />

      <Pagination page={page} pageSize={PAGE_SIZE} total={count ?? 0} />
    </div>
  );
}
