"use server";

import { createClient } from "@/lib/supabase/server";
import { activeStatusFields } from "@/lib/utils/brand";
import { classifyContactStatus } from "@/lib/utils/status";
import type { Brand } from "@/types";

export type KpiTrend = "up" | "down" | "flat" | null;
export type Kpi = {
  label: string;
  value: number;
  hint?: string;
  trend?: KpiTrend;
};

export type StatusBreakdownPoint = { category: string; count: number; color: string };
export type VerticalPoint = { vertical: string; count: number };
export type FunnelPoint = { stage: string; count: number };
export type TopNetworkRow = {
  id: string;
  name: string;
  tier: string | null;
  contact_count: number;
  offer_count: number;
  last_contact_touch_at: string | null;
};
export type ActivityFeedRow = {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  from_value: string | null;
  to_value: string | null;
  brand_context: string | null;
  created_at: string;
};

export type InsightsData = {
  kpis: Kpi[];
  statusBreakdown: StatusBreakdownPoint[];
  verticalDistribution: VerticalPoint[];
  pipelineFunnel: FunnelPoint[];
  topNetworks: TopNetworkRow[];
  recentActivity: ActivityFeedRow[];
};

const CATEGORY_LABEL: Record<string, string> = {
  approved: "Approved / Working",
  talking: "In Conversation",
  followed_up: "Followed up",
  second_option: "Second option",
  sent: "Sent",
  pending: "Pending",
  needs_proof: "Needs proof",
  internal: "Internal",
  cold: "Cold / Dormant",
  unknown: "No status",
};
const CATEGORY_COLOR: Record<string, string> = {
  approved: "#70AD47",
  talking: "#A9D08E",
  followed_up: "#FFD966",
  second_option: "#F4B084",
  sent: "#9DC3E6",
  pending: "#FFE699",
  needs_proof: "#F4CCCC",
  internal: "#B4A7D6",
  cold: "#D9D9D9",
  unknown: "#E2E8F0",
};

