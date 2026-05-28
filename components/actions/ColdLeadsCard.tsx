"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Snowflake, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ActionCard } from "./ActionCard";
import { useBrand } from "@/hooks/useBrand";
import { markFollowedUp } from "@/lib/actions/today";
import { activeStatusFields } from "@/lib/utils/brand";
import { relativeOrDash } from "@/lib/utils/dates";
import type { ContactWithAgeRow } from "@/lib/supabase/types";

export function ColdLeadsCard({
  rows: initialRows,
  total,
}: {
  rows: ContactWithAgeRow[];
  total: number;
}) {
  const { brand } = useBrand();
  const [rows, setRows] = useState(initialRows);

  return (
    <ActionCard
      title="Cold Leads to Re-engage"
      emoji="❄️"
      count={rows.length === 0 ? 0 : total}
      description="Talking / LD / TG · stalled 21+ days. Drop a reminder."
      viewAllHref="/contacts?q=LD"
      emptyMessage="No stalled leads"
    >
      {rows.map((c) => (
        <Row
          key={c.id}
          contact={c}
          brand={brand}
          onResolve={() => setRows((r) => r.filter((x) => x.id !== c.id))}
        />
      ))}
    </ActionCard>
  );
}

function Row({
  contact,
  brand,
  onResolve,
}: {
  contact: ContactWithAgeRow;
  brand: "all" | "nomi" | "startech" | "luminarix";
  onResolve: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const fields = activeStatusFields(brand);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const status = fields.map((f) => (contact as any)[f]).find(Boolean) ?? "—";

  function markContacted() {
    startTransition(async () => {
      const r = await markFollowedUp(contact.id, brand);
      if (r.ok) {
        toast.success(`Contacted ${contact.name}`);
        onResolve();
      } else toast.error(r.error);
    });
  }

  return (
    <div className="flex items-center justify-between gap-3 px-3 py-3">
      <div className="min-w-0 flex-1">
        <Link
          href={`/contacts?id=${contact.id}`}
          className="block truncate text-sm font-medium text-slate-900 hover:underline"
        >
          {contact.name}
        </Link>
        <div className="truncate text-xs text-slate-500">
          {status} · last touch {relativeOrDash(contact.last_touch_at)}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {contact.telegram && (
          <a
            href={`https://t.me/${contact.telegram.replace(/^@/, "")}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-cyan-50 hover:text-cyan-700"
            title="Open Telegram"
          >
            <Snowflake className="h-4 w-4" />
          </a>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={markContacted}
          disabled={pending}
          title="Mark contacted"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
