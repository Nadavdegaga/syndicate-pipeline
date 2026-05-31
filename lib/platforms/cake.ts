// Cake Marketing REST API client.
// Docs: https://cakemarketing.com/api/

import type {
  ConnectionConfig,
  FetchOffersResult,
  NormalizedOffer,
  PlatformClient,
  TestConnectionResult,
} from "./types";

export const PLATFORM_DOCS_URL = "https://cakemarketing.com/api/";

type CakeOffer = {
  offer_id?: number | string;
  offer_name?: string;
  name?: string;
  advertiser_name?: string;
  advertiser?: { name?: string };
  vertical_name?: string;
  vertical?: { name?: string };
  payout?: number | string;
  payout_amount?: number | string;
  preview_url?: string;
  preview_link?: string;
  status?: string;
  countries?: string[];
  country_codes?: string[];
};

function normalize(raw: CakeOffer): NormalizedOffer | null {
  const id = raw.offer_id;
  const name = raw.offer_name ?? raw.name;
  if (id === undefined || !name) return null;
  return {
    platform_offer_id: String(id),
    name,
    advertiser: raw.advertiser_name ?? raw.advertiser?.name ?? null,
    vertical: raw.vertical_name ?? raw.vertical?.name ?? null,
    payout:
      raw.payout !== undefined
        ? `$${raw.payout}`
        : raw.payout_amount !== undefined
          ? `$${raw.payout_amount}`
          : null,
    countries: raw.countries ?? raw.country_codes ?? [],
    traffic_sources: [],
    status: raw.status ?? null,
    preview_url: raw.preview_url ?? raw.preview_link ?? null,
    raw_data: raw,
  };
}

async function callOffersSearch(
  config: ConnectionConfig,
  startAt: number,
  limit: number,
  signal?: AbortSignal,
): Promise<{ offers: CakeOffer[]; hasMore: boolean }> {
  const base = (config.baseUrl || "").replace(/\/+$/, "");
  if (!base) throw new Error("Cake base URL is required (e.g. https://<sub>.cakemarketing.com/api/1)");
  const url = `${base}/Offers/Search?api_key=${encodeURIComponent(config.apiKey)}&start_at_row=${startAt}&row_limit=${limit}`;
  const r = await fetch(url, { signal });
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`Cake HTTP ${r.status}: ${text.slice(0, 200)}`);
  }
  const json = await r.json();
  const offers: CakeOffer[] = json.offers ?? json.data ?? json.rows ?? [];
  const total: number | undefined = json.row_count ?? json.total;
  const hasMore =
    total !== undefined ? startAt + limit <= total : offers.length === limit;
  return { offers, hasMore };
}

async function fetchOffers(config: ConnectionConfig): Promise<FetchOffersResult> {
  try {
    const limit = 100;
    const maxPages = 50;
    const collected: NormalizedOffer[] = [];
    for (let page = 0; page < maxPages; page++) {
      const ctrl = new AbortController();
      const timeout = setTimeout(() => ctrl.abort(), 30000);
      let result;
      try {
        result = await callOffersSearch(config, page * limit + 1, limit, ctrl.signal);
      } finally {
        clearTimeout(timeout);
      }
      for (const o of result.offers) {
        const n = normalize(o);
        if (n) collected.push(n);
      }
      if (!result.hasMore) break;
    }
    return { ok: true, offers: collected };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

async function testConnection(
  config: ConnectionConfig,
): Promise<TestConnectionResult> {
  try {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 15000);
    let result;
    try {
      result = await callOffersSearch(config, 1, 5, ctrl.signal);
    } finally {
      clearTimeout(timeout);
    }
    const sample = result.offers[0] ? normalize(result.offers[0]) ?? undefined : undefined;
    return { ok: true, sample_count: result.offers.length, sample };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

const client: PlatformClient = { PLATFORM_DOCS_URL, fetchOffers, testConnection };
export default client;
