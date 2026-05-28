// Filter spec — used by FilterBuilder, SavedViews, and per-entity page queries.
// Stored as JSON in saved_views.filters, encoded as base64url in URL `?f=…`.

export type FieldType = "text" | "date" | "enum";

export type Operator =
  | "contains"
  | "equals"
  | "not_equals"
  | "is_empty"
  | "is_not_empty"
  | "before"
  | "after"
  | "within_days"
  | "is"
  | "is_not";

export type Condition = {
  field: string;
  op: Operator;
  value?: string | null;
};

export type FilterSpec = {
  combinator: "and" | "or";
  conditions: Condition[];
};

export type FieldConfig = {
  key: string;
  label: string;
  type: FieldType;
  options?: string[];
};

export const EMPTY_FILTER: FilterSpec = { combinator: "and", conditions: [] };

export function isEmptyFilter(f: FilterSpec | null | undefined): boolean {
  return !f || f.conditions.length === 0;
}

export function encodeFilter(f: FilterSpec): string {
  if (isEmptyFilter(f)) return "";
  const json = JSON.stringify(f);
  if (typeof window === "undefined") {
    return Buffer.from(json, "utf-8").toString("base64url");
  }
  // Browser
  return btoa(unescape(encodeURIComponent(json)))
    .replace(/=+$/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

export function decodeFilter(s: string | null | undefined): FilterSpec {
  if (!s) return EMPTY_FILTER;
  try {
    let json: string;
    if (typeof window === "undefined") {
      json = Buffer.from(s, "base64url").toString("utf-8");
    } else {
      const padded = s.replace(/-/g, "+").replace(/_/g, "/");
      const padding = padded.length % 4 ? "=".repeat(4 - (padded.length % 4)) : "";
      json = decodeURIComponent(escape(atob(padded + padding)));
    }
    const parsed = JSON.parse(json);
    if (parsed && Array.isArray(parsed.conditions)) return parsed as FilterSpec;
  } catch {
    /* fall through */
  }
  return EMPTY_FILTER;
}

/**
 * Convert a FilterSpec into a PostgREST `.or(...)` clause string (when combinator is "or")
 * or apply via chained `.eq/.gte/etc` (when "and"). Returns `null` for empty spec.
 *
 * To keep the API simple, we return two parts: a list of `.and(...)` chain steps
 * (only used for the "and" combinator, expressed as individual where clauses) AND
 * an `or` string. Callers apply both.
 *
 * For an `or` combinator we use the PostgREST string syntax.
 */
function escapeValue(v: string): string {
  // PostgREST OR-string special chars: commas, parens. Strip them.
  return v.replace(/[,()]/g, "");
}

function conditionToOrPart(cond: Condition): string | null {
  const val = (cond.value ?? "").trim();
  switch (cond.op) {
    case "contains":
      return val ? `${cond.field}.ilike.%${escapeValue(val)}%` : null;
    case "equals":
      return val ? `${cond.field}.eq.${escapeValue(val)}` : null;
    case "not_equals":
      return val ? `${cond.field}.neq.${escapeValue(val)}` : null;
    case "is":
      return val ? `${cond.field}.eq.${escapeValue(val)}` : null;
    case "is_not":
      return val ? `${cond.field}.neq.${escapeValue(val)}` : null;
    case "is_empty":
      return `${cond.field}.is.null`;
    case "is_not_empty":
      return `${cond.field}.not.is.null`;
    case "before":
      return val ? `${cond.field}.lte.${escapeValue(val)}` : null;
    case "after":
      return val ? `${cond.field}.gte.${escapeValue(val)}` : null;
    case "within_days": {
      const n = parseInt(val, 10);
      if (!n) return null;
      const d = new Date();
      d.setDate(d.getDate() - n);
      return `${cond.field}.gte.${d.toISOString()}`;
    }
    default:
      return null;
  }
}

/**
 * Apply a FilterSpec to a Supabase PostgREST query.
 * Returns the modified builder.
 */
export function applyFilterSpec<T>(query: T, spec: FilterSpec | null): T {
  if (!spec || spec.conditions.length === 0) return query;
  const parts = spec.conditions
    .map(conditionToOrPart)
    .filter((p): p is string => p !== null);
  if (parts.length === 0) return query;
  // PostgREST docs:
  //   .or("a.eq.1,b.eq.2") = a=1 OR b=2
  //   For AND we just chain — but we can also chain through .or with single conditions
  //   per filter via separate .or() calls (each .or with a single clause = AND).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const q = query as any;
  if (spec.combinator === "or") {
    return q.or(parts.join(","));
  }
  // AND combinator — chain each as its own filter; using .or() with one clause works
  // as a no-op disjunction equivalent to a single predicate
  let cur = q;
  for (const p of parts) cur = cur.or(p);
  return cur;
}

// --- Per-entity field configs ---

export const CONTACT_FIELDS: FieldConfig[] = [
  { key: "name", label: "Name", type: "text" },
  { key: "company", label: "Company", type: "text" },
  { key: "role", label: "Role", type: "text" },
  { key: "channel", label: "Channel", type: "enum", options: ["LinkedIn", "Telegram", "Teams", "Skype", "Email", "Unknown"] },
  { key: "status_nomi", label: "Status (Nomi)", type: "text" },
  { key: "status_startech", label: "Status (StarTech)", type: "text" },
  { key: "status_luminarix", label: "Status (Luminarix)", type: "text" },
  { key: "last_touch_at", label: "Last Touch", type: "date" },
  { key: "next_action_at", label: "Next Action", type: "date" },
  { key: "network_tier", label: "Network Tier", type: "enum", options: ["A", "B", "C"] },
  { key: "network_name_lookup", label: "Network", type: "text" },
  { key: "linkedin_url", label: "Has LinkedIn", type: "text" },
  { key: "telegram", label: "Has Telegram", type: "text" },
  { key: "email", label: "Has Email", type: "text" },
  { key: "source", label: "Source", type: "text" },
  { key: "created_at", label: "Created", type: "date" },
];

export const NETWORK_FIELDS: FieldConfig[] = [
  { key: "name", label: "Name", type: "text" },
  { key: "tier", label: "Tier", type: "enum", options: ["A", "B", "C"] },
  { key: "registered", label: "Registered", type: "enum", options: ["true", "false"] },
  { key: "notes", label: "Notes", type: "text" },
  { key: "source", label: "Source", type: "text" },
  { key: "created_at", label: "Created", type: "date" },
];

export const OFFER_FIELDS: FieldConfig[] = [
  { key: "name", label: "Name", type: "text" },
  { key: "network_name", label: "Network", type: "text" },
  { key: "vertical", label: "Vertical", type: "text" },
  { key: "status", label: "Status", type: "enum", options: ["active", "needs_proof", "needs_traffic", "direct", "internal", "paused", "dead"] },
  { key: "payout", label: "Payout", type: "text" },
  { key: "preview_link", label: "Preview link", type: "text" },
  { key: "created_at", label: "Created", type: "date" },
];

export const WISHLIST_FIELDS: FieldConfig[] = [
  { key: "publisher_name", label: "Publisher", type: "text" },
  { key: "requested_offer", label: "Requested Offer", type: "text" },
  { key: "vertical", label: "Vertical", type: "text" },
  { key: "status", label: "Status", type: "enum", options: ["open", "matched", "delivered", "declined"] },
  { key: "requested_at", label: "Requested", type: "date" },
];

export const DEMAND_FIELDS: FieldConfig[] = [
  { key: "network_name", label: "Network", type: "text" },
  { key: "offer_name", label: "Offer Name", type: "text" },
  { key: "vertical", label: "Vertical", type: "text" },
  { key: "status", label: "Status", type: "enum", options: ["open", "covered", "paused"] },
  { key: "payout", label: "Payout", type: "text" },
];

export const OPERATORS_BY_TYPE: Record<FieldType, { op: Operator; label: string }[]> = {
  text: [
    { op: "contains", label: "contains" },
    { op: "equals", label: "equals" },
    { op: "not_equals", label: "does not equal" },
    { op: "is_empty", label: "is empty" },
    { op: "is_not_empty", label: "is not empty" },
  ],
  date: [
    { op: "before", label: "before" },
    { op: "after", label: "after" },
    { op: "within_days", label: "within (days)" },
    { op: "is_empty", label: "is empty" },
    { op: "is_not_empty", label: "is not empty" },
  ],
  enum: [
    { op: "is", label: "is" },
    { op: "is_not", label: "is not" },
    { op: "is_empty", label: "is empty" },
    { op: "is_not_empty", label: "is not empty" },
  ],
};
