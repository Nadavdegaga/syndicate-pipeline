import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runAsk } from "@/lib/ai/claude";
import { getServerBrand } from "@/lib/utils/server-brand";
import type { Brand } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { question?: string; brand?: Brand };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const question = (body.question ?? "").trim();
  if (!question) {
    return NextResponse.json({ error: "question is required" }, { status: 400 });
  }
  const brand: Brand = body.brand ?? getServerBrand();

  const start = Date.now();
  const result = await runAsk(
    question,
    brand === "all" ? "all" : brand,
  );
  const elapsedMs = Date.now() - start;

  // Persist to ask_history (RLS scoped per user)
  await supabase.from("ask_history").insert({
    user_id: user.id,
    question,
    answer: result.answer,
    tool_calls: result.tool_calls,
    input_tokens: result.input_tokens,
    output_tokens: result.output_tokens,
    brand_context: brand === "all" ? null : brand,
  });

  // Note: SPEC §22 mentions logging ai_query to activity_log, but our activity_log
  // is keyed by entity_type+entity_id of real records. Token-usage analytics live
  // in ask_history instead, which is per-user, retains the full prompt + answer,
  // and is what the Settings → API Usage tab will read in Phase 6.

  return NextResponse.json({
    answer: result.answer,
    tool_calls: result.tool_calls,
    input_tokens: result.input_tokens,
    output_tokens: result.output_tokens,
    elapsed_ms: elapsedMs,
  });
}
