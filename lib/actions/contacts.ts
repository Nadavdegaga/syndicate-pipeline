"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/actions/activity";
import type { Brand } from "@/types";

type ActionResult<T = void> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

const STATUS_FIELDS = [
  "status_nomi",
  "status_startech",
  "status_luminarix",
] as const;

const TRACKED_FIELDS = [
  "name",
  "role",
  "company",
  "channel",
  "linkedin_url",
  "telegram",
  "email",
  "other_contact",
  "status_nomi",
  "status_startech",
  "status_luminarix",
  "last_touch_at",
  "next_action_at",
  "notes",
  "assigned_brand",
] as const;

type TrackedField = (typeof TRACKED_FIELDS)[number];

const BRAND_FROM_FIELD: Record<string, Brand> = {
  status_nomi: "nomi",
  status_startech: "startech",
  status_luminarix: "luminarix",
};

export async function updateContactField(
  id: string,
  field: TrackedField,
  value: string | null,
  brand: Brand = "all",
): Promise<ActionResult> {
  if (!TRACKED_FIELDS.includes(field)) {
    return { ok: false, error: `Field "${field}" is not editable.` };
  }

  const supabase = createClient();

  // Fetch old value for activity log
  const { data: prev, error: readErr } = await supabase
    .from("contacts")
    .select(field)
    .eq("id", id)
    .maybeSingle();

  if (readErr) return { ok: false, error: readErr.message };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const oldValue = (prev as any)?.[field] ?? null;
  const newValue = value === "" ? null : value;
  if (oldValue === newValue) return { ok: true };

  const patch = { [field]: newValue, updated_at: new Date().toISOString() };
  const { error: upErr } = await supabase.from("contacts").update(patch).eq("id", id);
  if (upErr) return { ok: false, error: upErr.message };

  // Activity log for the changes the SPEC §22 cares about
  const trackedActions: Record<string, string> = {
    status_nomi: "status_changed",
    status_startech: "status_changed",
    status_luminarix: "status_changed",
    notes: "note_updated",
    next_action_at: "next_action_set",
    last_touch_at: "last_touch_updated",
  };

  const action = trackedActions[field];
  if (action) {
    const brandForLog: Brand =
      (STATUS_FIELDS as readonly string[]).includes(field) && BRAND_FROM_FIELD[field]
        ? BRAND_FROM_FIELD[field]
        : brand;

    await logActivity({
      entity_type: "contact",
      entity_id: id,
      action: `${field}:${action}`,
      from_value: oldValue !== null ? String(oldValue) : null,
      to_value: newValue !== null ? String(newValue) : null,
      brand: brandForLog,
    });
  }

  revalidatePath("/contacts");
  revalidatePath(`/contacts/${id}`);
  return { ok: true };
}

export async function createContact(payload: {
  name: string;
  role?: string;
  company?: string;
  network_id?: string;
  channel?: string;
  email?: string;
  linkedin_url?: string;
  telegram?: string;
  notes?: string;
}): Promise<ActionResult<{ id: string }>> {
  if (!payload.name?.trim()) {
    return { ok: false, error: "Name is required." };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const insert = {
    name: payload.name.trim(),
    role: payload.role || null,
    company: payload.company || null,
    network_id: payload.network_id || null,
    channel: payload.channel || "Unknown",
    email: payload.email || null,
    linkedin_url: payload.linkedin_url || null,
    telegram: payload.telegram || null,
    notes: payload.notes || null,
    created_by: user?.id ?? null,
  };

  const { data, error } = await supabase
    .from("contacts")
    .insert(insert)
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };

  await logActivity({
    entity_type: "contact",
    entity_id: data.id,
    action: "created",
    to_value: insert.name,
  });

  revalidatePath("/contacts");
  return { ok: true, data: { id: data.id } };
}

export async function deleteContact(id: string): Promise<ActionResult> {
  const supabase = createClient();
  const { error } = await supabase.from("contacts").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  await logActivity({
    entity_type: "contact",
    entity_id: id,
    action: "deleted",
  });
  revalidatePath("/contacts");
  return { ok: true };
}

export async function getContactActivity(id: string, limit = 20) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("activity_log")
    .select("id, action, from_value, to_value, actor_id, brand_context, created_at")
    .eq("entity_type", "contact")
    .eq("entity_id", id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return [];
  return data ?? [];
}
