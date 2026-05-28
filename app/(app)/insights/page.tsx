import {
  BarChart3,
  MessageCircle,
  Radio,
  Handshake,
  Activity as ActivityIcon,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/shared/PageHeader";
import { KpiCard } from "@/components/insights/KpiCard";
import { StatusBreakdownChart } from "@/components/insights/StatusBreakdownChart";
import { VerticalDistributionChart } from "@/components/insights/VerticalDistributionChart";
import { PipelineFunnelChart } from "@/components/insights/PipelineFunnelChart";
import { TopNetworksTable } from "@/components/insights/TopNetworksTable";
import { RecentActivityFeed } from "@/components/insights/RecentActivityFeed";
import { getInsightsData } from "@/lib/actions/insights";
import { getServerBrand } from "@/lib/utils/server-brand";
import { BRAND_LABELS } from "@/types";

export const dynamic = "force-dynamic";

export default async function InsightsPage() {
  const brand = getServerBrand();
  const data = await getInsightsData(brand);
  const [kpi1, kpi2, kpi3, kpi4] = data.kpis;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Insights"
        icon={BarChart3}
        description={`Pipeline health, activity, and demand for ${BRAND_LABELS[brand].toLowerCase()}.`}
        meta="Auto-scoped to the brand selected in the top bar"
      />

      {/* Row 1 — KPIs */}
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

      {/* Row 2 — Status breakdown + Vertical distribution */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">Status breakdown</h3>
            <span className="text-xs text-slate-400">
              {BRAND_LABELS[brand]}
            </span>
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

      {/* Row 3 — Pipeline Funnel */}
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

      {/* Row 4 — Top Networks + Recent Activity */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">
              Top 10 networks
            </h3>
            <span className="text-xs text-slate-400">by contact count</span>
          </div>
          <Separator className="my-4" />
          <TopNetworksTable rows={data.topNetworks} />
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">
              Recent activity
            </h3>
            <span className="text-xs text-slate-400">last 20 entries</span>
          </div>
          <Separator className="my-4" />
          <RecentActivityFeed rows={data.recentActivity} />
        </div>
      </div>
    </div>
  );
}
