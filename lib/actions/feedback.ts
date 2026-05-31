"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import type { Brand } from "@/types";

export type FeedbackCategory =
  | "bug"
  | "confusion"
  | "missing_feature"
  | "suggestion"
  | "other";

export type FeedbackStatus =
  | "open"
  | "reviewing"
  | "planned"
  | "done"
  | "wontfix";

export type FeedbackRow = {
  id: string;
  user_id: string;
  user_email?: string | null;
  category: FeedbackCategory;
  page_url: string | null;
  brand_context: string | null;
  message: string;
  status: FeedbackStatus;
  admin_notes: string | null;
  created_at: string;
  resolved_at: string | null;
};

function brandForLog(b: Brand | undefined): "nomi" | "startech" | "luminarix" | null {
  if (!b || b === "all") return null;
  return b;
}

export async function createFeedback(input: {
  category: FeedbackCategory;
  message: string;
  page_url?: string;
  brand?: Brand;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  if (!input.message?.trim()) return { ok: false, error: "Message is required" };
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const { data, error } = await supabase
    .from("feedback")
    .insert({
      user_id: user.id,
      category: input.category,
      message: input.message.trim(),
      page_url: input.page_url ?? null,
      brand_context: brandForLog(input.brand),
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  revalidatePath("/settings/feedback");
  return { ok: true, id: data.id };
}

export async function listFeedback(filters?: {
  status?: FeedbackStatus | "all";
  category?: FeedbackCategory | "all";
  user_id?: string;
}): Promise<FeedbackRow[]> {
  const supabase = createClient();
  let q = supabase
    .from("feedback")
    .select("id, user_id, category, page_url, brand_context, message, status, admin_notes, created_at, resolved_at")
    .order("created_at", { ascending: false });

  if (filters?.status && filters.status !== "all") q = q.eq("status", filters.status);
  if (filters?.category && filters.category !== "all") q = q.eq("category", filters.category);
  if (filters?.user_id) q = q.eq("user_id", filters.user_id);

  const { data } = await q.limit(500);
  const rows = (data ?? []) as FeedbackRow[];

  // Decorate with user email (service role needed for admin.listUsers)
  const userIds = Array.from(new Set(rows.map((r) => r.user_id)));
  const emailMap = new Map<string, string>();
  if (userIds.length) {
    const service = createServiceClient();
    const { data: users } = await service.auth.admin.listUsers();
    for (const u of users.users) {
      if (userIds.includes(u.id)) emailMap.set(u.id, u.email ?? "");
    }
  }
  return rows.map((r) => ({ ...r, user_email: emailMap.get(r.user_id) ?? null }));
}

export async function countOpenFeedback(): Promise<number> {
  const supabase = createClient();
  const { count } = await supabase
    .from("feedback")
    .select("id", { count: "exact", head: true })
    .eq("status", "open");
  return count ?? 0;
}

export async function updateFeedbackStatus(
  id: string,
  status: FeedbackStatus,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createClient();
  const patch: Record<string, unknown> = { status };
  if (status === "done" || status === "wontfix") {
    patch.resolved_at = new Date().toISOString();
  } else {
    patch.resolved_at = null;
  }
  const { error } = await supabase.from("feedback").update(patch).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/settings/feedback");
  return { ok: true };
}

export async function updateFeedbackNotes(
  id: string,
  notes: string | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createClient();
  const { error } = await supabase
    .from("feedback")
    .update({ admin_notes: notes && notes.trim() ? notes.trim() : null })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/settings/feedback");
  return { ok: true };
}
