// Custom platform — placeholder for ad-hoc integrations.
// TODO: implement based on whatever bespoke API you need to hit.
// Pattern: use `config.extraConfig` for any platform-specific options.

import type { PlatformClient } from "./types";

export const PLATFORM_DOCS_URL = "";

const client: PlatformClient = {
  PLATFORM_DOCS_URL,
  fetchOffers: async () => ({ ok: false, error: "Custom platform client not yet implemented" }),
  testConnection: async () => ({ ok: false, error: "Custom platform client not yet implemented" }),
};
export default client;
