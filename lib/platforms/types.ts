// Shared types for platform clients.

export type ConnectionConfig = {
  baseUrl: string;
  apiKey: string;
  apiSecret?: string | null;
  extraConfig?: Record<string, unknown>;
};

export type NormalizedOffer = {
  platform_offer_id: string;
  name: string;
  advertiser?: string | null;
  vertical?: string | null;
  payout?: string | null;
  countries?: string[];
  traffic_sources?: string[];
  status?: string | null;
  preview_url?: string | null;
  raw_data?: unknown;
};

export type FetchOffersResult =
  | { ok: true; offers: NormalizedOffer[] }
  | { ok: false; error: string };

export type TestConnectionResult =
  | { ok: true; sample_count: number; sample?: NormalizedOffer }
  | { ok: false; error: string };

export type PlatformClient = {
  PLATFORM_DOCS_URL: string;
  fetchOffers: (config: ConnectionConfig) => Promise<FetchOffersResult>;
  testConnection: (config: ConnectionConfig) => Promise<TestConnectionResult>;
};
