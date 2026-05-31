// Dispatch by platform_kind enum value.

import everflow from "./everflow";
import cake from "./cake";
import affise from "./affise";
import tune from "./tune";
import hasoffers from "./hasoffers";
import customClient from "./custom";
import type { PlatformClient } from "./types";

export type PlatformKind =
  | "everflow"
  | "cake"
  | "affise"
  | "tune"
  | "hasoffers"
  | "custom";

const REGISTRY: Record<PlatformKind, PlatformClient> = {
  everflow,
  cake,
  affise,
  tune,
  hasoffers,
  custom: customClient,
};

export function getPlatformClient(kind: PlatformKind): PlatformClient {
  const c = REGISTRY[kind];
  if (!c) throw new Error(`Unknown platform: ${kind}`);
  return c;
}

export const PLATFORM_KINDS = Object.keys(REGISTRY) as PlatformKind[];

export function platformLabel(kind: PlatformKind): string {
  return (
    {
      everflow: "Everflow",
      cake: "Cake",
      affise: "Affise",
      tune: "Tune",
      hasoffers: "HasOffers",
      custom: "Custom",
    }[kind] ?? kind
  );
}
