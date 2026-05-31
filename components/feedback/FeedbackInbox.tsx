"use client";

import { useMemo, useState, useTransition } from "react";
import {
  Bug,
  HelpCircle,
  Lightbulb,
  Sparkles,
  MessageSquare,
  Loader2,
  ChevronRight,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { EmptyState } from "@/components/shared/EmptyState";
import { EditableText } from "@/components/shared/EditableText";
import { relativeOrDash } from "@/lib/utils/dates";
import { cn } from "@/lib/utils";
import {
  updateFeedbackStatus,
  updateFeedbackNotes,
  type FeedbackCategory,
  type FeedbackRow,
  type FeedbackStatus,
} from "@/lib/actions/feedback";

const CATEGORY_META: Record<
  FeedbackCategory,
  { label: string; icon: React.ComponentType<{ className?: string }>; bg: string; text: string }
> = {
  bug: { label: "Bug", icon: Bug, bg: "bg-red-100", text: "text-red-700" },
  confusion: {
    label: "Confusing",
    icon: HelpCircle,
    bg: "bg-amber-100",
    text: "text-amber-800",
  },
  missing_feature: {
    label: "Missing",
    icon: Sparkles,
    bg: "bg-violet-100",
    text: "text-violet-700",
  },
  suggestion: {
    label: "Suggestion",
    icon: Lightbulb,
    bg: "bg-emerald-100",
    text: "text-emerald-700",
  },
  other: {
    label: "Other",
    icon: MessageSquare,
    bg: "bg-slate-100",
    text: "text-slate-700",
  },
};

const STATUS_META: Record<
  FeedbackStatus,
  { label: string; bg: string; text: string; ring: string }
> = {
  open: { label: "Open", bg: "bg-amber-100", text: "text-amber-800", ring: "ring-amber-200" },
  reviewing: { label: "Reviewing", bg: "bg-sky-100", text: "text-sky-700", ring: "ring-sky-200" },
  planned: { label: "Planned", bg: "bg-violet-100", text: "text-violet-700", ring: "ring-violet-200" },
  done: { label: "Done", bg: "bg-emerald-100", text: "text-emerald-700", ring: "ring-emerald-200" },
  wontfix: { label: "Won't fix", bg: "bg-slate-200", text: "text-slate-600", ring: "ring-slate-300" },
};

const STATUS_OPTIONS: FeedbackStatus[] = ["open", "reviewing", "planned", "done", "wontfix"];
const CATEGORY_OPTIONS: FeedbackCategory[] = ["bug", "confusion", "missing_feature", "suggestion", "other"];

export function FeedbackInbox({
  initialRows,
  users,
}: {
  initialRows: FeedbackRow[];
  users: { id: string; email: string }[];
}) {
  const [statusFilter, setStatusFilter] = useState<FeedbackStatus | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<FeedbackCategory | "all">("all");
  const [userFilter, setUserFilter] = useState<string>("all");
  const [selected, setSelected] = useState<FeedbackRow | null>(null);
  const [rows, setRows] = useState(initialRows);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (categoryFilter !== "all" && r.category !== categoryFilter) return false;
      if (userFilter !== "all" && r.user_id !== userFilter) return false;
      return true;
    });
  }, [rows, statusFilter, categoryFilter, userFilter]);

  function updateLocal(id: string, patch: Partial<FeedbackRow>) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    if (selected?.id === id) setSelected((s) => (s ? { ...s, ...patch } : s));
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <span className="text-xs uppercase tracking-wider text-slate-400">
          Filter
        </span>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as FeedbackStatus | "all")}>
          <SelectTrigger className="h-8 w-36 text-xs">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_META[s].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as FeedbackCategory | "all")}>
          <SelectTrigger className="h-8 w-44 text-xs">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {CATEGORY_OPTIONS.map((c) => (
              <SelectItem key={c} value={c}>
                {CATEGORY_META[c].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={userFilter} onValueChange={setUserFilter}>
          <SelectTrigger className="h-8 w-56 text-xs">
            <SelectValue placeholder="User" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All users</SelectItem>
            {users.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="ml-auto text-xs text-slate-500">
          {filtered.length} of {rows.length}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <EmptyState
            icon={MessageSquare}
            title="No feedback yet"
            description="When partners hit the Feedback button in the top bar, entries will land here."
          />
        </div>
      ) : (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {filtered.map((r) => (
            <FeedbackRowItem
              key={r.id}
              row={r}
              onOpen={() => setSelected(r)}
            />
          ))}
        </ul>
      )}

      <FeedbackDetailDrawer
        row={selected}
        onClose={() => setSelected(null)}
        onPatch={(patch) => selected && updateLocal(selected.id, patch)}
      />
    </>
  );
}

function FeedbackRowItem({ row, onOpen }: { row: FeedbackRow; onOpen: () => void }) {
  const cat = CATEGORY_META[row.category];
  const st = STATUS_META[row.status];
  const Icon = cat.icon;
  return (
    <li
      onClick={onOpen}
      className="flex cursor-pointer items-start gap-3 px-4 py-3 hover:bg-slate-50"
    >
      <span
        className={cn(
          "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
          cat.bg,
        )}
      >
        <Icon className={cn("h-4 w-4", cat.text)} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ring-1 ring-inset",
              st.bg,
              st.text,
              st.ring,
            )}
          >
            {st.label}
          </span>
          <span className="text-xs text-slate-500">{cat.label}</span>
          {row.brand_context && (
            <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-slate-500">
              {row.brand_context}
            </span>
          )}
        </div>
        <p className="mt-1 line-clamp-2 text-sm text-slate-800">{row.message}</p>
        <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
          <span>{row.user_email ?? "—"}</span>
          <span>·</span>
          <span>{relativeOrDash(row.created_at)}</span>
          {row.page_url && (
            <>
              <span>·</span>
              <code className="rounded bg-slate-50 px-1 text-[10px]">
                {row.page_url}
              </code>
            </>
          )}
        </div>
      </div>
      <ChevronRight className="mt-2 h-4 w-4 shrink-0 text-slate-300" />
    </li>
  );
}

