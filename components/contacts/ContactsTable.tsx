"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Users } from "lucide-react";
import { DataTable } from "@/components/shared/DataTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ChannelIcon } from "@/components/shared/ChannelIcon";
import { ContactDrawer } from "./ContactDrawer";
import { useBrand } from "@/hooks/useBrand";
import { relativeOrDash } from "@/lib/utils/dates";
import type { ContactWithAgeRow } from "@/lib/supabase/types";

export function ContactsTable({ rows }: { rows: ContactWithAgeRow[] }) {
  const { brand } = useBrand();
  const [selected, setSelected] = useState<ContactWithAgeRow | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Keep the drawer in sync with the latest fetched row data
  const selectedFresh = useMemo(() => {
    if (!selected) return null;
    return rows.find((r) => r.id === selected.id) ?? selected;
  }, [selected, rows]);

  const columns = useMemo<ColumnDef<ContactWithAgeRow, unknown>[]>(() => {
    const base: ColumnDef<ContactWithAgeRow, unknown>[] = [
      {
        header: "Name",
        accessorKey: "name",
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-medium text-slate-900">{row.original.name}</span>
            {row.original.role && (
              <span className="text-xs text-slate-500">{row.original.role}</span>
            )}
          </div>
        ),
      },
      {
        header: "Company",
        accessorKey: "company",
        cell: ({ row }) => {
          const display = row.original.company ?? row.original.network_name_lookup;
          if (!display) return <span className="text-slate-300">—</span>;
          return <span className="text-sm text-slate-700">{display}</span>;
        },
      },
      {
        header: "Channel",
        accessorKey: "channel",
        cell: ({ row }) => <ChannelIcon channel={row.original.channel} />,
      },
    ];

    if (brand === "all") {
      base.push(
        {
          id: "status_nomi",
          header: "Nomi",
          cell: ({ row }) => <StatusBadge value={row.original.status_nomi} />,
        },
        {
          id: "status_startech",
          header: "StarTech",
          cell: ({ row }) => <StatusBadge value={row.original.status_startech} />,
        },
        {
          id: "status_luminarix",
          header: "Luminarix",
          cell: ({ row }) => <StatusBadge value={row.original.status_luminarix} />,
        },
      );
    } else {
      const key =
        brand === "nomi"
          ? "status_nomi"
          : brand === "startech"
            ? "status_startech"
            : "status_luminarix";
      base.push({
        id: key,
        header: "Status",
        cell: ({ row }) => (
          <StatusBadge value={row.original[key] as string | null} />
        ),
      });
    }

    base.push(
      {
        id: "last_touch_at",
        header: "Last Touch",
        cell: ({ row }) => (
          <span className="text-sm text-slate-600">
            {relativeOrDash(row.original.last_touch_at)}
          </span>
        ),
      },
      {
        id: "next_action_at",
        header: "Next Action",
        cell: ({ row }) => (
          <span className="text-sm text-slate-600">
            {relativeOrDash(row.original.next_action_at)}
          </span>
        ),
      },
    );

    return base;
  }, [brand]);

  return (
    <>
      <DataTable
        columns={columns}
        data={rows}
        rowKey={(r) => r.id}
        onRowClick={(r) => {
          setSelected(r);
          setDrawerOpen(true);
        }}
        emptyState={
          <EmptyState
            icon={Users}
            title="No contacts match your search"
            description="Try a broader query or clear the search to see all 1,044 contacts."
          />
        }
      />

      <ContactDrawer
        contact={selectedFresh}
        open={drawerOpen}
        onOpenChange={(o) => {
          setDrawerOpen(o);
          if (!o) setTimeout(() => setSelected(null), 250);
        }}
      />
    </>
  );
}
