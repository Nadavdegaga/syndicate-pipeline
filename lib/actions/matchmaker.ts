"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/actions/activity";
import { matchScore } from "@/lib/utils/fuzzy";

const MIN_SCORE = 20;

type PublisherChoice = {
  contact_id: string | null;
  name: string;
  channel: string | null;
};
type WishlistMatch = {
  wishlist: {
    id: string;
    requested_offer: string;
    vertical: string | null;
    status: string;
    requested_at: string | null;
    matched_offer_id: string | null;
  };
  matches: {
    offer_id: string;
    name: string;
    network_name: string | null;
    vertical: string | null;
    payout: string | null;
    status: string | null;
    score: number;
  }[];
};

export async function listPublishers(query = ""): Promise<PublisherChoice[]> {
  const supabase = createClient();
  const q = query.trim();
  // Pull distinct publisher_name from wishlists + Telegram/Skype contacts
  const [{ data: wlPubs }, { data: tgContacts }] = await Promise.all([
    supabase
      .from("publisher_wishlists")
      .select("publisher_name, publisher_contact_id")
      .not("publisher_name", "is", null)
      .limit(2000),
    supabase
      .from("contacts")
      .select("id, name, channel")
      .in("channel", ["Telegram", "Skype"])
      .limit(2000),
  ]);

  const map = new Map<string, PublisherChoice>();
  for (const w of wlPubs ?? []) {
    const name = (w.publisher_name ?? "").trim();
    if (!name) continue;
    if (!map.has(name)) {
      map.set(name, { contact_id: w.publisher_contact_id ?? null, name, channel: null });
    }
  }
  for (const c of tgContacts ?? []) {
    const name = c.name.trim();
    if (!map.has(name)) {
      map.set(name, { contact_id: c.id, name, channel: c.channel });
    } else if (!map.get(name)!.contact_id) {
      map.get(name)!.contact_id = c.id;
      map.get(name)!.channel = c.channel;
    }
  }

  const all = Array.from(map.values());
  if (!q) return all.slice(0, 50);
  const ql = q.toLowerCase();
  return all
    .filter((p) => p.name.toLowerCase().includes(ql))
    .slice(0, 50);
}

export async function getMatchesForPublisher(
  publisherName: string,
): Promise<WishlistMatch[]> {
  const supabase = createClient();
  const { data: wishlists } = await supabase
    .from("publisher_wishlists")
    .select("id, requested_offer, vertical, status, requested_at, matched_offer_id")
    .ilike("publisher_name", publisherName)
    .order("requested_at", { ascending: false, nullsFirst: false });

  if (!wishlists?.length) return [];

  const { data: offers } = await supabase
    .from("offers")
    .select("id, name, network_name, vertical, payout, status")
    .in("status", ["active", "needs_traffic", "direct"])
    .limit(2000);

  const results: WishlistMatch[] = [];
  for (const wl of wishlists) {
    const scored = (offers ?? [])
      .map((o) => ({
        offer_id: o.id,
        name: o.name,
        network_name: o.network_name,
        vertical: o.vertical,
        payout: o.payout,
        status: o.status,
        score: matchScore(
          { requested_offer: wl.requested_offer, vertical: wl.vertical },
          { name: o.name, vertical: o.vertical },
        ),
      }))
      .filter((m) => m.score >= MIN_SCORE)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
    results.push({ wishlist: wl, matches: scored });
  }
  return results;
}

export async function getMatchesForOffer(offerId: string) {
  const supabase = createClient();
  const { data: offer } = await supabase
    .from("offers")
    .select("id, name, vertical, payout, status, network_name")
    .eq("id", offerId)
    .maybeSingle();
  if (!offer) return { offer: null, matches: [] };

  const { data: wishlists } = await supabase
    .from("publisher_wishlists")
    .select("id, publisher_name, requested_offer, vertical, status, requested_at, matched_offer_id")
    .eq("status", "open")
    .limit(2000);

  const matches = (wishlists ?? [])
    .map((w) => ({
      wishlist_id: w.id,
      publisher_name: w.publisher_name,
      requested_offer: w.requested_offer,
      vertical: w.vertical,
      score: matchScore(
        { requested_offer: w.requested_offer, vertical: w.vertical },
        { name: offer.name, vertical: offer.vertical },
      ),
    }))
    .filter((m) => m.score >= MIN_SCORE)
    .sort((a, b) => b.score - a.score)
    .slice(0, 20);

  return { offer, matches };
}

export async function markWishlistMatched(
  wishlistId: string,
  offerId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createClient();
  const { data: prev } = await supabase
    .from("publisher_wishlists")
    .select("status, matched_offer_id")
    .eq("id", wishlistId)
    .maybeSingle();

  const { error } = await supabase
    .from("publisher_wishlists")
    .update({
      matched_offer_id: offerId,
      status: "matched",
      updated_at: new Date().toISOString(),
    })
    .eq("id", wishlistId);
  if (error) return { ok: false, error: error.message };

  await logActivity({
    entity_type: "wishlist",
    entity_id: wishlistId,
    action: "status:status_changed",
    from_value: prev?.status ?? null,
    to_value: "matched",
  });
  await logActivity({
    entity_type: "wishlist",
    entity_id: wishlistId,
    action: "matched_offer_id:matched",
    from_value: prev?.matched_offer_id ?? null,
    to_value: offerId,
  });

  revalidatePath("/matchmaker");
  revalidatePath("/wishlists");
  return { ok: true };
}
