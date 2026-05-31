// Everflow REST API client.
// Docs: https://developers.everflow.io/

import type {
  ConnectionConfig,
  FetchOffersResult,
  NormalizedOffer,
  PlatformClient,
  TestConnectionResult,
} from "./types";

export const PLATFORM_DOCS_URL = "https://developers.everflow.io/";

const DEFAULT_BASE = "https://api.eflow.team/v1";

type EverflowOffer = {
  network_offer_id?: number | string;
  name?: string;
  advertiser_name?: string;
  vertical_name?: string;
  preview_url?: string;
  offer_status?: string;
  countries?: string[];
  payout_revenue?: {
    entries?: Array<{ payout_type?: string; payout_amount?: number }>;
  };
  traffic_source_ids?: number[];
};

function normalize(raw: EverflowOffer): NormalizedOffer | null {
  if (!raw.name || raw.network_offer_id === undefined) return null;
  const payoutEntry = raw.payout_revenue?.entries?.[0];
  const payout = payoutEntry?.payout_amount
    ? `$${payoutEntry.payout_amount}${payoutEntry.payout_type ? " " + payoutEntry.payout_type : ""}`
    : null;
  return {
    platform_offer_id: String(raw.network_offer_id),
    name: raw.name,
    advertiser: raw.advertiser_name ?? null,
    vertical: raw.vertical_name ?? null,
    payout,
    countries: raw.countries ?? [],
    traffic_sources: (raw.traffic_source_ids ?? []).map(String),
    status: raw.offer_status ?? null,
    preview_url: raw.preview_url ?? null,
    raw_data: raw,
  };
}

async function callOffersPage(
  config: ConnectionConfig,
  page: number,
  pageSize: number,
  signal?: AbortSignal,
): Promise<{ offers: EverflowOffer[]; hasMore: boolean }> {
  const base = (config.baseUrl || DEFAULT_BASE).replace(/\/+$/, "");
  const url = `${base}/networks/offers?page=${page}&page_size=${pageSize}`;
  const r = await fetch(url, {
    headers: {
      "X-Eflow-API-Key": config.apiKey,
      "Content-Type": "application/json",
    },
    signal,
  });
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`Everflow HTTP ${r.status}: ${text.slice(0, 200)}`);
  }
  const json = await r.json();
  // Everflow paginated payload shape: { offers: [...], paging: { page, page_size, total_count } }
  const offers: EverflowOffer[] = json.offers ?? json.data?.offers ?? [];
  const totalCount: number | undefined =
    json.paging?.total_count ?? json.total_count;
  const hasMore =
    totalCount !== undefined ? page * pageSize < totalCount : offers.length === pageSize;
  return { offers, hasMore };
}

async function fetchOffers(config: ConnectionConfig): Promise<FetchOffersResult> {
  try {
    const pageSize = 100;
    const maxPages = 50; // hard cap at 5000 offers per sync
    const collected: NormalizedOffer[] = [];
    for (let page = 1; page <= maxPages; page++) {
      const ctrl = new AbortController();
      const timeout = setTimeout(() => ctrl.abort(), 30000);
      let pageResult;
      try {
        pageResult = await callOffersPage(config, page, pageSize, ctrl.signal);
      } finally {
        clearTimeout(timeout);
      }
      for (const o of pageResult.offers) {
        const n = normalize(o);
        if (n) collected.push(n);
      }
      if (!pageResult.hasMore) break;
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
    let page;
    try {
      page = await callOffersPage(config, 1, 5, ctrl.signal);
    } finally {
      clearTimeout(timeout);
    }
    const sample = page.offers[0] ? normalize(page.offers[0]) ?? undefined : undefined;
    return { ok: true, sample_count: page.offers.length, sample };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

const client: PlatformClient = { PLATFORM_DOCS_URL, fetchOffers, testConnection };
export default client;
