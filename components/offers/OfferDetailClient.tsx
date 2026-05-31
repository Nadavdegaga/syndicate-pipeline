"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ExternalLink,
  Search,
  CheckCircle2,
  Loader2,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { EditableText } from "@/components/shared/EditableText";
import { ActivityTimeline, type ActivityRow } from "@/components/shared/ActivityTimeline";
import {
  updateOfferField,
  markOfferPitched,
  getOfferActivity,
} from "@/lib/actions/offers";
import { getOfferStatusStyle } from "@/lib/utils/status";
import { relativeOrDash } from "@/lib/utils/dates";
import { cn } from "@/lib/utils";
import type { OfferRow } from "@/lib/supabase/types";

const OFFER_STATUSES = [
  "active",
  "needs_proof",
  "needs_traffic",
  "direct",
  "internal",
  "paused",
  "dead",
];

export function OfferDetailClient({ offer }: { offer: OfferRow }) {
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const [pitchPending, startPitch] = useTransition();

  useEffect(() => {
    let cancelled = false;
    getOfferActivity(offer.id, 20).then((r) => {
      if (!cancelled) {
        setActivity(r as ActivityRow[]);
        setActivityLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [offer.id]);

  const save =
    (field: Parameters<typeof updateOfferField>[1]) =>
    async (value: string | null) => {
      const r = await updateOfferField(offer.id, field, value);
      if (r.ok) {
        const fresh = await getOfferActivity(offer.id, 20);
        setActivity(fresh as ActivityRow[]);
      }
      return r;
    };

  function pitch() {
    startPitch(async () => {
      const r = await markOfferPitched(offer.id);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("Marked as pitched");
      const fresh = await getOfferActivity(offer.id, 20);
      setActivity(fresh as ActivityRow[]);
    });
  }

  const statusStyle = getOfferStatusStyle(offer.status);

  return (
    <div className="space-y-6">
      <Link
        href="/offers"
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" /> All offers
      </Link>

      {/* Header */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-white shadow-sm">
        <div className="space-y-4 p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1 space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
                {offer.name}
              </h1>
              <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
                {offer.network_name && (
                  <Link
                    href={
                      offer.network_id ? `/networks/${offer.network_id}` : "/networks"
                    }
                    className="font-medium hover:underline"
                  >
                    {offer.network_name}
                  </Link>
                )}
                {offer.vertical && (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs uppercase tracking-wide text-slate-500">
                    {offer.vertical}
                  </span>
                )}
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
                    statusStyle.bg,
                    statusStyle.text,
                    statusStyle.ring,
                  )}
                >
                  {statusStyle.label}
                </span>
              </div>
            </div>
            <div className="text-right">
              {offer.payout && (
                <div className="text-3xl font-semibold tabular-nums text-slate-900">
                  {offer.payout}
                </div>
              )}
              {offer.last_pitched_at && (
                <div className="mt-1 text-xs text-slate-500">
                  Pitched {relativeOrDash(offer.last_pitched_at)}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <Button asChild>
              <Link href={`/matchmaker?offer=${offer.id}`}>
                <Search className="mr-2 h-4 w-4" />
                Find publishers for this
              </Link>
            </Button>
            {offer.preview_link && (
              <Button asChild variant="outline">
                <a href={offer.preview_link} target="_blank" rel="noreferrer">
                  Preview link
                  <ExternalLink className="ml-2 h-3.5 w-3.5" />
                </a>
              </Button>
            )}
            <Button variant="outline" onClick={pitch} disabled={pitchPending}>
              {pitchPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-2 h-4 w-4" />
              )}
              Mark as pitched
            </Button>
            {!offer.network_id && offer.network_name && (
              <Button asChild variant="outline">
                <Link
                  href={`/networks/new?name=${encodeURIComponent(offer.network_name)}&from_offer=${offer.id}`}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add network &quot;{offer.network_name}&quot;
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Editable fields */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900">Offer details</h3>
        <Separator className="my-4" />
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-500">Offer name</label>
            <EditableText value={offer.name} onSave={save("name")} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-500">Status</label>
            <EditableText
              value={offer.status}
              onSave={save("status")}
              suggestions={OFFER_STATUSES}
              placeholder="active / paused / needs_traffic …"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-500">Vertical</label>
            <EditableText
              value={offer.vertical}
              onSave={save("vertical")}
              placeholder="Auto insurance, Home, Solar…"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-500">Payout</label>
            <EditableText
              value={offer.payout}
              onSave={save("payout")}
              placeholder="$8 CPL"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-500">Traffic sources</label>
            <EditableText
              value={offer.traffic_sources}
              onSave={save("traffic_sources")}
              placeholder="Search, Native, Social, Email…"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-500">Preview link</label>
            <EditableText
              value={offer.preview_link}
              onSave={save("preview_link")}
              type="url"
              placeholder="https://network.example.com/offer/123"
            />
          </div>
          <div className="sm:col-span-2 space-y-1.5">
            <label className="text-xs font-medium text-slate-500">KPI notes</label>
            <EditableText
              value={offer.kpi_notes}
              onSave={save("kpi_notes")}
              multiline
              placeholder="Conversion windows, exclusions, restrictions…"
            />
          </div>
        </div>
      </div>

      {/* Activity */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900">Activity</h3>
        <Separator className="my-4" />
        {activityLoading ? (
          <div className="text-sm text-slate-400">Loading…</div>
        ) : (
          <ActivityTimeline
            rows={activity}
            emptyHint="No activity on this offer yet. Status changes and pitches will appear here."
          />
        )}
      </div>
    </div>
  );
}

