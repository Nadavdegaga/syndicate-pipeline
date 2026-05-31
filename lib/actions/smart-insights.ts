"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function dismissInsight(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("smart_insights")
    .update({
      dismissed: true,
      dismissed_at: new Date().toISOString(),
      dismissed_by: user?.id ?? null,
    })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/insights");
  return { ok: true };
}
