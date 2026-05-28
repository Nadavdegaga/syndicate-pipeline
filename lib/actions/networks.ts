"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/actions/activity";

type ActionResult = { ok: true } | { ok: false; error: string };

const TRACKED_FIELDS = [
  "name",
  "tier",
  "login_url",
  "registration_url",
  "registered",
  "linkedin_url",
  "notes",
] as const;
type TrackedField = (typeof TRACKED_FIELDS)[number];

export async function updateNetworkField(
  id: string,
  field: TrackedField,
  value: string | boolean | null,
): Promise<ActionResult> {
  if (!TRACKED_FIELDS.includes(field)) {
    return { ok: false, error: `Field "${field}" is not editable.` };
  }

  const supabase = createClient();
  const { data: prev, error: readErr } = await supabase
    .from("networks")
    .select(field)
    .eq("id", id)
    .maybeSingle();
  if (readErr) return { ok: false, error: readErr.message };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const oldValue = (prev as any)?.[field] ?? null;
  const newValue = value === "" ? null : value;
  if (oldValue === newValue) return { ok: true };

  const patch = { [field]: newValue, updated_at: new Date().toISOString() };
  const { error: upErr } = await supabase.from("networks").update(patch).eq("id", id);
  if (upErr) return { ok: false, error: upErr.message };

  const tracked: Record<string, string> = {
    tier: "tier_changed",
    notes: "note_updated",
    registered: "registration_changed",
  };
  if (tracked[field]) {
    await logActivity({
      entity_type: "network",
      entity_id: id,
      action: `${field}:${tracked[field]}`,
      from_value: oldValue !== null ? String(oldValue) : null,
      to_value: newValue !== null ? String(newValue) : null,
    });
  }

  revalidatePath("/networks");
  revalidatePath(`/networks/${id}`);
  return { ok: true };
}

export async function getNetworkActivity(id: string, limit = 20) {
  const supabase = createClient();
  const { data } = await supabase
    .from("activity_log")
    .select("id, action, from_value, to_value, actor_id, brand_context, created_at")
    .eq("entity_type", "network")
    .eq("entity_id", id)
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}
