import {
  Activity,
  ArrowRight,
  StickyNote,
  Calendar,
  Tag,
  Plus,
  Trash2,
} from "lucide-react";
import { relativeOrDash } from "@/lib/utils/dates";

export type ActivityRow = {
  id: string;
  action: string;
  from_value: string | null;
  to_value: string | null;
  actor_id: string | null;
  brand_context: string | null;
  created_at: string;
};

function iconFor(action: string) {
  if (action.includes("note")) return StickyNote;
  if (action.includes("next_action")) return Calendar;
  if (action.includes("tier")) return Tag;
  if (action.includes("status")) return Tag;
  if (action === "created") return Plus;
  if (action === "deleted") return Trash2;
  return Activity;
}

function prettyAction(action: string): string {
  const map: Record<string, string> = {
    "status_nomi:status_changed": "Updated Nomi status",
    "status_startech:status_changed": "Updated StarTech status",
    "status_luminarix:status_changed": "Updated Luminarix status",
    "notes:note_updated": "Updated notes",
    "next_action_at:next_action_set": "Set next action",
    "last_touch_at:last_touch_updated": "Updated last touch",
    "tier:tier_changed": "Changed tier",
    "status:status_changed": "Changed status",
    "registered:registration_changed": "Updated registration",
    created: "Created",
    deleted: "Deleted",
  };
  return map[action] ?? action;
}

export function ActivityTimeline({
  rows,
  emptyHint = "No activity yet. Changes you make will appear here.",
}: {
  rows: ActivityRow[];
  emptyHint?: string;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/50 px-4 py-6 text-center text-sm text-slate-500">
        {emptyHint}
      </div>
    );
  }
  return (
    <ol className="space-y-3">
      {rows.map((r) => {
        const Icon = iconFor(r.action);
        return (
          <li key={r.id} className="relative flex gap-3">
            <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 ring-1 ring-slate-200">
              <Icon className="h-3.5 w-3.5 text-slate-500" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-slate-900">
                {prettyAction(r.action)}
                {r.brand_context && (
                  <span className="ml-2 inline-block rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-slate-500">
                    {r.brand_context}
                  </span>
                )}
              </div>
              {(r.from_value || r.to_value) && (
                <div className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
                  <span className="rounded bg-slate-50 px-1.5 py-0.5 text-slate-500">
                    {r.from_value ?? "—"}
                  </span>
                  <ArrowRight className="h-3 w-3 text-slate-400" />
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-700">
                    {r.to_value ?? "—"}
                  </span>
                </div>
              )}
              <div className="mt-0.5 text-xs text-slate-400">
                {relativeOrDash(r.created_at)}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
