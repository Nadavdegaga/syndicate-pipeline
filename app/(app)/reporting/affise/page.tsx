import { LineChart } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/PageHeader";
import { PageTourLauncher } from "@/components/shell/PageTourLauncher";
import { AffiseDashboard, type DailyStat } from "@/components/reporting/AffiseDashboard";

export const dynamic = "force-dynamic";

export default async function AffiseReportingPage() {
  const supabase = createClient();
  // Pull last 90 days of stats — UI further filters by selected range.
  const cutoff = new Date();
  cutoff.setUTCDate(cutoff.getUTCDate() - 89);
  const { data } = await supabase
    .from("affise_daily_stats")
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

  return (
    <div className="space-y-6">
      <PageTourLauncher tour="affise" />
      <PageHeader
        title="Affise Reporting"
        icon={LineChart}
        description="Daily clicks, conversions, revenue and profit ingested from Affise."
        meta={`${rows.length.toLocaleString()} daily records in the last 90 days`}
      />
      <AffiseDashboard rows={rows} />
    </div>
  );
}
