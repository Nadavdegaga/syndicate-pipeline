"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/actions/activity";

export async function createWishlist(payload: {
  publisher_name?: string;
  publisher_contact_id?: string | null;
  requested_offer: string;
  vertical?: string;
  link_or_network?: string;
  status?: "open" | "matched" | "delivered" | "declined";
  notes?: string;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  if (!payload.requested_offer?.trim()) {
    return { ok: false, error: "Requested offer is required." };
  }
  const supabase = createClient();
  const insert = {
    publisher_name: payload.publisher_name || null,
    publisher_contact_id: payload.publisher_contact_id || null,
    requested_offer: payload.requested_offer.trim(),
    vertical: payload.vertical || null,
    link_or_network: payload.link_or_network || null,
    status: payload.status || "open",
    notes: payload.notes || null,
    requested_at: new Date().toISOString(),
  };
  const { data, error } = await supabase
    .from("publisher_wishlists")
    .insert(insert)
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };

  await logActivity({
    entity_type: "wishlist",
    entity_id: data.id,
    action: "created",
    to_value: insert.requested_offer,
  });
  revalidatePath("/wishlists");
  return { ok: true, id: data.id };
}
