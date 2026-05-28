import { MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/PageHeader";
import { AskClient } from "@/components/ask/AskClient";

export const dynamic = "force-dynamic";

export default async function AskPage() {
  const supabase = createClient();
  const { data: history } = await supabase
    .from("ask_history")
    .select("id, question, answer, tool_calls, input_tokens, output_tokens, brand_context, created_at")
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ask"
        icon={MessageCircle}
        description="Natural-language questions answered by Claude using your live data."
        meta="Predefined query tools only — no raw SQL, no hallucinated numbers."
      />
      <AskClient
        initialHistory={
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ((history ?? []) as any[]).map((r) => ({
            ...r,
            tool_calls: Array.isArray(r.tool_calls) ? r.tool_calls : [],
          }))
        }
      />
    </div>
  );
}
