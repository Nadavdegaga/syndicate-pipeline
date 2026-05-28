import Anthropic from "@anthropic-ai/sdk";
import { QUERY_TOOLS, type ToolName } from "./queries";

export const ASK_MODEL = "claude-sonnet-4-6";
const MAX_TOOL_CALLS = 3;

export type AskAnswer = {
  answer: string;
  tool_calls: { name: string; input: unknown; result: unknown }[];
  input_tokens: number;
  output_tokens: number;
};

const tools: Anthropic.Messages.Tool[] = [
  {
    name: "count_contacts_by_status",
    description:
      "Count contacts whose status (for the given brand) contains a substring. Use for questions like 'how many leads are Pending', 'how many are LD'.",
    input_schema: {
      type: "object",
      properties: {
        brand: {
          type: "string",
          enum: ["all", "nomi", "startech", "luminarix"],
          description: "Brand whose status column to look in",
        },
        status_contains: {
          type: "string",
          description:
            "Free-form substring to look for in the status text (case-insensitive). e.g. 'Pending', 'Sent', 'LD'.",
        },
        min_days_in_status: {
          type: "number",
          description:
            "Optional: only count contacts whose status hasn't been updated for at least this many days.",
        },
      },
      required: ["brand", "status_contains"],
    },
  },
  {
    name: "count_contacts_by_network",
    description:
      "Group contacts by network, with optional filters on brand status, status substring, and network tier. Use for 'which networks have the most contacts', 'how many contacts at QuinStreet'.",
    input_schema: {
      type: "object",
      properties: {
        brand: { type: "string", enum: ["all", "nomi", "startech", "luminarix"] },
        status_contains: { type: "string" },
        tier: { type: "string", enum: ["A", "B", "C"] },
      },
    },
  },
  {
    name: "count_offers_by_vertical",
    description:
      "Count offers grouped by vertical. Optional filter by offer status. Use for 'how many auto-insurance offers do we have', 'which verticals dominate'.",
    input_schema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          description: "Filter offers by status enum (active, needs_proof, etc.)",
        },
      },
    },
  },
  {
    name: "count_offers_by_network",
    description:
      "Count offers grouped by network. Use for 'which networks gave us the most offers', 'top offer suppliers'.",
    input_schema: {
      type: "object",
      properties: {
        min_count: {
          type: "number",
          description: "Only include networks with at least this many offers.",
        },
      },
    },
  },
  {
    name: "find_stale_contacts",
    description:
      "Find contacts that haven't been touched in a while (last_touch_at older than N days or NULL). Use for 'who haven't I talked to in 3 weeks', 'who needs follow-up'.",
    input_schema: {
      type: "object",
      properties: {
        brand: { type: "string", enum: ["all", "nomi", "startech", "luminarix"] },
        days_since_touch_min: { type: "number" },
        status_contains: { type: "string" },
      },
      required: ["brand", "days_since_touch_min"],
    },
  },
  {
    name: "pipeline_funnel",
    description:
      "Return contact counts at each pipeline stage (Cold, Pending, Sent, In Conversation, Approved, Working) for the given brand. Use for funnel/conversion questions.",
    input_schema: {
      type: "object",
      properties: {
        brand: { type: "string", enum: ["all", "nomi", "startech", "luminarix"] },
      },
      required: ["brand"],
    },
  },
  {
    name: "top_publishers_by_wishlist_count",
    description:
      "List publishers ranked by how many wishlist items they have. Use for 'most demanding publishers', 'who keeps asking for stuff'.",
    input_schema: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Default 10, max 50" },
      },
    },
  },
  {
    name: "vertical_demand_summary",
    description:
      "Summary of open network-demand items grouped by vertical. Use for 'which verticals do networks need traffic for'.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "recent_activity",
    description:
      "Recent entries from the activity log. Optional filters: entity_type, days back, limit. Use for 'what changed today', 'recent status updates'.",
    input_schema: {
      type: "object",
      properties: {
        entity_type: {
          type: "string",
          enum: ["contact", "network", "offer", "wishlist", "demand"],
        },
        days: { type: "number" },
        limit: { type: "number" },
      },
    },
  },
  {
    name: "network_health",
    description:
      "Per-network summary: contacts, offers, last touch, registration. Optional tier filter. Use for 'how are my A-tier networks doing', 'which networks are healthy'.",
    input_schema: {
      type: "object",
      properties: {
        tier: { type: "string", enum: ["A", "B", "C"] },
      },
    },
  },
  {
    name: "conversion_rate_between_statuses",
    description:
      "Approximate conversion rate: of contacts ever in from_status, how many are now in to_status. Use for 'conversion rate from Pending to Approved'.",
    input_schema: {
      type: "object",
      properties: {
        brand: { type: "string", enum: ["nomi", "startech", "luminarix"] },
        from_status: { type: "string" },
        to_status: { type: "string" },
      },
      required: ["brand", "from_status", "to_status"],
    },
  },
  {
    name: "find_orphan_records",
    description:
      "Find records with missing foreign keys (data hygiene). table: contacts (no network_id), offers (no network_id), wishlists (no matched_offer_id), demand (no network_id).",
    input_schema: {
      type: "object",
      properties: {
        table: {
          type: "string",
          enum: ["contacts", "offers", "wishlists", "demand"],
        },
      },
      required: ["table"],
    },
  },
];

