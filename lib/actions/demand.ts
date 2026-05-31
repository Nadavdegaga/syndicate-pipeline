"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/actions/activity";

export async function createDemand(payload: {
  network_id?: string | null;
  network_name?: string;
  offer_name: string;
  vertical?: string;
  link?: string;
  payout?: string;
  status?: "open" | "covered" | "paused";
  notes?: string;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  if (!payload.offer_name?.trim()) {
    return { ok: false, error: "Offer name is required." };
  }
  const supabase = createClient();

  // Resolve network_name from network_id if provided
  let networkName = payload.network_name?.trim() || null;
  if (!networkName && payload.network_id) {
    const { data: n } = await supabase
      .from("networks")
      .select("name")
      .eq("id", payload.network_id)
      .maybeSingle();
    networkName = n?.name ?? null;
  }
  const insert = {
    network_id: payload.network_id || null,
    network_name: networkName,
    offer_name: payload.offer_name.trim(),
    vertical: payload.vertical || null,
    link: payload.link || null,
    payout: payload.payout || null,
    status: payload.status || "open",
    notes: payload.notes || null,
  };
  const { data, error } = await supabase
    .from("network_demand")
    .insert(insert)
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };

  await logActivity({
    entity_type: "demand",
    entity_id: data.id,
    action: "created",
    to_value: insert.offer_name,
  });
  revalidatePath("/demand");
  return { ok: true, id: data.id };
}
