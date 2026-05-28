"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Check, Clock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ActionCard } from "./ActionCard";
import { useBrand } from "@/hooks/useBrand";
import { markFollowedUp, snoozeContact } from "@/lib/actions/today";
import { activeStatusFields } from "@/lib/utils/brand";
import { relativeOrDash } from "@/lib/utils/dates";
import type { ContactWithAgeRow } from "@/lib/supabase/types";

export function HotFollowupsCard({
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
      title="Hot Follow-ups"
      emoji="🔥"
      count={rows.length === 0 ? 0 : total}
      description="Sent / Pending+Sent, no reply in 7+ days. Bump them now."
      viewAllHref="/contacts?q=sent"
      emptyMessage="Inbox clear"
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
  const statusFields = activeStatusFields(brand);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const status = statusFields.map((f) => (contact as any)[f]).find(Boolean) ?? "—";

  function followUp() {
    startTransition(async () => {
      const r = await markFollowedUp(contact.id, brand);
      if (r.ok) {
        toast.success(`Marked ${contact.name} as followed up`);
        onResolve();
      } else toast.error(r.error);
    });
  }

  function snooze() {
    startTransition(async () => {
      const r = await snoozeContact(contact.id, 7, brand);
      if (r.ok) {
        toast.success(`Snoozed ${contact.name} for 7 days`);
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
        <Button
          variant="ghost"
          size="sm"
          onClick={followUp}
          disabled={pending}
          aria-label="Mark followed up"
          title="Mark followed up"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={snooze}
          disabled={pending}
          aria-label="Snooze 7 days"
          title="Snooze 7d"
        >
          <Clock className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