function FeedbackDetailDrawer({
  row,
  onClose,
  onPatch,
}: {
  row: FeedbackRow | null;
  onClose: () => void;
  onPatch: (patch: Partial<FeedbackRow>) => void;
}) {
  const [pendingStatus, startStatusTransition] = useTransition();

  function changeStatus(next: FeedbackStatus) {
    if (!row) return;
    startStatusTransition(async () => {
      const r = await updateFeedbackStatus(row.id, next);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      const resolved =
        next === "done" || next === "wontfix"
          ? new Date().toISOString()
          : null;
      onPatch({ status: next, resolved_at: resolved });
      toast.success(`Status → ${STATUS_META[next].label}`);
    });
  }

  if (!row) return null;
  const cat = CATEGORY_META[row.category];
  const Icon = cat.icon;

  return (
    <Sheet open={!!row} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-xl">
        <SheetHeader className="border-b border-slate-200 bg-slate-50/60 px-6 py-5">
          <div className="flex items-center gap-3">
            <span
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-md",
                cat.bg,
              )}
            >
              <Icon className={cn("h-5 w-5", cat.text)} />
            </span>
            <div className="flex-1">
              <SheetTitle className="text-base">
                {cat.label}{" "}
                {row.brand_context && (
                  <span className="ml-2 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-slate-500">
                    {row.brand_context}
                  </span>
                )}
              </SheetTitle>
              <p className="text-xs text-slate-500">
                from <span className="font-medium">{row.user_email ?? "—"}</span>
                {" · "}
                {relativeOrDash(row.created_at)}
              </p>
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-6 p-6">
          <section>
            <h3 className="text-[11px] uppercase tracking-wider text-slate-400">
              Message
            </h3>
            <p className="mt-2 whitespace-pre-wrap rounded-lg border border-slate-100 bg-white p-3 text-sm text-slate-800">
              {row.message}
            </p>
            {row.page_url && (
              <p className="mt-2 text-xs text-slate-500">
                Submitted from{" "}
                <code className="rounded bg-slate-100 px-1.5 py-0.5">
                  {row.page_url}
                </code>
              </p>
            )}
          </section>

          <Separator />

          <section className="space-y-2">
            <h3 className="text-[11px] uppercase tracking-wider text-slate-400">
              Status
            </h3>
            <div className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.map((s) => {
                const active = s === row.status;
                const meta = STATUS_META[s];
                return (
                  <Button
                    key={s}
                    type="button"
                    size="sm"
                    variant={active ? "default" : "outline"}
                    onClick={() => changeStatus(s)}
                    disabled={pendingStatus}
                    className={cn(
                      "h-8 gap-1.5 text-xs",
                      active && "bg-slate-900 hover:bg-slate-800",
                    )}
                  >
                    {pendingStatus && active && (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    )}
                    {active && !pendingStatus && <Check className="h-3 w-3" />}
                    {meta.label}
                  </Button>
                );
              })}
            </div>
            {row.resolved_at && (
              <p className="text-xs text-slate-400">
                Resolved {relativeOrDash(row.resolved_at)}
              </p>
            )}
          </section>

          <Separator />

          <section className="space-y-2">
            <h3 className="text-[11px] uppercase tracking-wider text-slate-400">
              Admin notes
            </h3>
            <EditableText
              value={row.admin_notes}
              multiline
              placeholder="Internal notes — root cause, decision, related ticket…"
              onSave={async (v) => {
                const r = await updateFeedbackNotes(row.id, v);
                if (r.ok) onPatch({ admin_notes: v });
                return r;
              }}
            />
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
