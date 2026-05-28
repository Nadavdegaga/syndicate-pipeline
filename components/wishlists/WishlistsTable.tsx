"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Handshake } from "lucide-react";
import { DataTable } from "@/components/shared/DataTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { getWishlistStatusStyle } from "@/lib/utils/status";
import { shortDateOrDash } from "@/lib/utils/dates";
import { cn } from "@/lib/utils";
import type { WishlistRow } from "@/lib/supabase/types";

function StatusPill({ status }: { status: WishlistRow["status"] }) {
  const s = getWishlistStatusStyle(status);
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

const columns: ColumnDef<WishlistRow, unknown>[] = [
  {
    header: "Publisher",
    accessorKey: "publisher_name",
    cell: ({ row }) => (
      <span className="font-medium text-slate-900">
        {row.original.publisher_name ?? "—"}
      </span>
    ),
  },
  {
    header: "Requested Offer",
    accessorKey: "requested_offer",
    cell: ({ row }) => (
      <span className="text-slate-700">{row.original.requested_offer}</span>
    ),
  },
  {
    header: "Vertical",
    accessorKey: "vertical",
    cell: ({ row }) =>
      row.original.vertical ?? <span className="text-slate-300">—</span>,
  },
  {
    header: "Status",
    accessorKey: "status",
    cell: ({ row }) => <StatusPill status={row.original.status} />,
  },
  {
    header: "Requested",
    accessorKey: "requested_at",
    cell: ({ row }) => (
      <span className="text-sm text-slate-600">
        {shortDateOrDash(row.original.requested_at)}
      </span>
    ),
  },
  {
    header: "Matched",
    accessorKey: "matched_offer_id",
    cell: ({ row }) =>
      row.original.matched_offer_id ? (
        <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
          Yes
        </span>
      ) : (
        <span className="text-slate-300">—</span>
      ),
  },
];

export function WishlistsTable({ rows }: { rows: WishlistRow[] }) {
  return (
    <DataTable
      columns={columns}
      data={rows}
      rowKey={(r) => r.id}
      emptyState={
        <EmptyState
          icon={Handshake}
          title="No wishlist items match your search"
          description="Try a broader query or clear the search to see all 343 publisher requests."
        />
      }
    />
  );
}
