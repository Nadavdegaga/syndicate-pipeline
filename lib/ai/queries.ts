import { createClient } from "@/lib/supabase/server";
import { activeStatusFields } from "@/lib/utils/brand";
import type { Brand } from "@/types";

type AppBrand = Brand;

function orStatus(fields: string[], pattern: string): string {
  return fields.map((f) => `${f}.ilike.%${pattern}%`).join(",");
}

export const QUERY_TOOLS = {
  async count_contacts_by_status(params: {
    brand: AppBrand;
    status_contains: string;
    min_days_in_status?: number;
  }) {
    const supabase = createClient();
    const fields = activeStatusFields(params.brand);
    let q = supabase
      .from("contacts")
      .select("id", { count: "exact", head: true })
      .or(orStatus(fields, params.status_contains));
    if (params.min_days_in_status) {
      const d = new Date();
      d.setDate(d.getDate() - params.min_days_in_status);
      q = q.lte("updated_at", d.toISOString());
    }
    const { count, error } = await q;
    if (error) return { error: error.message };
    return {
      brand: params.brand,
      status_contains: params.status_contains,
      min_days_in_status: params.min_days_in_status ?? null,
      count: count ?? 0,
    };
  },

  async count_contacts_by_network(params: {
    brand?: AppBrand;
    status_contains?: string;
    tier?: "A" | "B" | "C";
  }) {
    const supabase = createClient();
    // Use v_contacts_with_age which has network_name_lookup + network_tier
    let q = supabase.from("v_contacts_with_age").select(
      "network_id, network_name_lookup, network_tier, status_nomi, status_startech, status_luminarix",
    );
    if (params.tier) q = q.eq("network_tier", params.tier);
    if (params.status_contains && params.brand) {
      const fields = activeStatusFields(params.brand);
      q = q.or(orStatus(fields, params.status_contains));
    }
    const { data, error } = await q.limit(5000);
    if (error) return { error: error.message };
    const buckets = new Map<string, { name: string; tier: string | null; count: number }>();
    for (const row of data ?? []) {
      const id = row.network_id ?? "no_network";
      const name = row.network_name_lookup ?? "(No network)";
      const tier = row.network_tier ?? null;
      const prev = buckets.get(id) ?? { name, tier, count: 0 };
      prev.count += 1;
      buckets.set(id, prev);
    }
    return {
      brand: params.brand ?? null,
      status_contains: params.status_contains ?? null,
      tier: params.tier ?? null,
      results: Array.from(buckets.entries())
        .map(([id, v]) => ({ network_id: id, ...v }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 50),
    };
  },

  async count_offers_by_vertical(params: { status?: string }) {
    const supabase = createClient();
    let q = supabase.from("offers").select("vertical, status");
    if (params.status) q = q.eq("status", params.status);
    const { data, error } = await q.limit(5000);
    if (error) return { error: error.message };
    const buckets = new Map<string, number>();
    for (const r of data ?? []) {
      const v = (r.vertical ?? "Unspecified").trim() || "Unspecified";
      buckets.set(v, (buckets.get(v) ?? 0) + 1);
    }
    return {
      status_filter: params.status ?? null,
      results: Array.from(buckets.entries())
        .map(([vertical, count]) => ({ vertical, count }))
        .sort((a, b) => b.count - a.count),
    };
  },

  async count_offers_by_network(params: { min_count?: number }) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("offers")
      .select("network_id, network_name")
      .limit(5000);
    if (error) return { error: error.message };
    const buckets = new Map<string, { name: string; count: number }>();
    for (const r of data ?? []) {
      const id = r.network_id ?? "no_network";
      const name = r.network_name ?? "(No network)";
      const prev = buckets.get(id) ?? { name, count: 0 };
      prev.count += 1;
      buckets.set(id, prev);
    }
    const min = params.min_count ?? 1;
    return {
      min_count: min,
      results: Array.from(buckets.entries())
        .map(([id, v]) => ({ network_id: id, ...v }))
        .filter((r) => r.count >= min)
        .sort((a, b) => b.count - a.count)
        .slice(0, 50),
    };
  },

  async find_stale_contacts(params: {
    brand: AppBrand;
    days_since_touch_min: number;
    status_contains?: string;
  }) {
    const supabase = createClient();
    const fields = activeStatusFields(params.brand);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - params.days_since_touch_min);

    let q = supabase
      .from("contacts")
      .select("id, name, company, role, last_touch_at, status_nomi, status_startech, status_luminarix")
      .or(`last_touch_at.lte.${cutoff.toISOString()},last_touch_at.is.null`)
      .limit(50);
    if (params.status_contains) q = q.or(orStatus(fields, params.status_contains));
    const { data, error } = await q;
    if (error) return { error: error.message };
    return {
      brand: params.brand,
      days_since_touch_min: params.days_since_touch_min,
      status_contains: params.status_contains ?? null,
      count: data?.length ?? 0,
      sample: (data ?? []).slice(0, 20).map((r) => ({
        id: r.id,
        name: r.name,
        company: r.company,
        role: r.role,
        last_touch_at: r.last_touch_at,
        status: params.brand === "nomi"
          ? r.status_nomi
          : params.brand === "startech"
            ? r.status_startech
            : params.brand === "luminarix"
              ? r.status_luminarix
              : null,
      })),
    };
  },

  async pipeline_funnel(params: { brand: AppBrand }) {
    const supabase = createClient();
    const fields = activeStatusFields(params.brand);
    const stages = [
      { stage: "Cold", subs: ["Cold", "Dormant"] },
      { stage: "Pending", subs: ["Pending"] },
      { stage: "Sent", subs: ["Sent"] },
      { stage: "In Conversation", subs: ["LD", "TG", "Talking", "Process"] },
      { stage: "Approved", subs: ["Approved"] },
      { stage: "Working", subs: ["Working"] },
    ];
    const results = await Promise.all(
      stages.map(async (s) => {
        const orParts: string[] = [];
        for (const sub of s.subs) for (const f of fields) orParts.push(`${f}.ilike.%${sub}%`);
        const { count } = await supabase
          .from("contacts")
          .select("id", { count: "exact", head: true })
          .or(orParts.join(","));
        return { stage: s.stage, count: count ?? 0 };
      }),
    );
    return { brand: params.brand, stages: results };
  },

  async top_publishers_by_wishlist_count(params: { limit?: number }) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("publisher_wishlists")
      .select("publisher_name");
    if (error) return { error: error.message };
    const buckets = new Map<string, number>();
    for (const r of data ?? []) {
      const name = (r.publisher_name ?? "(unknown)").trim();
      buckets.set(name, (buckets.get(name) ?? 0) + 1);
    }
    const limit = params.limit ?? 10;
    return {
      limit,
      results: Array.from(buckets.entries())
        .map(([publisher, count]) => ({ publisher, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, limit),
    };
  },

  async vertical_demand_summary() {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("network_demand")
      .select("vertical, status")
      .eq("status", "open");
    if (error) return { error: error.message };
    const buckets = new Map<string, number>();
    for (const r of data ?? []) {
      const v = (r.vertical ?? "Unspecified").trim() || "Unspecified";
      buckets.set(v, (buckets.get(v) ?? 0) + 1);
    }
    return {
      results: Array.from(buckets.entries())
        .map(([vertical, open_demand_count]) => ({ vertical, open_demand_count }))
        .sort((a, b) => b.open_demand_count - a.open_demand_count),
    };
  },

  async recent_activity(params: {
    entity_type?: "contact" | "network" | "offer" | "wishlist" | "demand";
    days?: number;
    limit?: number;
  }) {
    const supabase = createClient();
    let q = supabase
      .from("activity_log")
      .select("id, entity_type, entity_id, action, from_value, to_value, brand_context, created_at")
      .order("created_at", { ascending: false })
      .limit(params.limit ?? 20);
    if (params.entity_type) q = q.eq("entity_type", params.entity_type);
    if (params.days) {
      const d = new Date();
      d.setDate(d.getDate() - params.days);
      q = q.gte("created_at", d.toISOString());
    }
    const { data, error } = await q;
    if (error) return { error: error.message };
    return {
      entity_type: params.entity_type ?? null,
      days: params.days ?? null,
      limit: params.limit ?? 20,
      results: data ?? [],
    };
  },

  async network_health(params: { tier?: "A" | "B" | "C" }) {
    const supabase = createClient();
    let q = supabase
      .from("v_networks_with_activity")
      .select("id, name, tier, contact_count, offer_count, last_contact_touch_at, registered")
      .order("contact_count", { ascending: false })
      .limit(50);
    if (params.tier) q = q.eq("tier", params.tier);
    const { data, error } = await q;
    if (error) return { error: error.message };
    return {
      tier_filter: params.tier ?? null,
      results: data ?? [],
    };
  },

  async conversion_rate_between_statuses(params: {
    brand: AppBrand;
    from_status: string;
    to_status: string;
  }) {
    const supabase = createClient();
    const fieldName =
      params.brand === "nomi"
        ? "status_nomi"
        : params.brand === "startech"
          ? "status_startech"
          : "status_luminarix";
    // Contacts ever in from_status (look in activity_log)
    const { data: fromLogs } = await supabase
      .from("activity_log")
      .select("entity_id, to_value")
      .eq("entity_type", "contact")
      .eq("action", `${fieldName}:status_changed`)
      .ilike("to_value", `%${params.from_status}%`);
    const everFrom = new Set((fromLogs ?? []).map((r) => r.entity_id));
    // Of those, which are now in to_status
    if (everFrom.size === 0)
      return {
        brand: params.brand,
        from_status: params.from_status,
        to_status: params.to_status,
        ever_from_count: 0,
        transitioned_count: 0,
        rate_pct: null,
      };
    const ids = Array.from(everFrom);
    const { data: current } = await supabase
      .from("contacts")
      .select(`id, ${fieldName}`)
      .in("id", ids);
    const transitioned = (current ?? []).filter((r) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const v: string | null = (r as any)[fieldName];
      return v && v.toLowerCase().includes(params.to_status.toLowerCase());
    }).length;
    return {
      brand: params.brand,
      from_status: params.from_status,
      to_status: params.to_status,
      ever_from_count: everFrom.size,
      transitioned_count: transitioned,
      rate_pct: Math.round((transitioned / everFrom.size) * 10000) / 100,
    };
  },

  async find_orphan_records(params: {
    table: "contacts" | "offers" | "wishlists" | "demand";
  }) {
    const supabase = createClient();
    let count = 0;
    let sample: unknown[] = [];
    let label = "";
    if (params.table === "contacts") {
      label = "contacts with no network_id";
      const { data, count: c } = await supabase
        .from("contacts")
        .select("id, name, company, channel", { count: "exact" })
        .is("network_id", null)
        .limit(10);
      count = c ?? 0;
      sample = data ?? [];
    } else if (params.table === "offers") {
      label = "offers with no network_id";
      const { data, count: c } = await supabase
        .from("offers")
        .select("id, name, network_name", { count: "exact" })
        .is("network_id", null)
        .limit(10);
      count = c ?? 0;
      sample = data ?? [];
    } else if (params.table === "wishlists") {
      label = "wishlists with no matched_offer_id";
      const { data, count: c } = await supabase
        .from("publisher_wishlists")
        .select("id, publisher_name, requested_offer", { count: "exact" })
        .is("matched_offer_id", null)
        .limit(10);
      count = c ?? 0;
      sample = data ?? [];
    } else if (params.table === "demand") {
      label = "demand items with no network_id";
      const { data, count: c } = await supabase
        .from("network_demand")
        .select("id, offer_name, network_name", { count: "exact" })
        .is("network_id", null)
        .limit(10);
      count = c ?? 0;
      sample = data ?? [];
    }
    return { table: params.table, label, count, sample };
  },
};

export type ToolName = keyof typeof QUERY_TOOLS;
