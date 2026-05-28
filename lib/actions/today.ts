"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/actions/activity";
import { activeStatusFields } from "@/lib/utils/brand";
import type { Brand } from "@/types";
import type {
  ContactWithAgeRow,
  NetworkWithActivityRow,
  OfferRow,
  WishlistRow,
} from "@/lib/supabase/types";

export type TodayData = {
  hotFollowups: { rows: ContactWithAgeRow[]; total: number };
  coldLeads: { rows: ContactWithAgeRow[]; total: number };
  untouchedATier: { rows: NetworkWithActivityRow[]; total: number };
  newOffers: { rows: OfferRow[]; total: number };
  publisherAsks: { rows: (WishlistRow & { age_days: number })[]; total: number };
};

function manyOrStatus(fields: string[], patterns: string[]): string {
  const parts: string[] = [];
  for (const sub of patterns) for (const f of fields) parts.push(`${f}.ilike.%${sub}%`);
  return parts.join(",");
}

export async function getTodayData(brand: Brand): Promise<TodayData> {
  const supabase = createClient();
  const fields = activeStatusFields(brand);

  const days = (n: number) => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString();
  };

  // Card 1: Hot Follow-ups — Sent/Pending+Sent AND last_touch_at < now - 7d
  const hotFollowupsP = supabase
    .from("v_contacts_with_age")
    .select("*", { count: "exact" })
    .or(manyOrStatus(fields, ["Sent", "Pending+Sent"]))
    .lt("last_touch_at", days(7))
    .order("last_touch_at", { ascending: true, nullsFirst: false })
    .limit(5);

  // Card 2: Cold Leads — status contains LD/TG/Talking AND last_touch_at < now - 21d
  const coldLeadsP = supabase
    .from("v_contacts_with_age")
    .select("*", { count: "exact" })
    .or(manyOrStatus(fields, ["LD", "TG", "Talking"]))
    .lt("last_touch_at", days(21))
    .order("last_touch_at", { ascending: true, nullsFirst: false })
    .limit(5);

  // Card 3: Untouched A-Tier Networks — A-tier with last_contact_touch_at older than 30d (or null)
  const untouchedATierP = supabase
    .from("v_networks_with_activity")
    .select("*", { count: "exact" })
    .eq("tier", "A")
    .or(`last_contact_touch_at.lte.${days(30)},last_contact_touch_at.is.null`)
    .order("last_contact_touch_at", { ascending: true, nullsFirst: true })
    .limit(5);

  // Card 4: New Offers to Pitch — created < 30d AND status in (active, needs_traffic, direct)
  const newOffersP = supabase
    .from("offers")
    .select("*", { count: "exact" })
    .gte("created_at", days(30))
    .in("status", ["active", "needs_traffic", "direct"])
    .order("created_at", { ascending: false })
    .limit(5);

  // Card 5: Publisher Asks Waiting — open AND requested_at < now - 3d
  const publisherAsksP = supabase
    .from("publisher_wishlists")
    .select("*", { count: "exact" })
    .eq("status", "open")
    .lt("requested_at", days(3))
    .order("requested_at", { ascending: true, nullsFirst: false })
    .limit(5);

  const [hotR, coldR, atierR, offersR, asksR] = await Promise.all([
    hotFollowupsP,
    coldLeadsP,
    untouchedATierP,
    newOffersP,
    publisherAsksP,
  ]);

  const now = Date.now();
  const ageDays = (iso: string | null) =>
    iso ? Math.floor((now - new Date(iso).getTime()) / 86_400_000) : 0;

  return {
    hotFollowups: {
      rows: (hotR.data ?? []) as ContactWithAgeRow[],
      total: hotR.count ?? 0,
    },
    coldLeads: {
      rows: (coldR.data ?? []) as ContactWithAgeRow[],
      total: coldR.count ?? 0,
    },
    untouchedATier: {
      rows: (atierR.data ?? []) as NetworkWithActivityRow[],
      total: atierR.count ?? 0,
    },
    newOffers: {
      rows: (offersR.data ?? []) as OfferRow[],
      total: offersR.count ?? 0,
    },
    publisherAsks: {
      rows: (asksR.data ?? []).map((r) => ({
        ...(r as WishlistRow),
        age_days: ageDays((r as WishlistRow).requested_at),
      })),
      total: asksR.count ?? 0,
    },
  };
}

/** Mark a contact as just followed-up: bump last_touch_at + log. */
export async function markFollowedUp(
  contactId: string,
  brand: Brand,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createClient();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("contacts")
    .update({ last_touch_at: now, updated_at: now })
    .eq("id", contactId);
  if (error) return { ok: false, error: error.message };

  await logActivity({
    entity_type: "contact",
    entity_id: contactId,
    action: "last_touch_at:last_touch_updated",
    to_value: now,
    brand,
  });
  revalidatePath("/today");
  revalidatePath("/contacts");
  return { ok: true };
}

/** Snooze: push next_action_at to N days from now. */
export async function snoozeContact(
  contactId: string,
  days = 7,
  brand: Brand = "all",
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createClient();
  const d = new Date();
  d.setDate(d.getDate() + days);
  const iso = d.toISOString();
  const { error } = await supabase
    .from("contacts")
    .update({ next_action_at: iso, updated_at: new Date().toISOString() })
    .eq("id", contactId);
  if (error) return { ok: false, error: error.message };

  await logActivity({
    entity_type: "contact",
    entity_id: contactId,
    action: "next_action_at:next_action_set",
    to_value: iso,
    brand,
  });
  revalidatePath("/today");
  return { ok: true };
}

/** Mark an offer as just pitched. */
export async function markOfferPitchedToday(
  offerId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createClient();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("offers")
    .update({ last_pitched_at: now, updated_at: now })
    .eq("id", offerId);
  if (error) return { ok: false, error: error.message };

  await logActivity({
    entity_type: "offer",
    entity_id: offerId,
    action: "marked_pitched",
    to_value: now,
  });
  revalidatePath("/today");
  return { ok: true };
}
