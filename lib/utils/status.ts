// Status text → color category mapping (SPEC §21).
// Status text is free-form; we classify by substring match in priority order.

export type StatusCategory =
  | "approved"
  | "working"
  | "talking"
  | "followed_up"
  | "second_option"
  | "sent"
  | "pending"
  | "needs_proof"
  | "internal"
  | "cold"
  | "unknown";

export type StatusStyle = {
  category: StatusCategory;
  bg: string;
  text: string;
  ring: string;
  label: string;
};

const PALETTE: Record<StatusCategory, Omit<StatusStyle, "category" | "label">> = {
  // Green — Approved / Working
  approved: { bg: "bg-[#70AD47]", text: "text-white", ring: "ring-[#70AD47]/30" },
  working: { bg: "bg-[#70AD47]", text: "text-white", ring: "ring-[#70AD47]/30" },
  // Light green — LD / TG / Talking / Process / In conversation
  talking: { bg: "bg-[#A9D08E]", text: "text-emerald-950", ring: "ring-[#A9D08E]/40" },
  // Yellow — Followed up
  followed_up: { bg: "bg-[#FFD966]", text: "text-amber-950", ring: "ring-[#FFD966]/40" },
  // Orange — Second option
  second_option: { bg: "bg-[#F4B084]", text: "text-orange-950", ring: "ring-[#F4B084]/40" },
  // Blue — Sent / Pending+Sent
  sent: { bg: "bg-[#9DC3E6]", text: "text-sky-950", ring: "ring-[#9DC3E6]/40" },
  // Amber — Pending
  pending: { bg: "bg-[#FFE699]", text: "text-amber-950", ring: "ring-[#FFE699]/40" },
  // Red — Needs proof
  needs_proof: { bg: "bg-[#F4CCCC]", text: "text-red-950", ring: "ring-[#F4CCCC]/50" },
  // Purple — Internal
  internal: { bg: "bg-[#B4A7D6]", text: "text-violet-950", ring: "ring-[#B4A7D6]/40" },
  // Gray — Cold / dormant
  cold: { bg: "bg-[#D9D9D9]", text: "text-slate-700", ring: "ring-[#D9D9D9]/40" },
  // Fallback
  unknown: { bg: "bg-slate-100", text: "text-slate-500", ring: "ring-slate-300/40" },
};

/**
 * Classify free-form contact status text into a color category.
 * Order matters: more specific matches first.
 */
export function classifyContactStatus(raw: string | null | undefined): StatusCategory {
  if (!raw) return "unknown";
  const t = raw.toLowerCase();
  // Word-boundary match — "ld" must be a standalone token so "cold" doesn't match.
  const hasWord = (word: string) => new RegExp(`\\b${word}\\b`).test(t);

  if (hasWord("approved") || hasWord("working")) return "approved";
  if (t.includes("followed up") || t.includes("follow up")) return "followed_up";
  if (t.includes("second option") || t.includes("backup")) return "second_option";
  if (hasWord("cold") || hasWord("dormant") || t.includes("not relevant"))
    return "cold";
  if (hasWord("ld") || hasWord("tg") || hasWord("talking") || hasWord("process"))
    return "talking";
  if (hasWord("sent")) return "sent";
  if (hasWord("pending")) return "pending";
  if (t.includes("needs proof") || t.includes("proof needed")) return "needs_proof";
  if (hasWord("internal")) return "internal";

  return "unknown";
}

export function getStatusStyle(raw: string | null | undefined): StatusStyle {
  const category = classifyContactStatus(raw);
  return { category, label: raw ?? "—", ...PALETTE[category] };
}

// Offer status (enum) → category (SPEC §13)
const OFFER_STATUS_CATEGORY: Record<string, StatusCategory> = {
  active: "approved",
  needs_proof: "needs_proof",
  needs_traffic: "pending",
  direct: "sent",
  internal: "internal",
  paused: "cold",
  dead: "cold",
};

export function getOfferStatusStyle(status: string | null | undefined): StatusStyle {
  const category = OFFER_STATUS_CATEGORY[status ?? ""] ?? "unknown";
  const label = (status ?? "—").replace(/_/g, " ");
  return { category, label, ...PALETTE[category] };
}

// Wishlist status → category
const WISHLIST_STATUS_CATEGORY: Record<string, StatusCategory> = {
  open: "pending",
  matched: "sent",
  delivered: "approved",
  declined: "cold",
};

export function getWishlistStatusStyle(status: string | null | undefined): StatusStyle {
  const category = WISHLIST_STATUS_CATEGORY[status ?? ""] ?? "unknown";
  return { category, label: status ?? "—", ...PALETTE[category] };
}

// Demand status → category
const DEMAND_STATUS_CATEGORY: Record<string, StatusCategory> = {
  open: "pending",
  covered: "approved",
  paused: "cold",
};

export function getDemandStatusStyle(status: string | null | undefined): StatusStyle {
  const category = DEMAND_STATUS_CATEGORY[status ?? ""] ?? "unknown";
  return { category, label: status ?? "—", ...PALETTE[category] };
}

// Common contact-status suggestions for quick-picks
export const COMMON_CONTACT_STATUSES = [
  "Pending",
  "Sent",
  "Pending+Sent",
  "LD",
  "TG",
  "Talking",
  "Approved",
  "Working",
  "Followed up",
  "Second option",
  "Cold - dormant",
  "Not relevant",
];
