"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { ExternalLink, TrendingUp } from "lucide-react";
import { DataTable } from "@/components/shared/DataTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { getDemandStatusStyle } from "@/lib/utils/status";
import { cn } from "@/lib/utils";
import type { DemandRow } from "@/lib/supabase/types";

function StatusPill({ status }: { status: DemandRow["status"] }) {
  const s = getDemandStatusStyle(status);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        s.bg,
        s.text,
        s.ring,
      )}
    >
      {s.label}
    </span>
  );
}

const columns: ColumnDef<DemandRow, unknown>[] = [
  {
    header: "Network",
    accessorKey: "network_name",
    cell: ({ row }) => (
      <span className="font-medium text-slate-900">
        {row.original.network_name ?? "—"}
      </span>
    ),
  },
  {
    header: "Offer Name",
    accessorKey: "offer_name",
    cell: ({ row }) => (
      <span className="text-slate-700">{row.original.offer_name}</span>
    ),
  },
  {
    header: "Vertical",
    accessorKey: "vertical",
    cell: ({ row }) =>
      row.original.vertical ?? <span className="text-slate-300">—</span>,
  },
  {
    header: "Payout",
    accessorKey: "payout",
    meta: { align: "right" },
    cell: ({ row }) =>
      row.original.payout ? (
        <span className="font-medium text-slate-900">{row.original.payout}</span>
      ) : (
        <span className="text-slate-300">—</span>
      ),
  },
  {
    header: "Status",
    accessorKey: "status",
    cell: ({ row }) => <StatusPill status={row.original.status} />,
  },
  {
    header: "Link",
    accessorKey: "link",
    cell: ({ row }) => {
      const url = row.original.link;
      if (!url) return <span className="text-slate-300">—</span>;
      return (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
        >
          Open <ExternalLink className="h-3 w-3" />
        </a>
      );
    },
  },
];

export function DemandTable({ rows }: { rows: DemandRow[] }) {
  return (
    <DataTable
      columns={columns}
      data={rows}
      rowKey={(r) => r.id}
      emptyState={
        <EmptyState
          icon={TrendingUp}
          title="No demand items match your search"
          description="Try a broader query or clear the search to see all 615 demand items."
        />
      }
    />
  );
}
