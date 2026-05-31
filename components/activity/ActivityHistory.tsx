"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity as ActivityIcon,
  ArrowRight,
  Tag,
  StickyNote,
  Calendar,
  Plus,
  Trash2,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/EmptyState";
import { relativeOrDash } from "@/lib/utils/dates";
import { cn } from "@/lib/utils";

export type ActivityEntry = {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  from_value: string | null;
  to_value: string | null;
  actor_id: string | null;
  actor_email: string | null;
  brand_context: string | null;
  created_at: string;
};

const ENTITY_PATH: Record<string, string> = {
  contact: "/contacts",
  network: "/networks",
  offer: "/offers",
  wishlist: "/wishlists",
  demand: "/demand",
};

const ACTION_LABEL: Record<string, string> = {
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
  ai_query: "Asked Claude",
  created: "Created",
  deleted: "Deleted",
};

function iconFor(action: string) {
  if (action.includes("note")) return StickyNote;
  if (action.includes("next_action")) return Calendar;
  if (action.includes("status") || action.includes("tier")) return Tag;
  if (action === "created") return Plus;
  if (action === "deleted") return Trash2;
  return ActivityIcon;
}

export function ActivityHistory({
  initialRows,
  users,
}: {
  initialRows: ActivityEntry[];
  users: { id: string; email: string }[];
}) {
  const [userFilter, setUserFilter] = useState("all");
  const [entityFilter, setEntityFilter] = useState("all");
  const [brandFilter, setBrandFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [since, setSince] = useState("");
  const [until, setUntil] = useState("");

  const actionOptions = useMemo(() => {
    const set = new Set(initialRows.map((r) => r.action));
    return Array.from(set).sort();
  }, [initialRows]);

  const filtered = useMemo(() => {
    return initialRows.filter((r) => {
      if (userFilter !== "all" && r.actor_id !== userFilter) return false;
      if (entityFilter !== "all" && r.entity_type !== entityFilter) return false;
      if (brandFilter !== "all" && r.brand_context !== brandFilter) return false;
      if (actionFilter !== "all" && r.action !== actionFilter) return false;
      if (since && new Date(r.created_at) < new Date(since)) return false;
      if (until && new Date(r.created_at) > new Date(until + "T23:59:59"))
        return false;
      return true;
    });
  }, [initialRows, userFilter, entityFilter, brandFilter, actionFilter, since, until]);

  function reset() {
    setUserFilter("all");
    setEntityFilter("all");
    setBrandFilter("all");
    setActionFilter("all");
    setSince("");
    setUntil("");
  }

  return (
    <>
      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <div className="space-y-1">
            <Label className="text-[10px] uppercase tracking-wider text-slate-500">User</Label>
            <Select value={userFilter} onValueChange={setUserFilter}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All users</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] uppercase tracking-wider text-slate-500">Entity</Label>
            <Select value={entityFilter} onValueChange={setEntityFilter}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All entities</SelectItem>
                <SelectItem value="contact">Contacts</SelectItem>
                <SelectItem value="network">Networks</SelectItem>
                <SelectItem value="offer">Offers</SelectItem>
                <SelectItem value="wishlist">Wishlists</SelectItem>
                <SelectItem value="demand">Demand</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] uppercase tracking-wider text-slate-500">Brand</Label>
            <Select value={brandFilter} onValueChange={setBrandFilter}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All brands</SelectItem>
                <SelectItem value="nomi">Nomi</SelectItem>
                <SelectItem value="startech">StarTech</SelectItem>
                <SelectItem value="luminarix">Luminarix</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] uppercase tracking-wider text-slate-500">Action</Label>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All actions</SelectItem>
                {actionOptions.map((a) => (
                  <SelectItem key={a} value={a}>
                    {ACTION_LABEL[a] ?? a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] uppercase tracking-wider text-slate-500">From</Label>
            <Input
              type="date"
              value={since}
              onChange={(e) => setSince(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] uppercase tracking-wider text-slate-500">To</Label>
            <Input
              type="date"
              value={until}
              onChange={(e) => setUntil(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
          <span>
            {filtered.length} of {initialRows.length} entries
          </span>
          <Button variant="ghost" size="sm" onClick={reset}>
            Clear filters
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <EmptyState
            icon={ActivityIcon}
            title="No activity matches your filters"
            description="Try clearing filters, or come back after some edits."
          />
        </div>
      ) : (
        <ol className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {filtered.map((row, i) => (
            <ActivityRow key={row.id} row={row} alt={i % 2 === 1} />
          ))}
        </ol>
      )}
    </>
  );
}

function ActivityRow({ row, alt }: { row: ActivityEntry; alt: boolean }) {
  const Icon = iconFor(row.action);
  const entityHref = ENTITY_PATH[row.entity_type];
  const actionLabel = ACTION_LABEL[row.action] ?? row.action;
  return (
    <li
      className={cn(
        "flex items-start gap-3 border-b border-slate-100 px-5 py-3 last:border-b-0",
        alt && "bg-slate-50/30",
      )}
    >
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 ring-1 ring-slate-200">
        <Icon className="h-3.5 w-3.5 text-slate-500" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5 text-sm">
          <span className="font-medium text-slate-900">
            {row.actor_email ? row.actor_email.split("@")[0] : "Someone"}
          </span>
          <span className="text-slate-600">{actionLabel.toLowerCase()}</span>
          {entityHref && (
            <Link
              href={`${entityHref}/${row.entity_id}`}
              className="font-medium text-blue-600 hover:underline"
            >
              {row.entity_type}
            </Link>
          )}
          {row.brand_context && (
            <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-slate-500">
              {row.brand_context}
            </span>
          )}
        </div>
        {(row.from_value || row.to_value) && (
          <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
            <span className="max-w-[200px] truncate rounded bg-slate-50 px-1.5 py-0.5">
              {row.from_value ?? "—"}
            </span>
            <ArrowRight className="h-3 w-3 shrink-0 text-slate-400" />
            <span className="max-w-[280px] truncate rounded bg-slate-100 px-1.5 py-0.5 text-slate-700">
              {row.to_value ?? "—"}
            </span>
          </div>
        )}
      </div>
      <div className="shrink-0 text-xs text-slate-400">
        {relativeOrDash(row.created_at)}
      </div>
    </li>
  );
}