export async function getInsightsData(brand: Brand): Promise<InsightsData> {
  const supabase = createClient();
  const fields = activeStatusFields(brand);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // KPI helpers — head:true count queries are cheap
  const countContactsMatchingAny = async (substrings: string[]) => {
    // OR across (any brand status field) × (any substring)
    const orParts: string[] = [];
    for (const sub of substrings) {
      for (const f of fields) orParts.push(`${f}.ilike.%${sub}%`);
    }
    const { count } = await supabase
      .from("contacts")
      .select("id", { count: "exact", head: true })
      .or(orParts.join(","));
    return count ?? 0;
  };

  const [
    activeConversations,
    pendingReplies,
    aTierActiveRes,
    openWishlistsRes,
    contactsForBreakdown,
    offersForVerticals,
    topNetworksRes,
    recentActivityRes,
  ] = await Promise.all([
    countContactsMatchingAny(["LD", "TG", "Talking", "Approved"]),
    countContactsMatchingAny(["Sent", "Pending+Sent"]),
    // A-tier networks with at least one contact touched in last 30 days
    supabase
      .from("networks")
      .select("id, contacts!inner(last_touch_at)", { count: "exact", head: true })
      .eq("tier", "A")
      .gte("contacts.last_touch_at", thirtyDaysAgo.toISOString()),
    supabase
      .from("publisher_wishlists")
      .select("id", { count: "exact", head: true })
      .eq("status", "open"),
    // Status breakdown — fetch only relevant status columns
    supabase
      .from("contacts")
      .select(fields.join(",")),
    // Vertical distribution — offers grouped client-side
    supabase
      .from("offers")
      .select("vertical, status"),
    // Top 10 networks by contact_count
    supabase
      .from("v_networks_with_activity")
      .select("id, name, tier, contact_count, offer_count, last_contact_touch_at")
      .order("contact_count", { ascending: false })
      .limit(10),
    // Recent 20 activity entries
    supabase
      .from("activity_log")
      .select("id, entity_type, entity_id, action, from_value, to_value, brand_context, created_at")
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  // Compute status breakdown by classifying the active brand status(es)
  const buckets: Record<string, number> = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const row of (contactsForBreakdown.data ?? []) as any[]) {
    // When "all", count distinct contacts whose ANY brand status falls in category.
    // When single brand, just that field's category.
    if (brand === "all") {
      // Choose the "highest-signal" classification across the 3 brands
      const cats = fields
        .map((f) => classifyContactStatus(row[f]))
        .filter((c) => c !== "unknown");
      const finalCat = cats[0] ?? "unknown";
      buckets[finalCat] = (buckets[finalCat] ?? 0) + 1;
    } else {
      const cat = classifyContactStatus(row[fields[0]]);
      buckets[cat] = (buckets[cat] ?? 0) + 1;
    }
  }
  const statusBreakdown: StatusBreakdownPoint[] = Object.entries(buckets)
    .filter(([cat]) => cat !== "unknown")
    .map(([cat, count]) => ({
      category: CATEGORY_LABEL[cat] ?? cat,
      count,
      color: CATEGORY_COLOR[cat] ?? "#94a3b8",
    }))
    .sort((a, b) => b.count - a.count);

  // Vertical distribution
  const vBuckets: Record<string, number> = {};
  for (const o of offersForVerticals.data ?? []) {
    const v = (o.vertical ?? "Unspecified").trim() || "Unspecified";
    vBuckets[v] = (vBuckets[v] ?? 0) + 1;
  }
  const verticalDistribution: VerticalPoint[] = Object.entries(vBuckets)
    .map(([vertical, count]) => ({ vertical, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Pipeline funnel — counts at each stage, based on active brand status (or any)
  const stages: { key: string; label: string; substrings: string[] }[] = [
    { key: "cold", label: "Cold", substrings: ["Cold", "Dormant"] },
    { key: "pending", label: "Pending", substrings: ["Pending"] },
    { key: "sent", label: "Sent", substrings: ["Sent"] },
    {
      key: "in_convo",
      label: "In Conversation",
      substrings: ["LD", "TG", "Talking", "Process"],
    },
    { key: "approved", label: "Approved", substrings: ["Approved"] },
    { key: "working", label: "Working", substrings: ["Working"] },
  ];
  const funnelCounts = await Promise.all(
    stages.map(async (s) => {
      const orParts: string[] = [];
      for (const sub of s.substrings) {
        for (const f of fields) orParts.push(`${f}.ilike.%${sub}%`);
      }
      const { count } = await supabase
        .from("contacts")
        .select("id", { count: "exact", head: true })
        .or(orParts.join(","));
      return { stage: s.label, count: count ?? 0 };
    }),
  );

  // KPI A-tier active fallback when the join-based count fails (some Supabase RLS
  // setups don't expose count on inner joins; compute manually if 0/null).
  let aTierActive = aTierActiveRes.count ?? 0;
  if (aTierActive === 0) {
    const { data: aTierNets } = await supabase
      .from("networks")
      .select("id")
      .eq("tier", "A");
    const aIds = (aTierNets ?? []).map((n) => n.id);
    if (aIds.length) {
      const { data: activeContacts } = await supabase
        .from("contacts")
        .select("network_id")
        .in("network_id", aIds)
        .gte("last_touch_at", thirtyDaysAgo.toISOString());
      aTierActive = new Set((activeContacts ?? []).map((c) => c.network_id))
        .size;
    }
  }

  const kpis: Kpi[] = [
    {
      label: "Active Conversations",
      value: activeConversations,
      hint: "LD / TG / Talking / Approved",
    },
    {
      label: "Pending Replies",
      value: pendingReplies,
      hint: "Sent or Pending+Sent",
    },
    {
      label: "A-Tier Networks Active",
      value: aTierActive,
      hint: "≥1 contact touched < 30 days",
    },
    {
      label: "Open Publisher Asks",
      value: openWishlistsRes.count ?? 0,
      hint: "Wishlists awaiting a match",
    },
  ];

  return {
    kpis,
    statusBreakdown,
    verticalDistribution,
    pipelineFunnel: funnelCounts,
    topNetworks: (topNetworksRes.data ?? []) as TopNetworkRow[],
    recentActivity: (recentActivityRes.data ?? []) as ActivityFeedRow[],
  };
}

