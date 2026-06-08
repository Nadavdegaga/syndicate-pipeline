// Nomi platform client — runs on Affise's API.
// Uses connection-level credentials (api_key + base_url) stored in platform_connections.

import type {
  ConnectionConfig,
  FetchOffersResult,
  NormalizedOffer,
  PlatformClient,
  TestConnectionResult,
} from "./types";

export const PLATFORM_DOCS_URL =
  "https://affise.atlassian.net/wiki/spaces/Affise/pages/2785706/3.0+API";

type AffiseOffer = {
  id?: number | string;
  offer_id?: number | string;
  title?: string;
  name?: string;
  advertiser?: { name?: string } | string;
  categories?: Array<string | { name?: string }>;
  preview_url?: string;
  status?: string;
  countries?: string[];
  payments?: Array<{ revenue?: number; type?: string; countries?: string[] }>;
  payouts?: Array<{ revenue?: number; type?: string }>;
};

function normalize(raw: AffiseOffer): NormalizedOffer | null {
  const id = raw.id ?? raw.offer_id;
  const name = raw.title ?? raw.name;
  if (id === undefined || !name) return null;

  const advertiser =
    typeof raw.advertiser === "string"
      ? raw.advertiser
      : raw.advertiser?.name ?? null;

  const vertical = Array.isArray(raw.categories)
    ? raw.categories
        .map((c) => (typeof c === "string" ? c : c?.name))
        .filter((c): c is string => !!c)
        .join(", ") || null
    : null;

  const firstPayment =
    raw.payments?.[0] ?? (raw.payouts ? raw.payouts[0] : undefined);
  const payout = firstPayment?.revenue
    ? `$${firstPayment.revenue}${firstPayment.type ? " " + firstPayment.type : ""}`
    : null;

  return {
    platform_offer_id: String(id),
    name,
    advertiser,
    vertical,
    payout,
    countries: raw.countries ?? [],
    traffic_sources: [],
    status: raw.status ?? null,
    preview_url: raw.preview_url ?? null,
    raw_data: raw,
  };
}

async function callOffersPage(
  config: ConnectionConfig,
  page: number,
  pageSize: number,
  signal?: AbortSignal,
): Promise<{ offers: AffiseOffer[]; hasMore: boolean }> {
  const base = (config.baseUrl || "").replace(/\/+$/, "");
  if (!base) throw new Error("Nomi base URL is required (e.g. https://api.<your-nomi>.com/3.0)");
  const url = `${base}/offers?page=${page}&limit=${pageSize}`;
  const r = await fetch(url, {
    headers: {
      "API-Key": config.apiKey,
      "Content-Type": "application/json",
    },
    signal,
  });
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`Nomi HTTP ${r.status}: ${text.slice(0, 200)}`);
  }
  const json = await r.json();
  const offers: AffiseOffer[] = json.offers ?? json.data?.offers ?? [];
  const totalPages =
    json.pagination?.total_count !== undefined
      ? Math.ceil((json.pagination.total_count as number) / pageSize)
      : undefined;
  const hasMore =
    totalPages !== undefined ? page < totalPages : offers.length === pageSize;
  return { offers, hasMore };
}

async function fetchOffers(config: ConnectionConfig): Promise<FetchOffersResult> {
  try {
    const pageSize = 100;
    const maxPages = 50;
    const collected: NormalizedOffer[] = [];
    for (let page = 1; page <= maxPages; page++) {
      const ctrl = new AbortController();
      const timeout = setTimeout(() => ctrl.abort(), 30000);
      let result;
      try {
        result = await callOffersPage(config, page, pageSize, ctrl.signal);
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
      result = await callOffersPage(config, 1, 5, ctrl.signal);
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
