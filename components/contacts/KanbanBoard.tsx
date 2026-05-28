"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Loader2, GripVertical } from "lucide-react";
import { toast } from "sonner";
import { useBrand } from "@/hooks/useBrand";
import { classifyContactStatus } from "@/lib/utils/status";
import { statusFieldFor } from "@/lib/utils/brand";
import { updateContactField } from "@/lib/actions/contacts";
import { relativeOrDash } from "@/lib/utils/dates";
import { cn } from "@/lib/utils";
import type { ContactWithAgeRow } from "@/lib/supabase/types";
import type { StatusCategory } from "@/lib/utils/status";

type ColumnKey = "cold" | "pending" | "in_convo" | "approved" | "working";

const COLUMNS: { key: ColumnKey; label: string; emoji: string; defaultStatus: string; matches: StatusCategory[]; bg: string }[] = [
  {
    key: "cold",
    label: "Cold",
    emoji: "🧊",
    defaultStatus: "Cold - dormant",
    matches: ["cold", "unknown"],
    bg: "bg-slate-50",
  },
  {
    key: "pending",
    label: "Pending",
    emoji: "⏳",
    defaultStatus: "Pending",
    matches: ["pending", "sent"],
    bg: "bg-amber-50",
  },
  {
    key: "in_convo",
    label: "In Convo",
    emoji: "💬",
    defaultStatus: "LD",
    matches: ["talking"],
    bg: "bg-emerald-50",
  },
  {
    key: "approved",
    label: "Approved",
    emoji: "✅",
    defaultStatus: "Approved",
    matches: ["approved", "followed_up"],
    bg: "bg-green-50",
  },
  {
    key: "working",
    label: "Working",
    emoji: "🚀",
    defaultStatus: "Working",
    matches: ["second_option", "internal", "needs_proof"],
    bg: "bg-violet-50",
  },
];

export function KanbanBoard({ rows: initialRows }: { rows: ContactWithAgeRow[] }) {
  const { brand } = useBrand();
  const [rows, setRows] = useState(initialRows);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overColumn, setOverColumn] = useState<ColumnKey | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const statusField = statusFieldFor(brand);
  // When brand=all, we use status_nomi for grouping by default (most populated).
  const effectiveField = statusField ?? "status_nomi";

  // Group rows into columns
  const grouped = useMemo(() => {
    const buckets: Record<ColumnKey, ContactWithAgeRow[]> = {
      cold: [],
      pending: [],
      in_convo: [],
      approved: [],
      working: [],
    };
    for (const c of rows) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const value = (c as any)[effectiveField] as string | null;
      const category = classifyContactStatus(value);
      const col = COLUMNS.find((c) => c.matches.includes(category)) ?? COLUMNS[0];
      buckets[col.key].push(c);
    }
    return buckets;
  }, [rows, effectiveField]);

  function moveCard(contactId: string, targetColumn: ColumnKey) {
    const target = COLUMNS.find((c) => c.key === targetColumn)!;
    const next = target.defaultStatus;
    setPendingId(contactId);
    startTransition(async () => {
      // Optimistic update locally
      setRows((all) =>
        all.map((c) =>
          c.id === contactId ? { ...c, [effectiveField]: next } : c,
        ),
      );
      const r = await updateContactField(
        contactId,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        effectiveField as any,
        next,
        brand,
      );
      setPendingId(null);
      if (!r.ok) {
        toast.error(r.error ?? "Failed to update status");
        // Revert
        setRows(initialRows);
        return;
      }
      toast.success(`Moved to ${target.label}`);
    });
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
      {COLUMNS.map((col) => (
        <div
          key={col.key}
          className={cn(
            "flex flex-col rounded-2xl border border-slate-200 shadow-sm",
            col.bg,
            overColumn === col.key &&
              "ring-2 ring-slate-900/30 ring-offset-2 ring-offset-slate-50",
          )}
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
            if (overColumn !== col.key) setOverColumn(col.key);
          }}
          onDragLeave={(e) => {
            // Only clear if leaving the column entirely
            if (e.currentTarget.contains(e.relatedTarget as Node)) return;
            if (overColumn === col.key) setOverColumn(null);
          }}
          onDrop={(e) => {
            e.preventDefault();
            setOverColumn(null);
            const id = e.dataTransfer.getData("text/contact-id");
            if (!id) return;
            moveCard(id, col.key);
          }}
        >
          <div className="border-b border-slate-200/60 px-3 py-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <span>{col.emoji}</span>
                <span>{col.label}</span>
              </div>
              <span className="inline-flex items-center justify-center rounded-full bg-white/70 px-2 py-0.5 text-xs font-medium tabular-nums text-slate-700 ring-1 ring-slate-200">
                {grouped[col.key].length}
              </span>
            </div>
          </div>

          <div className="flex-1 space-y-2 p-2 min-h-[300px]">
            {grouped[col.key].length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300/60 px-3 py-8 text-center text-xs text-slate-400">
                Drop a card here
              </div>
            ) : (
              grouped[col.key].map((c) => (
                <Card
                  key={c.id}
                  contact={c}
                  field={effectiveField}
                  isDragging={draggingId === c.id}
                  isPending={pendingId === c.id}
                  onDragStart={(e) => {
                    setDraggingId(c.id);
                    e.dataTransfer.setData("text/contact-id", c.id);
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  onDragEnd={() => setDraggingId(null)}
                />
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function Card({
  contact,
  field,
  isDragging,
  isPending,
  onDragStart,
  onDragEnd,
}: {
  contact: ContactWithAgeRow;
  field: string;
  isDragging: boolean;
  isPending: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const status = (contact as any)[field] as string | null;
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={cn(
        "group flex cursor-grab items-start gap-2 rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition-all active:cursor-grabbing",
        isDragging && "opacity-40",
        isPending && "ring-2 ring-slate-300",
      )}
    >
      <GripVertical className="mt-0.5 h-4 w-4 shrink-0 text-slate-300 group-hover:text-slate-500" />
      <div className="min-w-0 flex-1">
        <Link
          href={`/contacts?id=${contact.id}`}
          className="block truncate text-sm font-medium text-slate-900 hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {contact.name}
        </Link>
        {contact.company && (
          <div className="truncate text-xs text-slate-500">{contact.company}</div>
        )}
        <div className="mt-1 flex items-center gap-2 text-[10px] text-slate-400">
          <span className="truncate">{status ?? "—"}</span>
          <span>·</span>
          <span>{relativeOrDash(contact.last_touch_at)}</span>
        </div>
      </div>
      {isPending && (
        <Loader2 className="mt-1 h-3 w-3 shrink-0 animate-spin text-slate-400" />
      )}
    </div>
  );
}
