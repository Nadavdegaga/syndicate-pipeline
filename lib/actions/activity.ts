import { createClient } from "@/lib/supabase/server";
import type { Brand } from "@/types";

export type EntityType = "contact" | "network" | "offer" | "wishlist" | "demand";

type LogParams = {
  entity_type: EntityType;
  entity_id: string;
  action: string;
  from_value?: string | null;
  to_value?: string | null;
  brand?: Brand;
};

function brandForLog(b: Brand | undefined): "nomi" | "startech" | "luminarix" | null {
  if (!b || b === "all") return null;
  return b;
}

/**
 * Log an entry to the activity_log table. Best-effort: errors are swallowed
 * because logging failures must never block the underlying mutation.
 */
export async function logActivity(params: LogParams): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const payload = {
    entity_type: params.entity_type,
    entity_id: params.entity_id,
    action: params.action,
    from_value: params.from_value ?? null,
    to_value: params.to_value ?? null,
    actor_id: user?.id ?? null,
    brand_context: brandForLog(params.brand),
  };

  const { error } = await supabase.from("activity_log").insert(payload);
  if (error) {
    // Don't throw — surface in dev console only.
    console.warn("activity_log insert failed:", error.message);
  }
}
