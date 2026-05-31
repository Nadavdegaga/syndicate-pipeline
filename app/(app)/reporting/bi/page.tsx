import { Sparkles, TrendingUp, Trophy, Users } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Separator } from "@/components/ui/separator";

const PLACEHOLDERS = [
  {
    title: "Cross-platform revenue trends",
    description: "Daily revenue rolled up across Affise, External Offers, and your CRM activity.",
    tooltip:
      "Stacked-area chart showing where the money is coming from over time, with brand splits.",
    icon: TrendingUp,
    iconColor: "text-emerald-600",
    iconBg: "bg-emerald-50",
  },
  {
    title: "Offer profitability ranking",
    description:
      "Combines Affise revenue, projected lifetime value, and CRM activity per offer to rank true ROI.",
    tooltip:
      "Table of offers sorted by revenue × CRM engagement × renewal probability.",
    icon: Trophy,
    iconColor: "text-amber-600",
    iconBg: "bg-amber-50",
  },
  {
    title: "Publisher performance scorecard",
    description:
      "Per-publisher view of clicks, conversions, payouts, and follow-up cadence — the people side of the funnel.",
    tooltip:
      "Per-publisher card grid with KPIs, ranked by revenue contribution.",
    icon: Users,
    iconColor: "text-violet-600",
    iconBg: "bg-violet-50",
  },
];

export default function AdvancedBIPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Advanced BI"
        icon={Sparkles}
        description="Combined analytics across Affise, External Offers, and Internal CRM data."
        meta="We'll build this once we have 30+ days of Affise data ingested."
      />

      <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-10 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-violet-100">
          <Sparkles className="h-6 w-6 text-violet-600" />
        </div>
        <h2 className="mt-3 text-lg font-semibold text-slate-900">Coming soon</h2>
        <p className="mt-1 text-sm text-slate-500">
          These dashboards activate once a meaningful Affise history is built up.
          Keep ingesting and we&apos;ll switch them on.
        </p>
      </div>

      <Separator />

      <div className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          What this will show
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {PLACEHOLDERS.map((p) => {
            const Icon = p.icon;
            return (
              <div
                key={p.title}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <span
                  className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${p.iconBg}`}
                >
                  <Icon className={`h-4 w-4 ${p.iconColor}`} />
                </span>
                <h4 className="mt-3 text-sm font-semibold text-slate-900">
                  {p.title}
                </h4>
                <p className="mt-1 text-xs text-slate-500">{p.description}</p>
                <div className="mt-3 rounded-md bg-slate-50 px-3 py-2 text-[11px] text-slate-600">
                  <span className="font-medium uppercase tracking-wider text-slate-500">
                    Preview:
                  </span>{" "}
                  {p.tooltip}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
