"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Plus,
  Loader2,
  CheckCircle2,
  ExternalLink,
  Globe,
  ArrowUpRight,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { DataTable } from "@/components/shared/DataTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { Separator } from "@/components/ui/separator";
import { addExternalOfferToMyOffers } from "@/lib/actions/connections";
import { relativeOrDash } from "@/lib/utils/dates";
import { platformLabel, type PlatformKind } from "@/lib/platforms/registry";

export type ExternalOfferRow = {
  id: string;
  platform: PlatformKind;
  platform_label: string;
  connection_name: string;
  platform_offer_id: string;
  name: string;
  advertiser: string | null;
  vertical: string | null;
  payout: string | null;
  countries: string[];
  status: string | null;
  preview_url: string | null;
  last_seen_at: string;
  is_active: boolean;
  added_to_my_offers: boolean;
  linked_offer_id: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  raw_data: any;
};

export function ExternalOffersTable({
  rows: initialRows,
  platforms,
  verticals,
}: {
  rows: ExternalOfferRow[];
  platforms: PlatformKind[];
  verticals: string[];
}) {
  const [rows, setRows] = useState(initialRows);
  const [search, setSearch] = useState("");
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [verticalFilter, setVerticalFilter] = useState<string>("all");
  const [addedFilter, setAddedFilter] = useState<"all" | "added" | "not_added">("all");
  const [selected, setSelected] = useState<ExternalOfferRow | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (platformFilter !== "all" && r.platform !== platformFilter) return false;
      if (verticalFilter !== "all" && r.vertical !== verticalFilter) return false;
      if (addedFilter === "added" && !r.added_to_my_offers) return false;
      if (addedFilter === "not_added" && r.added_to_my_offers) return false;
      if (q) {
        const hay = `${r.name} ${r.advertiser ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, search, platformFilter, verticalFilter, addedFilter]);

  const columns: ColumnDef<ExternalOfferRow, unknown>[] = useMemo(
    () => [
      {
        header: "Platform",
        accessorKey: "platform_label",
        cell: ({ row }) => (
          <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] uppercase tracking-wider text-slate-600">
            {row.original.platform_label}
          </span>
        ),
      },
      {
        header: "Name",
        accessorKey: "name",
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-medium text-slate-900">{row.original.name}</span>
            {row.original.advertiser && (
              <span className="text-xs text-slate-500">
                {row.original.advertiser}
              </span>
            )}
          </div>
        ),
      },
      {
        header: "Vertical",
        accessorKey: "vertical",
        cell: ({ row }) =>
          row.original.vertical ? (
            <span className="text-sm text-slate-700">{row.original.vertical}</span>
          ) : (
            <span className="text-slate-300">—</span>
          ),
      },
      {
        header: "Payout",
        accessorKey: "payout",
        cell: ({ row }) =>
          row.original.payout ? (
            <span className="font-medium text-slate-900">{row.original.payout}</span>
          ) : (
            <span className="text-slate-300">—</span>
          ),
      },
      {
        header: "Countries",
        accessorKey: "countries",
        cell: ({ row }) => (
          <span className="text-xs text-slate-600">
            {row.original.countries.length > 0
              ? row.original.countries.slice(0, 3).join(", ") +
                (row.original.countries.length > 3
                  ? ` +${row.original.countries.length - 3}`
                  : "")
              : "—"}
          </span>
        ),
      },
      {
        header: "Last seen",
        accessorKey: "last_seen_at",
        cell: ({ row }) => (
          <span className="text-xs text-slate-500">
            {relativeOrDash(row.original.last_seen_at)}
          </span>
        ),
      },
      {
        header: "Status",
        accessorKey: "status",
        cell: ({ row }) => {
          if (!row.original.is_active)
            return (
              <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-500 ring-1 ring-inset ring-slate-200">
                stale
              </span>
            );
          return (
            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-emerald-700 ring-1 ring-inset ring-emerald-200">
              {row.original.status ?? "active"}
            </span>
          );
        },
      },
      {
        header: "",
        id: "add_action",
        cell: ({ row }) => <AddAction row={row.original} onAdded={(linked) => {
          setRows((rs) =>
            rs.map((x) =>
              x.id === row.original.id
                ? { ...x, added_to_my_offers: true, linked_offer_id: linked }
                : x,
            ),
          );
        }} />,
      },
    ],
    [],
  );

  return (
    <>
      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative w-72">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, advertiser…"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Select value={platformFilter} onValueChange={setPlatformFilter}>
              <SelectTrigger className="h-8 w-32">
                <SelectValue placeholder="Platform" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All platforms</SelectItem>
                {platforms.map((p) => (
                  <SelectItem key={p} value={p}>
                    {platformLabel(p)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={verticalFilter} onValueChange={setVerticalFilter}>
              <SelectTrigger className="h-8 w-40">
                <SelectValue placeholder="Vertical" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All verticals</SelectItem>
                {verticals.map((v) => (
                  <SelectItem key={v} value={v}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={addedFilter}
              onValueChange={(v) =>
                setAddedFilter(v as "all" | "added" | "not_added")
              }
            >
              <SelectTrigger className="h-8 w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="added">Added to my offers</SelectItem>
                <SelectItem value="not_added">Not yet added</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="text-xs text-slate-500">
            {filtered.length} of {rows.length}
          </div>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        rowKey={(r) => r.id}
        onRowClick={(r) => setSelected(r)}
        emptyState={
          <EmptyState
            icon={Globe}
            title="No external offers"
            description="Connect a platform and sync, or change your filters."
          />
        }
      />

      {/* Detail drawer */}
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-2xl">
          {selected && (
            <>
              <SheetHeader className="border-b border-slate-200 bg-gradient-to-br from-white to-slate-50 px-6 py-5">
                <div className="space-y-2">
                  <SheetTitle className="text-xl">{selected.name}</SheetTitle>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 uppercase tracking-wider">
                      {selected.platform_label}
                    </span>
                    {selected.advertiser && <span>{selected.advertiser}</span>}
                    {selected.vertical && <span>· {selected.vertical}</span>}
                    {selected.payout && (
                      <span className="font-semibold text-slate-900">
                        · {selected.payout}
                      </span>
                    )}
                  </div>
                </div>
              </SheetHeader>
              <div className="space-y-5 p-6">
                <section className="grid grid-cols-2 gap-4 text-sm">
                  <Stat label="Connection" value={selected.connection_name} />
                  <Stat label="Platform offer ID" value={selected.platform_offer_id} mono />
                  <Stat label="Status" value={selected.status ?? "—"} />
                  <Stat
                    label="Last seen"
                    value={relativeOrDash(selected.last_seen_at)}
                  />
                  <Stat
                    label="Countries"
                    value={selected.countries.join(", ") || "—"}
                  />
                  <Stat
                    label="Added to my offers"
                    value={selected.added_to_my_offers ? "yes" : "no"}
                  />
                </section>

                <div className="flex flex-wrap gap-2">
                  {selected.preview_url && (
                    <Button asChild variant="outline" size="sm">
                      <a
                        href={selected.preview_url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                        Preview
                      </a>
                    </Button>
                  )}
                  {selected.linked_offer_id && (
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/offers/${selected.linked_offer_id}`}>
                        Open my offer
                        <ArrowUpRight className="ml-1.5 h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  )}
                  {!selected.added_to_my_offers && (
                    <AddAction row={selected} onAdded={(linked) => {
                      setRows((rs) =>
                        rs.map((x) =>
                          x.id === selected.id
                            ? { ...x, added_to_my_offers: true, linked_offer_id: linked }
                            : x,
                        ),
                      );
                      setSelected({ ...selected, added_to_my_offers: true, linked_offer_id: linked });
                    }} large />
                  )}
                </div>

                <Separator />

                <section>
                  <h3 className="mb-2 text-xs uppercase tracking-wider text-slate-500">
                    Raw payload from platform
                  </h3>
                  <pre className="max-h-96 overflow-auto rounded-lg bg-slate-50 p-3 text-[11px] text-slate-700">
                    {JSON.stringify(selected.raw_data, null, 2)}
                  </pre>
                </section>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

function Stat({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-slate-500">
        {label}
      </div>
      <div className={mono ? "font-mono text-xs text-slate-700" : "text-slate-800"}>
        {value}
      </div>
    </div>
  );
}

function AddAction({
  row,
  onAdded,
  large,
}: {
  row: ExternalOfferRow;
  onAdded: (linkedId: string) => void;
  large?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  function add() {
    startTransition(async () => {
      const r = await addExternalOfferToMyOffers(row.id);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      onAdded(r.offer_id);
      toast.success("Added to your offers");
    });
  }
  if (row.added_to_my_offers) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
        <CheckCircle2 className="h-3 w-3" /> Added
      </span>
    );
  }
  return (
    <Button
      size={large ? "default" : "sm"}
      variant={large ? "default" : "outline"}
      onClick={(e) => {
        e.stopPropagation();
        add();
      }}
      disabled={pending}
      className="gap-1.5"
      data-tour="add-to-my-offers"
    >
      {pending ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <Plus className="h-3 w-3" />
      )}
      Add to my offers
    </Button>
  );
}
