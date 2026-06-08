import { LineChart } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/PageHeader";
import { StarTechDashboard, type DailyStat } from "@/components/reporting/StarTechDashboard";

export const dynamic = "force-dynamic";

export default async function StarTechReportingPage() {
  const supabase = createClient();
  const cutoff = new Date();
  cutoff.setUTCDate(cutoff.getUTCDate() - 89);
  const { data } = await supabase
    .from("startech_daily_stats")
    .select("report_date, offer_id, source, clicks, conversions, revenue, cost, profit")
    .gte("report_date", cutoff.toISOString().slice(0, 10))
    .order("report_date", { ascending: false })
    .limit(10000);

  const rows = (data ?? []).map((r) => ({
    ...r,
    revenue: Number(r.revenue),
    cost: Number(r.cost),
    profit: Number(r.profit),
  })) as DailyStat[];

  const canSync = !!(process.env.STARTECH_AFFISE_API_KEY && process.env.STARTECH_AFFISE_BASE_URL);

  return (
    <div className="space-y-6">
      <PageHeader
        title="StarTech Reporting"
        icon={LineChart}
        description="Daily clicks, conversions, revenue and profit ingested from StarTech."
        meta={`${rows.length.toLocaleString()} daily records in the last 90 days`}
      />
      <StarTechDashboard rows={rows} canSync={canSync} />
    </div>
  );
}
