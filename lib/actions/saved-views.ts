"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type {
  EntityType,
  SavedView,
} from "@/lib/saved-views/defaults";
import type { FilterSpec } from "@/lib/utils/filter";

export async function listSavedViews(entity: EntityType): Promise<SavedView[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("saved_views")
    .select("id, name, entity_type, filters, brand_scope, is_default, created_at")
    .eq("entity_type", entity)
    .order("created_at", { ascending: true });
  return (data ?? []) as SavedView[];
}

export async function createSavedView(input: {
  name: string;
  entity_type: EntityType;
  filters: FilterSpec;
  brand_scope?: string | null;
}): Promise<{ ok: true; view: SavedView } | { ok: false; error: string }> {
  if (!input.name.trim()) return { ok: false, error: "Name is required" };
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const { data, error } = await supabase
    .from("saved_views")
    .insert({
      user_id: user.id,
      name: input.name.trim(),
      entity_type: input.entity_type,
      filters: input.filters,
      brand_scope: input.brand_scope ?? null,
      is_default: false,
    })
    .select()
    .single();
  if (error) return { ok: false, error: error.message };
  revalidatePath("/contacts");
  revalidatePath("/networks");
  revalidatePath("/offers");
  revalidatePath("/wishlists");
  revalidatePath("/demand");
  return { ok: true, view: data as SavedView };
}

export async function deleteSavedView(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createClient();
  const { error } = await supabase.from("saved_views").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/contacts");
  revalidatePath("/networks");
  revalidatePath("/offers");
  revalidatePath("/wishlists");
  revalidatePath("/demand");
  return { ok: true };
}
