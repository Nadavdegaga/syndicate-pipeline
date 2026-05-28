import Link from "next/link";
import {
  Tag,
  StickyNote,
  Calendar,
  Plus,
  Trash2,
  Activity,
  ArrowRight,
} from "lucide-react";
import { relativeOrDash } from "@/lib/utils/dates";
import type { ActivityFeedRow } from "@/lib/actions/insights";

function iconFor(action: string) {
  if (action.includes("note")) return StickyNote;
  if (action.includes("next_action")) return Calendar;
  if (action.includes("status") || action.includes("tier")) return Tag;
  if (action === "created") return Plus;
  if (action === "deleted") return Trash2;
  return Activity;
}

const ENTITY_PATH: Record<string, string> = {
  contact: "/contacts",
  network: "/networks",
  offer: "/offers",
  wishlist: "/wishlists",
  demand: "/demand",
};

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
    "kpi_notes:note_updated": "Updated KPI notes",
    marked_pitched: "Marked as pitched",
    created: "Created",
    deleted: "Deleted",
  };
  return map[action] ?? action;
}

export function RecentActivityFeed({ rows }: { rows: ActivityFeedRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-slate-400">
        No activity yet — start editing records and they&apos;ll show up here.
      </div>
    );
  }
  return (
    <ul className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
      {rows.map((r) => {
        const Icon = iconFor(r.action);
        const entityHref = ENTITY_PATH[r.entity_type];
        return (
          <li key={r.id} className="flex items-start gap-3 rounded-lg px-2 py-2 hover:bg-slate-50">
            <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 ring-1 ring-slate-200">
              <Icon className="h-3.5 w-3.5 text-slate-500" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm">
                <span className="font-medium text-slate-900">
                  {prettyAction(r.action)}
                </span>
                {entityHref && (
                  <>
                    {" "}
                    <Link
                      href={`${entityHref}/${r.entity_id}`}
                      className="text-xs text-slate-500 hover:text-slate-900 hover:underline"
                    >
                      in {r.entity_type}
                    </Link>
                  </>
                )}
                {r.brand_context && (
                  <span className="ml-2 inline-block rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-slate-500">
                    {r.brand_context}
                  </span>
                )}
              </div>
              {(r.from_value || r.to_value) && (
                <div className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
                  <span className="truncate rounded bg-slate-50 px-1.5 py-0.5 max-w-[120px]">
                    {r.from_value ?? "—"}
                  </span>
                  <ArrowRight className="h-3 w-3 shrink-0 text-slate-400" />
                  <span className="truncate rounded bg-slate-100 px-1.5 py-0.5 max-w-[160px] text-slate-700">
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
    </ul>
  );
}
