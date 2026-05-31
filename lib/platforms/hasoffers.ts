// HasOffers — placeholder.
// TODO: implement. Most legacy HasOffers tenants are now Tune; consider whether you need both.
// Docs: https://developers.tune.com/api/ (Tune is the modern successor)

import type { PlatformClient } from "./types";

export const PLATFORM_DOCS_URL = "https://developers.tune.com/api/";

const client: PlatformClient = {
  PLATFORM_DOCS_URL,
  fetchOffers: async () => ({ ok: false, error: "HasOffers client not yet implemented" }),
  testConnection: async () => ({ ok: false, error: "HasOffers client not yet implemented" }),
};
export default client;
