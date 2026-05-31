import { Globe } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/PageHeader";
import { PageTourLauncher } from "@/components/shell/PageTourLauncher";
import { ConnectionsStrip, type ConnectionCard } from "@/components/external-offers/ConnectionsStrip";
import {
  ExternalOffersTable,
  type ExternalOfferRow,
} from "@/components/external-offers/ExternalOffersTable";
import { platformLabel, type PlatformKind } from "@/lib/platforms/registry";

export const dynamic = "force-dynamic";

export default async function ExternalOffersPage() {
  const supabase = createClient();
  const [
    { data: connections },
    { data: offers },
  ] = await Promise.all([
    supabase
      .from("platform_connections")
      .select(
        "id, platform, display_name, last_sync_at, last_sync_status, last_sync_error, active",
      )
      .order("created_at", { ascending: false }),
    supabase
      .from("external_offers")
      .select(
        `id, platform_offer_id, name, advertiser, vertical, payout, countries, status,
         preview_url, last_seen_at, is_active, added_to_my_offers, linked_offer_id, raw_data,
         connection_id, platform_connections(platform, display_name)`,
      )
      .order("last_seen_at", { ascending: false })
      .limit(2000),
  ]);

  // Decorate offers with connection info
  const rows: ExternalOfferRow[] = (offers ?? []).map((o) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const conn = (o as any).platform_connections;
    const platform = (conn?.platform ?? "custom") as PlatformKind;
    return {
      id: o.id,
      platform,
      platform_label: platformLabel(platform),
      connection_name: conn?.display_name ?? "(unknown)",
      platform_offer_id: o.platform_offer_id,
      name: o.name,
      advertiser: o.advertiser,
      vertical: o.vertical,
      payout: o.payout,
      countries: o.countries ?? [],
      status: o.status,
      preview_url: o.preview_url,
      last_seen_at: o.last_seen_at,
      is_active: o.is_active,
      added_to_my_offers: o.added_to_my_offers,
      linked_offer_id: o.linked_offer_id,
      raw_data: o.raw_data,
    };
  });

  const platforms = Array.from(new Set(rows.map((r) => r.platform))) as PlatformKind[];
  const verticals = Array.from(
    new Set(rows.map((r) => r.vertical).filter((v): v is string => !!v)),
  ).sort();

  return (
    <div className="space-y-6">
      <PageTourLauncher tour="externalOffers" />
      <PageHeader
        title="External Offers"
        icon={Globe}
        description="Offers we've pulled from your connected platforms. Filter, browse, and copy any to your own offer catalog with one click."
        meta={`${rows.length} offers · ${(connections ?? []).length} connection${
          (connections ?? []).length === 1 ? "" : "s"
        }`}
      />

      <ConnectionsStrip
        connections={(connections ?? []) as ConnectionCard[]}
      />

      <ExternalOffersTable
        rows={rows}
        platforms={platforms}
        verticals={verticals}
      />
    </div>
  );
}
