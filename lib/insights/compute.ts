// Smart Insights computation — runs on /insights load.
// Each function detects one insight kind and yields zero or more candidate rows.
// Candidates are upserted into smart_insights with de-dup on (kind, related_*).

import { createClient } from "@/lib/supabase/server";
import { matchScore } from "@/lib/utils/fuzzy";
import { classifyContactStatus } from "@/lib/utils/status";
import { activeStatusFields } from "@/lib/utils/brand";
import type { Brand } from "@/types";

export type InsightKind =
  | "matchmaker_hit"
  | "followup_reminder"
  | "cold_atier"
  | "new_offer_pitch"
  | "pending_too_long"
  | "new_external_offer"
  | "data_quality";

export type InsightCandidate = {
  kind: InsightKind;
  title: string;
  body: string;
  priority: number;
  cta_label?: string;
  cta_href?: string;
  related_entity_type?: string;
  related_entity_id?: string;
  brand_context?: "nomi" | "startech" | "luminarix" | null;
};

const MIN_MATCH_SCORE = 50;
const FOLLOWUP_DAYS = 7;
const COLD_ATIER_DAYS = 30;
const PENDING_DAYS = 14;
const NEW_OFFER_DAYS = 7;
const NEW_EXTERNAL_OFFER_DAYS = 3;
const MAX_PER_KIND = 5;

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function brandForLog(b: Brand): "nomi" | "startech" | "luminarix" | null {
  return b === "all" ? null : b;
}

// ===== Detector functions =====

async function matchmakerHits(): Promise<InsightCandidate[]> {
  const supabase = createClient();
  const [{ data: wishlists }, { data: offers }] = await Promise.all([
    supabase
      .from("publisher_wishlists")
      .select("id, publisher_name, requested_offer, vertical")
      .eq("status", "open")
      .limit(500),
    supabase
      .from("offers")
      .select("id, name, vertical")
      .in("status", ["active", "needs_traffic", "direct"])
      .limit(2000),
  ]);

  const candidates: InsightCandidate[] = [];
  for (const w of wishlists ?? []) {
    let best: { id: string; name: string; score: number } | null = null;
    for (const o of offers ?? []) {
      const s = matchScore(
        { requested_offer: w.requested_offer, vertical: w.vertical },
        { name: o.name, vertical: o.vertical },
      );
      if (s >= MIN_MATCH_SCORE && (!best || s > best.score)) {
        best = { id: o.id, name: o.name, score: s };
      }
    }
    if (best) {
      candidates.push({
        kind: "matchmaker_hit",
        title: `Strong match for ${w.publisher_name ?? "a publisher"}`,
        body: `Their request "${w.requested_offer}" matches offer "${best.name}" with score ${best.score}.`,
        priority: 20,
        cta_label: "Open MatchMaker",
        cta_href: `/matchmaker?wishlist=${w.id}`,
        related_entity_type: "wishlist",
        related_entity_id: w.id,
      });
    }
  }
  return candidates.slice(0, MAX_PER_KIND);
}

async function followupReminders(brand: Brand): Promise<InsightCandidate[]> {
  const supabase = createClient();
  const fields = activeStatusFields(brand);
  const orParts: string[] = [];
  for (const sub of ["Sent", "Pending+Sent"]) {
    for (const f of fields) orParts.push(`${f}.ilike.%${sub}%`);
  }
  const { data } = await supabase
    .from("v_contacts_with_age")
    .select("id, name, company, last_touch_at, status_nomi, status_startech, status_luminarix")
    .or(orParts.join(","))
    .lt("last_touch_at", daysAgo(FOLLOWUP_DAYS))
    .order("last_touch_at", { ascending: true, nullsFirst: false })
    .limit(MAX_PER_KIND);

  return (data ?? []).map((c) => ({
    kind: "followup_reminder" as const,
    title: `Follow up with ${c.name}`,
    body: `You sent and they haven't replied in 7+ days. ${
      c.company ? `(${c.company})` : ""
    }`.trim(),
    priority: 40,
    cta_label: "Open contact",
    cta_href: `/contacts?id=${c.id}`,
    related_entity_type: "contact",
    related_entity_id: c.id,
    brand_context: brandForLog(brand),
  }));
}

