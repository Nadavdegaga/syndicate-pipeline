"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type EditableTextProps = {
  value: string | null;
  onSave: (newValue: string | null) => Promise<{ ok: boolean; error?: string }>;
  placeholder?: string;
  multiline?: boolean;
  className?: string;
  type?: "text" | "email" | "url" | "date";
  suggestions?: string[];
  inputClassName?: string;
};

export function EditableText({
  value,
  onSave,
  placeholder = "Click to edit",
  multiline = false,
  className,
  type = "text",
  suggestions,
  inputClassName,
}: EditableTextProps) {
  const [local, setLocal] = useState(value ?? "");
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();
  const initialRef = useRef(value ?? "");
  const datalistId = useRef(
    `dl-${Math.random().toString(36).slice(2, 8)}`,
  ).current;

  useEffect(() => {
    setLocal(value ?? "");
    initialRef.current = value ?? "";
  }, [value]);

  function commit() {
    const next = local.trim();
    const prev = initialRef.current;
    if (next === prev) return;

    startTransition(async () => {
      const res = await onSave(next === "" ? null : next);
      if (!res.ok) {
        toast.error(res.error ?? "Save failed");
        setLocal(prev);
        return;
      }
      initialRef.current = next;
      setSavedAt(Date.now());
      setTimeout(() => setSavedAt(null), 1500);
    });
  }

  const indicator = isPending ? (
    <span className="inline-flex items-center gap-1 text-xs text-slate-500">
      <Loader2 className="h-3 w-3 animate-spin" /> Saving…
    </span>
  ) : savedAt ? (
    <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
      <Check className="h-3 w-3" /> Saved
    </span>
  ) : null;

  return (
    <div className={cn("space-y-1", className)}>
      {multiline ? (
        <Textarea
          value={local}
          onChange={(e) => setLocal(e.target.value)}
          onBlur={commit}
          placeholder={placeholder}
          rows={4}
          className={cn(
            "resize-y bg-white transition-shadow focus-visible:ring-2 focus-visible:ring-slate-300",
            inputClassName,
          )}
          disabled={isPending}
        />
      ) : (
        <>
          <Input
            type={type}
            value={local}
            onChange={(e) => setLocal(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
              if (e.key === "Escape") {
                setLocal(initialRef.current);
                e.currentTarget.blur();
              }
            }}
            placeholder={placeholder}
            list={suggestions ? datalistId : undefined}
            className={cn(
              "bg-white transition-shadow focus-visible:ring-2 focus-visible:ring-slate-300",
              inputClassName,
            )}
            disabled={isPending}
          />
          {suggestions && (
            <datalist id={datalistId}>
              {suggestions.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          )}
        </>
      )}
      <div className="h-4">{indicator}</div>
    </div>
  );
}
