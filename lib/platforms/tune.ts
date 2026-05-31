// Tune (formerly HasOffers) — placeholder.
// TODO: implement using https://developers.tune.com/api/

import type { PlatformClient } from "./types";

export const PLATFORM_DOCS_URL = "https://developers.tune.com/api/";

const client: PlatformClient = {
  PLATFORM_DOCS_URL,
  fetchOffers: async () => ({ ok: false, error: "Tune client not yet implemented" }),
  testConnection: async () => ({ ok: false, error: "Tune client not yet implemented" }),
};
export default client;