async function coldATier(): Promise<InsightCandidate[]> {
  const supabase = createClient();
  // A-tier networks whose newest contact touch is older than 30 days (or no touches at all)
  const { data } = await supabase
    .from("v_networks_with_activity")
    .select("id, name, contact_count, last_contact_touch_at")
    .eq("tier", "A")
    .or(`last_contact_touch_at.lte.${daysAgo(COLD_ATIER_DAYS)},last_contact_touch_at.is.null`)
    .order("last_contact_touch_at", { ascending: true, nullsFirst: true })
    .limit(MAX_PER_KIND);

  return (data ?? []).map((n) => ({
    kind: "cold_atier" as const,
    title: `A-tier untouched: ${n.name}`,
    body: `${n.contact_count} contact${n.contact_count === 1 ? "" : "s"}, last activity ${n.last_contact_touch_at ? "30+ days ago" : "never"}.`,
    priority: 30,
    cta_label: "Open network",
    cta_href: `/networks/${n.id}`,
    related_entity_type: "network",
    related_entity_id: n.id,
  }));
}

async function newOfferPitches(): Promise<InsightCandidate[]> {
  const supabase = createClient();
  // Offers created within 7 days that share a vertical with at least one open wishlist
  const [{ data: offers }, { data: wishlists }] = await Promise.all([
    supabase
      .from("offers")
      .select("id, name, vertical")
      .gte("created_at", daysAgo(NEW_OFFER_DAYS))
      .in("status", ["active", "needs_traffic", "direct"])
      .limit(50),
    supabase
      .from("publisher_wishlists")
      .select("vertical")
      .eq("status", "open")
      .not("vertical", "is", null)
      .limit(500),
  ]);
  const wishVerticals = new Set(
    (wishlists ?? []).map((w) => (w.vertical ?? "").toLowerCase()),
  );

  const candidates: InsightCandidate[] = [];
  for (const o of offers ?? []) {
    if (!o.vertical) continue;
    const match = wishVerticals.has(o.vertical.toLowerCase());
    if (!match) continue;
    candidates.push({
      kind: "new_offer_pitch",
      title: `New offer to pitch: ${o.name}`,
      body: `Created in the last week; publishers have asked for "${o.vertical}" before.`,
      priority: 35,
      cta_label: "Find publishers",
      cta_href: `/matchmaker?offer=${o.id}`,
      related_entity_type: "offer",
      related_entity_id: o.id,
    });
  }
  return candidates.slice(0, MAX_PER_KIND);
}

async function pendingTooLong(brand: Brand): Promise<InsightCandidate[]> {
  const supabase = createClient();
  const fields = activeStatusFields(brand);
  const orParts = fields.map((f) => `${f}.ilike.%Pending%`);
  const { data } = await supabase
    .from("v_contacts_with_age")
    .select("id, name, company, updated_at, status_nomi, status_startech, status_luminarix")
    .or(orParts.join(","))
    .lt("updated_at", daysAgo(PENDING_DAYS))
    .order("updated_at", { ascending: true })
    .limit(MAX_PER_KIND);

  return (data ?? []).map((c) => {
    // Decide which brand's status is "Pending"
    const which = fields.find((f) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const v = (c as any)[f] as string | null;
      return v && classifyContactStatus(v) === "pending";
    });
    return {
      kind: "pending_too_long" as const,
      title: `${c.name} stuck in Pending`,
      body: `No status update in 14+ days. ${
        c.company ? `Company: ${c.company}.` : ""
      } Time to nudge or change status.`.trim(),
      priority: 45,
      cta_label: "Open contact",
      cta_href: `/contacts?id=${c.id}`,
      related_entity_type: "contact",
      related_entity_id: c.id,
      brand_context: which
        ? (which.replace("status_", "") as "nomi" | "startech" | "luminarix")
        : brandForLog(brand),
    };
  });
}

