"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ExternalLink,
  ArrowLeft,
  Users,
  Briefcase,
  TrendingUp,
  Activity as ActivityIcon,
  Info,
} from "lucide-react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { EditableText } from "@/components/shared/EditableText";
import { ActivityTimeline, type ActivityRow } from "@/components/shared/ActivityTimeline";
import { TierBadge } from "@/components/networks/TierBadge";
import {
  updateNetworkField,
  getNetworkActivity,
} from "@/lib/actions/networks";
import { relativeOrDash } from "@/lib/utils/dates";
import type {
  NetworkWithActivityRow,
  ContactRow,
  OfferRow,
  DemandRow,
} from "@/lib/supabase/types";

type Props = {
  network: NetworkWithActivityRow;
  contacts: ContactRow[];
  offers: OfferRow[];
  demand: DemandRow[];
};

const TIER_OPTIONS = ["A", "B", "C"];

function StatTile({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
          {label}
        </span>
        <Icon className="h-4 w-4 text-slate-300" />
      </div>
      <div className="mt-2 text-2xl font-semibold tabular-nums text-slate-900">
        {value}
      </div>
    </div>
  );
}

export function NetworkDetailClient({
  network,
  contacts,
  offers,
  demand,
}: Props) {
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getNetworkActivity(network.id, 20).then((rows) => {
      if (!cancelled) {
        setActivity(rows as ActivityRow[]);
        setActivityLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [network.id]);

  const save =
    (field: Parameters<typeof updateNetworkField>[1]) =>
    async (value: string | null) => {
      const r = await updateNetworkField(network.id, field, value);
      if (r.ok) {
        const fresh = await getNetworkActivity(network.id, 20);
        setActivity(fresh as ActivityRow[]);
      }
      return r;
    };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/networks"
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" /> All networks
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
                {network.name}
              </h1>
              <TierBadge tier={network.tier} size="md" />
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-500">
              {network.login_url && (
                <a
                  href={network.login_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 hover:text-slate-900"
                >
                  Login portal <ExternalLink className="h-3 w-3" />
                </a>
              )}
              {network.linkedin_url && (
                <>
                  <span>·</span>
                  <a
                    href={network.linkedin_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 hover:text-slate-900"
                  >
                    LinkedIn <ExternalLink className="h-3 w-3" />
                  </a>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatTile label="Contacts" value={network.contact_count} icon={Users} />
        <StatTile label="Offers" value={network.offer_count} icon={Briefcase} />
        <StatTile label="Demand items" value={demand.length} icon={TrendingUp} />
        <StatTile
          label="Last activity"
          value={
            network.last_contact_touch_at
              ? relativeOrDash(network.last_contact_touch_at)
              : "—"
          }
          icon={ActivityIcon}
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList className="bg-white">
          <TabsTrigger value="overview" className="gap-2">
            <Info className="h-4 w-4" /> Overview
          </TabsTrigger>
          <TabsTrigger value="contacts" className="gap-2">
            <Users className="h-4 w-4" /> Contacts ({network.contact_count})
          </TabsTrigger>
          <TabsTrigger value="offers" className="gap-2">
            <Briefcase className="h-4 w-4" /> Offers ({network.offer_count})
          </TabsTrigger>
          <TabsTrigger value="demand" className="gap-2">
            <TrendingUp className="h-4 w-4" /> Demand ({demand.length})
          </TabsTrigger>
          <TabsTrigger value="activity" className="gap-2">
            <ActivityIcon className="h-4 w-4" /> Activity
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900">Network details</h3>
            <Separator className="my-4" />
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-500">Name</label>
                <EditableText value={network.name} onSave={save("name")} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-500">Tier</label>
                <EditableText
                  value={network.tier}
                  onSave={save("tier")}
                  suggestions={TIER_OPTIONS}
                  placeholder="A · B · C"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-500">Login URL</label>
                <EditableText
                  value={network.login_url}
                  onSave={save("login_url")}
                  type="url"
                  placeholder="https://network.example.com/login"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-500">Registration URL</label>
                <EditableText
                  value={network.registration_url}
                  onSave={save("registration_url")}
                  type="url"
                  placeholder="https://network.example.com/signup"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-500">LinkedIn URL</label>
                <EditableText
                  value={network.linkedin_url}
                  onSave={save("linkedin_url")}
                  type="url"
                  placeholder="https://linkedin.com/company/…"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-500">Registered?</label>
                <EditableText
                  value={network.registered === null ? "" : String(network.registered)}
                  onSave={(v) => {
                    const parsed =
                      v === null
                        ? null
                        : v.toLowerCase() === "true" || v.toLowerCase() === "yes"
                          ? "true"
                          : v.toLowerCase() === "false" || v.toLowerCase() === "no"
                            ? "false"
                            : null;
                    return updateNetworkField(network.id, "registered", parsed === "true" ? true : parsed === "false" ? false : null);
                  }}
                  suggestions={["true", "false"]}
                  placeholder="true / false"
                />
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-xs font-medium text-slate-500">Notes</label>
                <EditableText
                  value={network.notes}
                  onSave={save("notes")}
                  multiline
                  placeholder="Internal notes about this network…"
                />
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="contacts">
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            {contacts.length === 0 ? (
              <div className="px-6 py-12 text-center text-sm text-slate-500">
                No contacts linked to this network yet.
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {contacts.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center justify-between px-5 py-3 hover:bg-slate-50"
                  >
                    <div>
                      <div className="font-medium text-slate-900">{c.name}</div>
                      <div className="text-xs text-slate-500">
                        {c.role ?? "—"} · {c.channel ?? "—"}
                      </div>
                    </div>
                    <div className="text-xs text-slate-500">
                      Last touch: {relativeOrDash(c.last_touch_at)}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </TabsContent>

        <TabsContent value="offers">
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            {offers.length === 0 ? (
              <div className="px-6 py-12 text-center text-sm text-slate-500">
                No offers from this network yet.
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {offers.map((o) => (
                  <li
                    key={o.id}
                    className="flex items-center justify-between px-5 py-3 hover:bg-slate-50"
                  >
                    <div>
                      <Link
                        href={`/offers/${o.id}`}
                        className="font-medium text-slate-900 hover:underline"
                      >
                        {o.name}
                      </Link>
                      <div className="text-xs text-slate-500">
                        {o.vertical ?? "—"} · {o.payout ?? "—"}
                      </div>
                    </div>
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                      {o.status?.replace("_", " ") ?? "—"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </TabsContent>

        <TabsContent value="demand">
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            {demand.length === 0 ? (
              <div className="px-6 py-12 text-center text-sm text-slate-500">
                No demand items from this network.
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {demand.map((d) => (
                  <li
                    key={d.id}
                    className="flex items-center justify-between px-5 py-3 hover:bg-slate-50"
                  >
                    <div>
                      <div className="font-medium text-slate-900">{d.offer_name}</div>
                      <div className="text-xs text-slate-500">
                        {d.vertical ?? "—"} · {d.payout ?? "—"}
                      </div>
                    </div>
                    {d.link && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={d.link} target="_blank" rel="noreferrer">
                          Open <ExternalLink className="ml-1 h-3 w-3" />
                        </a>
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </TabsContent>

        <TabsContent value="activity">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            {activityLoading ? (
              <div className="text-sm text-slate-400">Loading…</div>
            ) : (
              <ActivityTimeline
                rows={activity}
                emptyHint="No activity logged for this network yet. Edits to tier, registration, or notes will appear here."
              />
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
