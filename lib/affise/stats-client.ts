// Fetches daily performance stats from Affise GET /3.0/stats/getbyprogram.
// Call with a single date (date_from = date_to) to get per-offer stats for that day.
// Env vars required: AFFISE_API_KEY, AFFISE_BASE_URL (e.g. https://api.yourdomain.com)

const PAGE_SIZE = 500; // Affise max per page
const MAX_PAGES = 20;  // 10 000 offer-rows hard cap per date

type AffiseStatSlice = {
  slice: {
    offer: {
      id: number;
      offer_id: string;
      title: string;
    };
  };
  traffic: {
    raw: string | number;
    uniq: string | number;
  };
  actions: {
    confirmed: { revenue: number; charge: number; earning: number; count: number };
    total:     { revenue: number; charge: number; earning: number; count: number };
    pending:   { revenue: number; charge: number; earning: number; count: number };
    declined:  { revenue: number; charge: number; earning: number; count: number };
    hold:      { revenue: number; charge: number; earning: number; count: number };
  };
};

type AffiisePaginatedResponse = {
  status: number;
  stats: AffiseStatSlice[];
  pagination: { per_page: number; total_count: number; page: number };
};

export type NormalizedStatRow = {
  report_date: string;
  offer_id: string;
  source: "affise";
  clicks: number;
  conversions: number;
  // revenue = what advertiser pays us (Affise calls this "charge")
  revenue: number;
  // cost = what we pay affiliates (Affise calls this "revenue")
  cost: number;
  raw_data: unknown;
};

function toRow(date: string, s: AffiseStatSlice): NormalizedStatRow {
  const confirmed = s.actions?.confirmed ?? { revenue: 0, charge: 0, count: 0 };
  return {
    report_date: date,
    offer_id: String(s.slice.offer.id),
    source: "affise",
    clicks: Number(s.traffic?.raw) || 0,
    conversions: confirmed.count || 0,
    revenue: confirmed.charge || 0,
    cost: confirmed.revenue || 0,
    raw_data: s,
  };
}

export async function fetchAffiseStatsForDate(
  date: string,
): Promise<{ ok: true; rows: NormalizedStatRow[] } | { ok: false; error: string }> {
  const apiKey = process.env.AFFISE_API_KEY;
  const base = (process.env.AFFISE_BASE_URL ?? "").replace(/\/+$/, "");

  if (!apiKey) return { ok: false, error: "AFFISE_API_KEY env var not set" };
  if (!base) return { ok: false, error: "AFFISE_BASE_URL env var not set" };

  const rows: NormalizedStatRow[] = [];

  for (let page = 1; page <= MAX_PAGES; page++) {
    const url = new URL(`${base}/3.0/stats/getbyprogram`);
    url.searchParams.set("filter[date_from]", date);
    url.searchParams.set("filter[date_to]", date);
    url.searchParams.set("limit", String(PAGE_SIZE));
    url.searchParams.set("page", String(page));
    url.searchParams.set("orderType", "asc");

    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 30_000);

    let json: AffiisePaginatedResponse;
    try {
      const res = await fetch(url.toString(), {
        headers: { "API-Key": apiKey },
        signal: ctrl.signal,
      });
      if (!res.ok) {
        const text = await res.text();
        return { ok: false, error: `Affise HTTP ${res.status}: ${text.slice(0, 300)}` };
      }
      json = await res.json();
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    } finally {
      clearTimeout(timeout);
    }

    const stats = json.stats ?? [];
    for (const s of stats) {
      rows.push(toRow(date, s));
    }

    const total = json.pagination?.total_count ?? 0;
    const fetched = (page - 1) * PAGE_SIZE + stats.length;
    if (fetched >= total || stats.length < PAGE_SIZE) break;
  }

  return { ok: true, rows };
}
