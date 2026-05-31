"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { encrypt } from "@/lib/crypto";
import { logActivity } from "@/lib/actions/activity";
import type { PlatformKind } from "@/lib/platforms/registry";

export type ConnectionInput = {
  platform: PlatformKind;
  display_name: string;
  base_url: string;
  api_key: string;
  api_secret?: string;
  extra_config?: Record<string, unknown>;
  sync_frequency_hours: 12 | 24 | 48;
};

export async function createConnection(
  input: ConnectionInput,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  if (!input.display_name?.trim()) {
    return { ok: false, error: "Display name is required" };
  }
  if (!input.api_key?.trim()) {
    return { ok: false, error: "API key is required" };
  }
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let apiKeyEnc: string;
  let apiSecretEnc: string | null = null;
  try {
    apiKeyEnc = encrypt(input.api_key);
    if (input.api_secret) apiSecretEnc = encrypt(input.api_secret);
  } catch (e) {
    return {
      ok: false,
      error:
        "Encryption failed — is ENCRYPTION_KEY set? " +
        (e instanceof Error ? e.message : String(e)),
    };
  }

  const { data, error } = await supabase
    .from("platform_connections")
    .insert({
      platform: input.platform,
      display_name: input.display_name.trim(),
      base_url: input.base_url ?? "",
      api_key_encrypted: apiKeyEnc,
      api_secret_encrypted: apiSecretEnc,
      extra_config: input.extra_config ?? {},
      sync_frequency_hours: input.sync_frequency_hours,
      created_by: user?.id ?? null,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };

  revalidatePath("/external-offers");
  revalidatePath("/external-offers/connections");
  return { ok: true, id: data.id };
}

export async function updateConnection(
  id: string,
  patch: Partial<{
    display_name: string;
    base_url: string;
    api_key: string;
    api_secret: string | null;
    extra_config: Record<string, unknown>;
    sync_frequency_hours: 12 | 24 | 48;
    active: boolean;
  }>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createClient();
  const update: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (patch.display_name !== undefined) update.display_name = patch.display_name;
  if (patch.base_url !== undefined) update.base_url = patch.base_url;
  if (patch.extra_config !== undefined) update.extra_config = patch.extra_config;
  if (patch.sync_frequency_hours !== undefined)
    update.sync_frequency_hours = patch.sync_frequency_hours;
  if (patch.active !== undefined) update.active = patch.active;

  try {
    if (patch.api_key !== undefined && patch.api_key !== "") {
      update.api_key_encrypted = encrypt(patch.api_key);
    }
    if (patch.api_secret !== undefined) {
      update.api_secret_encrypted =
        patch.api_secret === null || patch.api_secret === ""
          ? null
          : encrypt(patch.api_secret);
    }
  } catch (e) {
    return {
      ok: false,
      error:
        "Encryption failed: " + (e instanceof Error ? e.message : String(e)),
    };
  }

  const { error } = await supabase
    .from("platform_connections")
    .update(update)
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/external-offers");
  revalidatePath("/external-offers/connections");
  return { ok: true };
}

export async function deleteConnection(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createClient();
  const { error } = await supabase
    .from("platform_connections")
    .delete()
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/external-offers");
  revalidatePath("/external-offers/connections");
  return { ok: true };
}

/** Copy an external_offer into the canonical `offers` table. */
export async function addExternalOfferToMyOffers(
  externalOfferId: string,
): Promise<{ ok: true; offer_id: string } | { ok: false; error: string }> {
  const supabase = createClient();
  // Fetch the external offer + its connection's display_name (used as fallback network_name)
  const { data: ext } = await supabase
    .from("external_offers")
    .select(
      "id, name, advertiser, vertical, payout, preview_url, status, connection_id, added_to_my_offers, linked_offer_id, platform_connections(display_name)",
    )
    .eq("id", externalOfferId)
    .maybeSingle();
  if (!ext) return { ok: false, error: "External offer not found" };
  if (ext.added_to_my_offers && ext.linked_offer_id) {
    return { ok: true, offer_id: ext.linked_offer_id };
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const networkName: string | null = (ext as any).platform_connections
    ?.display_name ?? ext.advertiser ?? null;

  // Find or create network by name
  let networkId: string | null = null;
  if (networkName) {
    const { data: existing } = await supabase
      .from("networks")
      .select("id")
      .ilike("name", networkName)
      .limit(1)
      .maybeSingle();
    if (existing) {
      networkId = existing.id;
    } else {
      const { data: created } = await supabase
        .from("networks")
        .insert({ name: networkName, source: "external" })
        .select("id")
        .single();
      networkId = created?.id ?? null;
    }
  }

  // Map external status to our offers.status enum
  const status: "active" | "needs_traffic" | "paused" | "dead" = "active";

  const { data: newOffer, error } = await supabase
    .from("offers")
    .insert({
      name: ext.name,
      network_id: networkId,
      network_name: networkName,
      vertical: ext.vertical ?? null,
      payout: ext.payout ?? null,
      preview_link: ext.preview_url ?? null,
      status,
      source: "external",
    })
    .select("id")
    .single();
  if (error || !newOffer) {
    return { ok: false, error: error?.message ?? "Insert failed" };
  }

  await supabase
    .from("external_offers")
    .update({
      added_to_my_offers: true,
      linked_offer_id: newOffer.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", externalOfferId);

  await logActivity({
    entity_type: "offer",
    entity_id: newOffer.id,
    action: "created",
    to_value: `${ext.name} (from external)`,
  });

  revalidatePath("/external-offers");
  revalidatePath("/offers");
  return { ok: true, offer_id: newOffer.id };
}
