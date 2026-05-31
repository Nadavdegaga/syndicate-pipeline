"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/actions/activity";

type ActionResult = { ok: true } | { ok: false; error: string };

const TRACKED_FIELDS = [
  "name",
  "vertical",
  "traffic_sources",
  "payout",
  "preview_link",
  "status",
  "kpi_notes",
  "last_pitched_at",
] as const;
type TrackedField = (typeof TRACKED_FIELDS)[number];

export async function updateOfferField(
  id: string,
  field: TrackedField,
  value: string | null,
): Promise<ActionResult> {
  if (!TRACKED_FIELDS.includes(field)) {
    return { ok: false, error: `Field "${field}" is not editable.` };
  }
  const supabase = createClient();
  const { data: prev, error: readErr } = await supabase
    .from("offers")
    .select(field)
    .eq("id", id)
    .maybeSingle();
  if (readErr) return { ok: false, error: readErr.message };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const oldValue = (prev as any)?.[field] ?? null;
  const newValue = value === "" ? null : value;
  if (oldValue === newValue) return { ok: true };

  const patch = { [field]: newValue, updated_at: new Date().toISOString() };
  const { error } = await supabase.from("offers").update(patch).eq("id", id);
  if (error) return { ok: false, error: error.message };

  const tracked: Record<string, string> = {
    status: "status_changed",
    kpi_notes: "note_updated",
  };
  if (tracked[field]) {
    await logActivity({
      entity_type: "offer",
      entity_id: id,
      action: `${field}:${tracked[field]}`,
      from_value: oldValue !== null ? String(oldValue) : null,
      to_value: newValue !== null ? String(newValue) : null,
    });
  }

  revalidatePath("/offers");
  revalidatePath(`/offers/${id}`);
  return { ok: true };
}

export async function createOffer(payload: {
  name: string;
  network_id?: string | null;
  network_name?: string;
  vertical?: string;
  payout?: string;
  traffic_sources?: string;
  preview_link?: string;
  status?: string;
  kpi_notes?: string;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  if (!payload.name?.trim()) return { ok: false, error: "Name is required." };

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
    name: payload.name.trim(),
    network_id: payload.network_id || null,
    network_name: networkName,
    vertical: payload.vertical || null,
    payout: payload.payout || null,
    traffic_sources: payload.traffic_sources || null,
    preview_link: payload.preview_link || null,
    status: payload.status || "active",
    kpi_notes: payload.kpi_notes || null,
  };
  const { data, error } = await supabase
    .from("offers")
    .insert(insert)
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };

  await logActivity({
    entity_type: "offer",
    entity_id: data.id,
    action: "created",
    to_value: insert.name,
  });
  revalidatePath("/offers");
  return { ok: true, id: data.id };
}

export async function markOfferPitched(id: string): Promise<ActionResult> {
  const supabase = createClient();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("offers")
    .update({ last_pitched_at: now, updated_at: now })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  await logActivity({
    entity_type: "offer",
    entity_id: id,
    action: "marked_pitched",
    to_value: now,
  });
  revalidatePath(`/offers/${id}`);
  return { ok: true };
}

export async function getOfferActivity(id: string, limit = 20) {
  const supabase = createClient();
  const { data } = await supabase
    .from("activity_log")
    .select("id, action, from_value, to_value, actor_id, brand_context, created_at")
    .eq("entity_type", "offer")
    .eq("entity_id", id)
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}
