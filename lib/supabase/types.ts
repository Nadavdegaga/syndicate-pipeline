// Manually authored row types matching the live Supabase schema.
// Regenerate with `supabase gen types typescript` once the CLI is set up.

export type Tier = "A" | "B" | "C" | null;
export type Channel =
  | "LinkedIn"
  | "Telegram"
  | "Teams"
  | "Skype"
  | "Email"
  | "Unknown"
  | null;
export type AssignedBrand = "nomi" | "startech" | "luminarix" | null;
export type OfferStatus =
  | "active"
  | "needs_proof"
  | "needs_traffic"
  | "direct"
  | "internal"
  | "paused"
  | "dead"
  | null;
export type WishlistStatus = "open" | "matched" | "delivered" | "declined" | null;
export type DemandStatus = "open" | "covered" | "paused" | null;

export type NetworkRow = {
  id: string;
  name: string;
  tier: Tier;
  login_url: string | null;
  registration_url: string | null;
  registered: boolean | null;
  linkedin_url: string | null;
  notes: string | null;
  source: string | null;
  created_at: string;
  updated_at: string;
};

export type NetworkWithActivityRow = NetworkRow & {
  contact_count: number;
  offer_count: number;
  last_contact_touch_at: string | null;
};

export type ContactRow = {
  id: string;
  name: string;
  role: string | null;
  company: string | null;
  network_id: string | null;
  channel: Channel;
  linkedin_url: string | null;
  telegram: string | null;
  email: string | null;
  other_contact: string | null;
  status_nomi: string | null;
  status_startech: string | null;
  status_luminarix: string | null;
  last_touch_at: string | null;
  next_action_at: string | null;
  assigned_brand: AssignedBrand;
  notes: string | null;
  source: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
};

export type ContactWithAgeRow = ContactRow & {
  days_since_last_touch: number | null;
  days_until_next_action: number | null;
  network_tier: Tier;
  network_name_lookup: string | null;
};

export type OfferRow = {
  id: string;
  name: string;
  network_id: string | null;
  network_name: string | null;
  vertical: string | null;
  traffic_sources: string | null;
  payout: string | null;
  preview_link: string | null;
  status: OfferStatus;
  kpi_notes: string | null;
  last_pitched_at: string | null;
  source: string | null;
  created_at: string;
  updated_at: string;
};

export type WishlistRow = {
  id: string;
  publisher_name: string | null;
  publisher_contact_id: string | null;
  requested_offer: string;
  vertical: string | null;
  link_or_network: string | null;
  matched_offer_id: string | null;
  status: WishlistStatus;
  requested_at: string | null;
  notes: string | null;
  source: string | null;
  created_at: string;
  updated_at: string;
};

export type DemandRow = {
  id: string;
  network_id: string | null;
  network_name: string | null;
  offer_name: string;
  vertical: string | null;
  link: string | null;
  payout: string | null;
  status: DemandStatus;
  notes: string | null;
  source_section: string | null;
  created_at: string;
  updated_at: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Database = any;
