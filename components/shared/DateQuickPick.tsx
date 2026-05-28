"use client";

import { useState, useTransition } from "react";
import { Loader2, Check, X } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type DateQuickPickProps = {
  value: string | null;
  onSave: (
    isoOrNull: string | null,
  ) => Promise<{ ok: boolean; error?: string }>;
  quickOptions?: { label: string; days: number }[];
};

function toInputValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function fromInputValue(s: string): string | null {
  if (!s) return null;
  const d = new Date(s + "T00:00:00");
  return d.toISOString();
}

export function DateQuickPick({
  value,
  onSave,
  quickOptions = [
    { label: "Today", days: 0 },
    { label: "+7d", days: 7 },
    { label: "+14d", days: 14 },
    { label: "+30d", days: 30 },
  ],
}: DateQuickPickProps) {
  const [local, setLocal] = useState(toInputValue(value));
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  function save(next: string | null) {
    startTransition(async () => {
      const res = await onSave(next);
      if (!res.ok) {
        toast.error(res.error ?? "Save failed");
        return;
      }
      setSavedAt(Date.now());
      setTimeout(() => setSavedAt(null), 1500);
    });
  }

  function setRelative(days: number) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + days);
    const iso = d.toISOString();
    setLocal(toInputValue(iso));
    save(iso);
  }

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    setLocal(v);
    save(fromInputValue(v));
  }

  function clear() {
    setLocal("");
    save(null);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Input
          type="date"
          value={local}
          onChange={onChange}
          className="bg-white"
          disabled={isPending}
        />
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clear}
            className="text-slate-500"
            aria-label="Clear"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {quickOptions.map((opt) => (
          <button
            key={opt.label}
            type="button"
            onClick={() => setRelative(opt.days)}
            disabled={isPending}
            className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-xs text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50"
          >
            {opt.label}
          </button>
        ))}
      </div>
      <div className="h-4">
        {isPending && (
          <span className="inline-flex items-center gap-1 text-xs text-slate-500">
            <Loader2 className="h-3 w-3 animate-spin" /> Saving…
          </span>
        )}
        {savedAt && !isPending && (
          <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
            <Check className="h-3 w-3" /> Saved
          </span>
        )}
      </div>
    </div>
  );
}
