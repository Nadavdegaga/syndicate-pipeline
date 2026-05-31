import {
  BarChart3,
  MessageCircle,
  Radio,
  Handshake,
  Activity as ActivityIcon,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/shared/PageHeader";
import { PageTourLauncher } from "@/components/shell/PageTourLauncher";
import { KpiCard } from "@/components/insights/KpiCard";
import { StatusBreakdownChart } from "@/components/insights/StatusBreakdownChart";
import { VerticalDistributionChart } from "@/components/insights/VerticalDistributionChart";
import { PipelineFunnelChart } from "@/components/insights/PipelineFunnelChart";
import { TopNetworksTable } from "@/components/insights/TopNetworksTable";
import { RecentActivityFeed } from "@/components/insights/RecentActivityFeed";
import { SmartInsights } from "@/components/insights/SmartInsights";
import { QuickActions } from "@/components/insights/QuickActions";
import { getInsightsData } from "@/lib/actions/insights";
import { computeAndLoadInsights } from "@/lib/insights/compute";
import { getServerBrand } from "@/lib/utils/server-brand";
import { createClient } from "@/lib/supabase/server";
import { BRAND_LABELS } from "@/types";

export const dynamic = "force-dynamic";

export default async function InsightsPage() {
  const brand = getServerBrand();
  const supabase = createClient();

  const [data, insights, networksList, contactsList] = await Promise.all([
    getInsightsData(brand),
    computeAndLoadInsights(brand),
    supabase.from("networks").select("id, name").order("name").then((r) => r.data ?? []),
    supabase
      .from("contacts")
      .select("id, name")
      .in("channel", ["Telegram", "Skype"])
      .order("name")
      .limit(500)
      .then((r) => r.data ?? []),
  ]);

  const [kpi1, kpi2, kpi3, kpi4] = data.kpis;

  return (
    <div className="space-y-8">
      <PageTourLauncher tour="smartInsights" />
      <PageHeader
        title="Insights"
        icon={BarChart3}
        description={`Pipeline health, activity, and demand for ${BRAND_LABELS[brand].toLowerCase()}.`}
        meta="Auto-scoped to the brand selected in the top bar"
      />

      {/* ===== Section 1 — Smart Insights ===== */}
      <SmartInsights
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        initialRows={insights as any}
      />

      {/* ===== Section 2 — Quick Actions ===== */}
      <QuickActions
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        networks={networksList as any}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        contacts={contactsList as any}
      />

      {/* ===== Section 3 — BI dashboard ===== */}
      <div className="space-y-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
          📊 BI dashboard
        </h2>

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <KpiCard
            label={kpi1.label}
            value={kpi1.value}
            hint={kpi1.hint}
            icon={MessageCircle}
            accent="green"
          />
          <KpiCard
            label={kpi2.label}
            value={kpi2.value}
            hint={kpi2.hint}
            icon={ActivityIcon}
            accent="blue"
          />
          <KpiCard
            label={kpi3.label}
            value={kpi3.value}
            hint={kpi3.hint}
            icon={Radio}
            accent="amber"
          />
          <KpiCard
            label={kpi4.label}
            value={kpi4.value}
            hint={kpi4.hint}
            icon={Handshake}
            accent="purple"
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">Status breakdown</h3>
              <span className="text-xs text-slate-400">{BRAND_LABELS[brand]}</span>
            </div>
            <Separator className="my-4" />
            <StatusBreakdownChart data={data.statusBreakdown} />
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">Vertical distribution</h3>
              <span className="text-xs text-slate-400">offers</span>
            </div>
            <Separator className="my-4" />
            <VerticalDistributionChart data={data.verticalDistribution} />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">Pipeline funnel</h3>
            <span className="text-xs text-slate-400">
              {BRAND_LABELS[brand]} · stages
            </span>
          </div>
          <Separator className="my-4" />
          <PipelineFunnelChart data={data.pipelineFunnel} />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">Top 10 networks</h3>
              <span className="text-xs text-slate-400">by contact count</span>
            </div>
            <Separator className="my-4" />
            <TopNetworksTable rows={data.topNetworks} />
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">Recent activity</h3>
              <span className="text-xs text-slate-400">last 20 entries</span>
            </div>
            <Separator className="my-4" />
            <RecentActivityFeed rows={data.recentActivity} />
          </div>
        </div>
      </div>
    </div>
  );
}
