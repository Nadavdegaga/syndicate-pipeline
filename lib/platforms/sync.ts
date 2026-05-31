// Sync orchestrator: pulls offers from a connection, upserts into external_offers,
// deactivates stale ones, and writes a sync_runs row.

import { createServiceClient } from "@/lib/supabase/service";
import { decrypt } from "@/lib/crypto";
import { getPlatformClient, type PlatformKind } from "./registry";
import type { NormalizedOffer } from "./types";

export type SyncOutcome = {
  ok: boolean;
  sync_run_id: string;
  status: "success" | "error";
  offers_fetched: number;
  offers_new: number;
  offers_updated: number;
  offers_deactivated: number;
  error?: string;
};

type ConnectionRow = {
  id: string;
  platform: PlatformKind;
  base_url: string;
  api_key_encrypted: string;
  api_secret_encrypted: string | null;
  extra_config: Record<string, unknown> | null;
  active: boolean;
};

/**
 * Run a sync for one connection. Idempotent: matches existing external_offers
 * by (connection_id, platform_offer_id). Stale offers (not seen in this run)
 * are flagged is_active=false.
 *
 * Uses the service-role client so it can run inside a cron context without
 * a user session.
 */
export async function syncConnection(
  connectionId: string,
  triggeredBy: "cron" | "manual",
): Promise<SyncOutcome> {
  const supabase = createServiceClient();
  const runStart = new Date().toISOString();

  // 1. Create sync_runs row
  const { data: run, error: runErr } = await supabase
    .from("sync_runs")
    .insert({
      connection_id: connectionId,
      triggered_by: triggeredBy,
      status: "running",
      started_at: runStart,
    })
    .select("id")
    .single();
  if (runErr || !run) {
    throw new Error("sync_runs insert failed: " + (runErr?.message ?? "unknown"));
  }
  const runId = run.id as string;

  async function finish(
    status: "success" | "error",
    counts: Partial<Omit<SyncOutcome, "ok" | "sync_run_id" | "status">>,
    errorMessage?: string,
  ) {
    const completed = new Date().toISOString();
    await supabase
      .from("sync_runs")
      .update({
        status,
        completed_at: completed,
        offers_fetched: counts.offers_fetched ?? 0,
        offers_new: counts.offers_new ?? 0,
        offers_updated: counts.offers_updated ?? 0,
        offers_deactivated: counts.offers_deactivated ?? 0,
        error_message: errorMessage ?? null,
      })
      .eq("id", runId);
    await supabase
      .from("platform_connections")
      .update({
        last_sync_at: completed,
        last_sync_status: status,
        last_sync_error: errorMessage ?? null,
        updated_at: completed,
      })
      .eq("id", connectionId);
  }

  // Mark connection as running (so the UI shows a spinner)
  await supabase
    .from("platform_connections")
    .update({ last_sync_status: "running" })
    .eq("id", connectionId);

  // 2. Load connection
  const { data: connRaw, error: connErr } = await supabase
    .from("platform_connections")
    .select(
      "id, platform, base_url, api_key_encrypted, api_secret_encrypted, extra_config, active",
    )
    .eq("id", connectionId)
    .maybeSingle();
  if (connErr || !connRaw) {
    await finish("error", {}, "Connection not found");
    return {
      ok: false,
      sync_run_id: runId,
      status: "error",
      offers_fetched: 0,
      offers_new: 0,
      offers_updated: 0,
      offers_deactivated: 0,
      error: "Connection not found",
    };
  }
  const conn = connRaw as ConnectionRow;

  // 3. Decrypt and fetch
  let apiKey: string;
  let apiSecret: string | null = null;
  try {
    apiKey = decrypt(conn.api_key_encrypted);
    if (conn.api_secret_encrypted) apiSecret = decrypt(conn.api_secret_encrypted);
  } catch (e) {
    const msg = `Could not decrypt API key (ENCRYPTION_KEY mismatch?): ${
      e instanceof Error ? e.message : String(e)
    }`;
    await finish("error", {}, msg);
    return {
      ok: false,
      sync_run_id: runId,
      status: "error",
      offers_fetched: 0,
      offers_new: 0,
      offers_updated: 0,
      offers_deactivated: 0,
      error: msg,
    };
  }

  const client = getPlatformClient(conn.platform);
  const fetched = await client.fetchOffers({
    baseUrl: conn.base_url,
    apiKey,
    apiSecret,
    extraConfig: conn.extra_config ?? undefined,
  });

  if (!fetched.ok) {
    await finish("error", {}, fetched.error);
    return {
      ok: false,
      sync_run_id: runId,
      status: "error",
      offers_fetched: 0,
      offers_new: 0,
      offers_updated: 0,
      offers_deactivated: 0,
      error: fetched.error,
    };
  }

  const offers: NormalizedOffer[] = fetched.offers;

  // 4. Snapshot of existing ids for this connection (to compute new vs updated vs stale)
  const { data: existing } = await supabase
    .from("external_offers")
    .select("id, platform_offer_id")
    .eq("connection_id", connectionId);
  const existingMap = new Map<string, string>(
    (existing ?? []).map((r) => [r.platform_offer_id, r.id]),
  );

  const now = new Date().toISOString();
  const seenIds = new Set<string>();
  let newCount = 0;
  let updatedCount = 0;

  // 5. Upsert in batches
  const BATCH = 100;
  for (let i = 0; i < offers.length; i += BATCH) {
    const slice = offers.slice(i, i + BATCH);
    const rows = slice.map((o) => {
      const isNew = !existingMap.has(o.platform_offer_id);
      if (isNew) newCount += 1;
      else updatedCount += 1;
      seenIds.add(o.platform_offer_id);
      return {
        connection_id: connectionId,
        platform_offer_id: o.platform_offer_id,
        name: o.name,
        advertiser: o.advertiser ?? null,
        vertical: o.vertical ?? null,
        payout: o.payout ?? null,
        countries: o.countries ?? [],
        traffic_sources: o.traffic_sources ?? [],
        status: o.status ?? null,
        preview_url: o.preview_url ?? null,
        raw_data: o.raw_data ?? null,
        last_seen_at: now,
        is_active: true,
        updated_at: now,
      };
    });
    const { error: upErr } = await supabase
      .from("external_offers")
      .upsert(rows, { onConflict: "connection_id,platform_offer_id" });
    if (upErr) {
      await finish(
        "error",
        { offers_fetched: offers.length, offers_new: newCount, offers_updated: updatedCount },
        "Upsert error: " + upErr.message,
      );
      return {
        ok: false,
        sync_run_id: runId,
        status: "error",
        offers_fetched: offers.length,
        offers_new: newCount,
        offers_updated: updatedCount,
        offers_deactivated: 0,
        error: upErr.message,
      };
    }
  }

  // 6. Deactivate stale offers (in DB but not in this run, and added_to_my_offers=false)
  const stale = (existing ?? [])
    .filter((r) => !seenIds.has(r.platform_offer_id))
    .map((r) => r.id);
  let staleCount = 0;
  if (stale.length > 0) {
    const { data: deact, error: deactErr } = await supabase
      .from("external_offers")
      .update({ is_active: false, updated_at: now })
      .in("id", stale)
      .eq("added_to_my_offers", false) // keep linked offers visible
      .select("id");
    if (!deactErr) staleCount = deact?.length ?? 0;
  }

  await finish("success", {
    offers_fetched: offers.length,
    offers_new: newCount,
    offers_updated: updatedCount,
    offers_deactivated: staleCount,
  });

  return {
    ok: true,
    sync_run_id: runId,
    status: "success",
    offers_fetched: offers.length,
    offers_new: newCount,
    offers_updated: updatedCount,
    offers_deactivated: staleCount,
  };
}