const SYSTEM_PROMPT = `You are the analytics assistant inside Syndicate Pipeline, a multi-user CRM + BI workspace for three affiliate-marketing brands: Nomi Media, StarTech, and Luminarix. Each brand contacts the same pool of networks and publishers independently.

You have read-only access to the database via a fixed set of query tools. You CANNOT write data. Use one or more of the provided tools to answer the user's question with real numbers, never make up figures.

Data shape you should keep in mind:
- contacts (1,044 rows) have three status columns: status_nomi, status_startech, status_luminarix. Status text is FREE-FORM (e.g. "Pending", "Sent", "LD - 19/05/26", "Approved", "Followed up", "Second option", "Cold - dormant", "Internal", "Needs proof").
- networks (91 rows) have a tier (A/B/C/null), contact_count, offer_count.
- offers (231 rows) have a vertical (Auto insurance, Home, Solar, Mortgage, etc.) and a status enum.
- publisher_wishlists (343 rows) are things publishers asked us to find.
- network_demand (615 rows) are offers networks need traffic for.

The active brand is provided to you as context — if the user asks a brand-agnostic question, use "all". If they reference a specific brand, scope to it.

Guidelines:
- Pick ONE tool that best answers the question. Only call additional tools if absolutely needed (max 3).
- Be concise (2–4 sentences). State the number first, then the most useful context. If the result is a list, summarize the top 3-5.
- If a tool returns 0 / empty, say so plainly — don't invent reasons.
- Suggest follow-up questions only if natural (e.g. "Want me to break that down by network?").`;

export async function runAsk(
  question: string,
  activeBrand: "all" | "nomi" | "startech" | "luminarix",
): Promise<AskAnswer> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return {
      answer:
        "ANTHROPIC_API_KEY is not set. Add it to .env.local and restart the dev server.",
      tool_calls: [],
      input_tokens: 0,
      output_tokens: 0,
    };
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const messages: Anthropic.Messages.MessageParam[] = [
    {
      role: "user",
      content: `Active brand context: ${activeBrand}\n\nQuestion: ${question}`,
    },
  ];

  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  const toolCallLog: AskAnswer["tool_calls"] = [];
  let loops = 0;

  while (loops < MAX_TOOL_CALLS + 1) {
    loops++;
    const response = await client.messages.create({
      model: ASK_MODEL,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools,
      messages,
    });
    totalInputTokens += response.usage.input_tokens;
    totalOutputTokens += response.usage.output_tokens;

    if (response.stop_reason === "tool_use") {
      const toolUses = response.content.filter(
        (c): c is Anthropic.Messages.ToolUseBlock => c.type === "tool_use",
      );
      messages.push({ role: "assistant", content: response.content });
      const toolResults: Anthropic.Messages.ToolResultBlockParam[] = [];
      for (const tu of toolUses) {
        const fn = QUERY_TOOLS[tu.name as ToolName];
        let result: unknown;
        try {
          if (!fn) {
            result = { error: `Unknown tool ${tu.name}` };
          } else {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            result = await (fn as any)(tu.input);
          }
        } catch (e) {
          result = { error: e instanceof Error ? e.message : String(e) };
        }
        toolCallLog.push({ name: tu.name, input: tu.input, result });
        toolResults.push({
          type: "tool_result",
          tool_use_id: tu.id,
          content: JSON.stringify(result),
        });
      }
      messages.push({ role: "user", content: toolResults });
      continue;
    }

    // end_turn — extract text
    const textParts = response.content
      .filter((c): c is Anthropic.Messages.TextBlock => c.type === "text")
      .map((c) => c.text)
      .join("\n");
    return {
      answer: textParts || "(no answer)",
      tool_calls: toolCallLog,
      input_tokens: totalInputTokens,
      output_tokens: totalOutputTokens,
    };
  }

  return {
    answer:
      "I needed too many tool calls to answer that. Try asking a simpler question or breaking it into parts.",
    tool_calls: toolCallLog,
    input_tokens: totalInputTokens,
    output_tokens: totalOutputTokens,
  };
}
