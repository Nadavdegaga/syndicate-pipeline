import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NetworkDetailClient } from "@/components/networks/NetworkDetailClient";
import type {
  NetworkWithActivityRow,
  ContactRow,
  OfferRow,
  DemandRow,
} from "@/lib/supabase/types";

export default async function NetworkDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();

  const [networkRes, contactsRes, offersRes, demandRes] = await Promise.all([
    supabase
      .from("v_networks_with_activity")
      .select("*")
      .eq("id", params.id)
      .maybeSingle(),
    supabase
      .from("contacts")
      .select("*")
      .eq("network_id", params.id)
      .order("last_touch_at", { ascending: false, nullsFirst: false }),
    supabase
      .from("offers")
      .select("*")
      .eq("network_id", params.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("network_demand")
      .select("*")
      .eq("network_id", params.id)
      .order("created_at", { ascending: false }),
  ]);

  if (!networkRes.data) notFound();

  return (
    <NetworkDetailClient
      network={networkRes.data as NetworkWithActivityRow}
      contacts={(contactsRes.data ?? []) as ContactRow[]}
      offers={(offersRes.data ?? []) as OfferRow[]}
      demand={(demandRes.data ?? []) as DemandRow[]}
    />
  );
}
