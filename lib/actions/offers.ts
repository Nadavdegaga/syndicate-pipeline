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
