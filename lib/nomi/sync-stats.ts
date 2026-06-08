// Syncs Nomi stats for a single date into nomi_daily_stats via service client.

import { createServiceClient } from "@/lib/supabase/service";
import { fetchNomiStatsForDate } from "./stats-client";

export type StatsSyncResult = {
  ok: boolean;
  date: string;
  fetched: number;
  upserted: number;
  error?: string;
};

const BATCH_SIZE = 500;

export async function syncNomiStatsForDate(date: string): Promise<StatsSyncResult> {
  const fetched = await fetchNomiStatsForDate(date);
  if (!fetched.ok) {
    return { ok: false, date, fetched: 0, upserted: 0, error: fetched.error };
  }

  if (fetched.rows.length === 0) {
    return { ok: true, date, fetched: 0, upserted: 0 };
  }

  const supabase = createServiceClient();
  let upserted = 0;

  for (let i = 0; i < fetched.rows.length; i += BATCH_SIZE) {
    const batch = fetched.rows.slice(i, i + BATCH_SIZE).map((r) => ({
      ...r,
      updated_at: new Date().toISOString(),
    }));

    const { data, error } = await supabase
      .from("nomi_daily_stats")
      .upsert(batch, { onConflict: "report_date,offer_id,source" })
      .select("id");

    if (error) {
      return {
        ok: false,
        date,
        fetched: fetched.rows.length,
        upserted,
        error: error.message,
      };
    }
    upserted += data?.length ?? 0;
  }

  await supabase.from("activity_log").insert({
    entity_type: "offer",
    entity_id: "00000000-0000-0000-0000-000000000000",
    action: "nomi_stats_sync",
    to_value: `${upserted} rows for ${date}`,
  });

  return { ok: true, date, fetched: fetched.rows.length, upserted };
}