async function newExternalOffers(): Promise<InsightCandidate[]> {
  const supabase = createClient();
  // External offers seen in the last few days, matching an open wishlist vertical
  const [{ data: ext, error: extErr }, { data: wishlists }] = await Promise.all([
    supabase
      .from("external_offers")
      .select("id, name, vertical, advertiser, connection_id")
      .eq("is_active", true)
      .eq("added_to_my_offers", false)
      .gte("first_seen_at", daysAgo(NEW_EXTERNAL_OFFER_DAYS))
      .limit(50),
    supabase
      .from("publisher_wishlists")
      .select("vertical")
      .eq("status", "open")
      .not("vertical", "is", null)
      .limit(500),
  ]);
  if (extErr) return []; // table may be empty / not yet populated
  const wishVerticals = new Set(
    (wishlists ?? []).map((w) => (w.vertical ?? "").toLowerCase()),
  );
  const candidates: InsightCandidate[] = [];
  for (const o of ext ?? []) {
    if (o.vertical && wishVerticals.has(o.vertical.toLowerCase())) {
      candidates.push({
        kind: "new_external_offer",
        title: `New external offer: ${o.name}`,
        body: `${o.advertiser ?? "Advertiser unknown"} · vertical "${o.vertical}" matches an open publisher wishlist.`,
        priority: 50,
        cta_label: "View in External Offers",
        cta_href: `/external-offers?id=${o.id}`,
        related_entity_type: "external_offer",
        related_entity_id: o.id,
      });
    }
  }
  return candidates.slice(0, MAX_PER_KIND);
}

async function dataQuality(): Promise<InsightCandidate[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("v_networks_with_activity")
    .select("id, name, tier")
    .eq("contact_count", 0)
    .order("created_at", { ascending: false })
    .limit(MAX_PER_KIND);

  return (data ?? []).map((n) => ({
    kind: "data_quality" as const,
    title: `${n.name} has no contacts`,
    body: `Add at least one contact to make this network usable in MatchMaker and Today's Actions.`,
    priority: 70,
    cta_label: "Add contact",
    cta_href: `/contacts/new?company=${encodeURIComponent(n.name)}`,
    related_entity_type: "network",
    related_entity_id: n.id,
  }));
}

// ===== Orchestrator =====

/**
 * Compute fresh insights for the active brand and upsert into the table.
 * Returns the active (undismissed) insights, sorted by priority then created_at.
 */
export async function computeAndLoadInsights(brand: Brand) {
  const supabase = createClient();

  const candidates: InsightCandidate[] = (
    await Promise.all([
      matchmakerHits(),
      followupReminders(brand),
      coldATier(),
      newOfferPitches(),
      pendingTooLong(brand),
      newExternalOffers(),
      dataQuality(),
    ])
  ).flat();

  // Upsert each candidate (skip if a matching undismissed insight already exists)
  for (const c of candidates) {
    // Look for an existing undismissed insight of the same kind/related_*
    const exists = await supabase
      .from("smart_insights")
      .select("id")
      .eq("kind", c.kind)
      .eq("dismissed", false)
      .match({
        ...(c.related_entity_type
          ? { related_entity_type: c.related_entity_type }
          : {}),
        ...(c.related_entity_id ? { related_entity_id: c.related_entity_id } : {}),
      })
      .maybeSingle();
    if (exists.data) continue;
    await supabase.from("smart_insights").insert({
      kind: c.kind,
      title: c.title,
      body: c.body,
      priority: c.priority,
      cta_label: c.cta_label ?? null,
      cta_href: c.cta_href ?? null,
      related_entity_type: c.related_entity_type ?? null,
      related_entity_id: c.related_entity_id ?? null,
      brand_context: c.brand_context ?? null,
    });
  }

  // Load active insights — brand-aware
  let q = supabase
    .from("smart_insights")
    .select(
      "id, kind, title, body, priority, cta_label, cta_href, related_entity_type, related_entity_id, brand_context, created_at",
    )
    .eq("dismissed", false)
    .order("priority", { ascending: true })
    .order("created_at", { ascending: false });

  if (brand !== "all") {
    q = q.or(`brand_context.eq.${brand},brand_context.is.null`);
  }
  const { data } = await q.limit(50);
  return data ?? [];
}
