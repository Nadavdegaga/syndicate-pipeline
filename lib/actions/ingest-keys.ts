"use server";

import { createHash, randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/** Generate a new API ingest key, store ONLY the sha256 hash, return the plaintext once. */
export async function generateIngestKey(
  label: string,
  scopes: string[] = ["affise"],
): Promise<
  | { ok: true; id: string; plaintext: string }
  | { ok: false; error: string }
> {
  if (!label?.trim()) return { ok: false, error: "Label is required" };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Generate a 32-byte random key with a clear prefix for at-a-glance ID
  const random = randomBytes(32).toString("base64url");
  const plaintext = `syndi_ingest_${random}`;
  const keyHash = createHash("sha256").update(plaintext).digest("hex");

  const { data, error } = await supabase
    .from("api_ingest_keys")
    .insert({
      label: label.trim(),
      key_hash: keyHash,
      scopes,
      created_by: user?.id ?? null,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };

  revalidatePath("/settings/api-keys");
  return { ok: true, id: data.id, plaintext };
}

export async function revokeIngestKey(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createClient();
  const { error } = await supabase
    .from("api_ingest_keys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/settings/api-keys");
  return { ok: true };
}
