"use client";

import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { ExternalLink, Radio } from "lucide-react";
import { DataTable } from "@/components/shared/DataTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { TierBadge } from "@/components/networks/TierBadge";
import { relativeOrDash } from "@/lib/utils/dates";
import type { NetworkWithActivityRow } from "@/lib/supabase/types";

const columns: ColumnDef<NetworkWithActivityRow, unknown>[] = [
  {
    header: "Name",
    accessorKey: "name",
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="font-medium text-slate-900">{row.original.name}</span>
        {row.original.source && (
          <span className="text-xs text-slate-400">{row.original.source}</span>
        )}
      </div>
    ),
  },
  {
    header: "Tier",
    accessorKey: "tier",
    cell: ({ row }) => <TierBadge tier={row.original.tier} />,
  },
  {
    header: "Registered",
    accessorKey: "registered",
    cell: ({ row }) => {
      const r = row.original.registered;
      if (r === true)
        return (
          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
            Yes
          </span>
        );
      if (r === false)
        return (
          <span className="inline-flex items-center rounded-full bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-200">
            No
          </span>
        );
      return <span className="text-slate-300">—</span>;
    },
  },
  {
    header: "Contacts",
    accessorKey: "contact_count",
    meta: { align: "right" },
    cell: ({ row }) => (
      <span className="font-medium text-slate-900">
        {row.original.contact_count.toLocaleString()}
      </span>
    ),
  },
  {
    header: "Offers",
    accessorKey: "offer_count",
    meta: { align: "right" },
    cell: ({ row }) => (
      <span className="font-medium text-slate-900">
        {row.original.offer_count.toLocaleString()}
      </span>
    ),
  },
  {
    id: "last_activity",
    header: "Last Activity",
    cell: ({ row }) => (
      <span className="text-sm text-slate-600">
        {relativeOrDash(row.original.last_contact_touch_at)}
      </span>
    ),
  },
  {
    id: "linkedin",
    header: "LinkedIn",
    cell: ({ row }) => {
      const url = row.original.linkedin_url;
      if (!url) return <span className="text-slate-300">—</span>;
      return (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
        >
          Open <ExternalLink className="h-3 w-3" />
        </a>
      );
    },
  },
];

export function NetworksTable({ rows }: { rows: NetworkWithActivityRow[] }) {
  const router = useRouter();
  return (
    <DataTable
      columns={columns}
      data={rows}
      rowKey={(r) => r.id}
      onRowClick={(r) => router.push(`/networks/${r.id}`)}
      emptyState={
        <EmptyState
          icon={Radio}
          title="No networks match your search"
          description="Try a broader query or clear the search to see all 91 networks."
        />
      }
    />
  );
}
