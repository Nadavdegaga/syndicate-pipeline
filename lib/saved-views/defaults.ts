// Default saved views (not stored in DB). Lives in a non-"use server" module
// so we can export the object literal — server-actions files can only export
// async functions.

import type { FilterSpec } from "@/lib/utils/filter";

export type EntityType = "contact" | "network" | "offer" | "wishlist" | "demand";

export type SavedView = {
  id: string;
  name: string;
  entity_type: EntityType;
  filters: FilterSpec;
  brand_scope: string | null;
  is_default: boolean;
  created_at: string;
};

export type DefaultView = {
  id: string;
  name: string;
  entity_type: EntityType;
  filters: FilterSpec;
  is_default: true;
};

export const DEFAULT_VIEWS: Record<EntityType, DefaultView[]> = {
  contact: [
    {
      id: "default:all_contacts",
      name: "All Contacts",
      entity_type: "contact",
      filters: { combinator: "and", conditions: [] },
      is_default: true,
    },
    {
      id: "default:pending_followup",
      name: "Pending Follow-up",
      entity_type: "contact",
      filters: {
        combinator: "or",
        conditions: [
          { field: "status_nomi", op: "contains", value: "Sent" },
          { field: "status_startech", op: "contains", value: "Sent" },
          { field: "status_luminarix", op: "contains", value: "Sent" },
        ],
      },
      is_default: true,
    },
    {
      id: "default:active_conversations",
      name: "Active Conversations",
      entity_type: "contact",
      filters: {
        combinator: "or",
        conditions: [
          { field: "status_nomi", op: "contains", value: "LD" },
          { field: "status_startech", op: "contains", value: "LD" },
          { field: "status_luminarix", op: "contains", value: "LD" },
          { field: "status_nomi", op: "contains", value: "Talking" },
          { field: "status_startech", op: "contains", value: "Talking" },
          { field: "status_luminarix", op: "contains", value: "Talking" },
        ],
      },
      is_default: true,
    },
    {
      id: "default:a_tier_contacts",
      name: "A-Tier Network Contacts",
      entity_type: "contact",
      filters: {
        combinator: "and",
        conditions: [{ field: "network_tier", op: "is", value: "A" }],
      },
      is_default: true,
    },
  ],
  network: [
    {
      id: "default:all_networks",
      name: "All Networks",
      entity_type: "network",
      filters: { combinator: "and", conditions: [] },
      is_default: true,
    },
    {
      id: "default:a_tier",
      name: "A-Tier Only",
      entity_type: "network",
      filters: {
        combinator: "and",
        conditions: [{ field: "tier", op: "is", value: "A" }],
      },
      is_default: true,
    },
  ],
  offer: [
    {
      id: "default:all_offers",
      name: "All Offers",
      entity_type: "offer",
      filters: { combinator: "and", conditions: [] },
      is_default: true,
    },
    {
      id: "default:active_offers",
      name: "Active",
      entity_type: "offer",
      filters: {
        combinator: "and",
        conditions: [{ field: "status", op: "is", value: "active" }],
      },
      is_default: true,
    },
  ],
  wishlist: [
    {
      id: "default:all_wishlists",
      name: "All Wishlists",
      entity_type: "wishlist",
      filters: { combinator: "and", conditions: [] },
      is_default: true,
    },
    {
      id: "default:open_wishlists",
      name: "Open",
      entity_type: "wishlist",
      filters: {
        combinator: "and",
        conditions: [{ field: "status", op: "is", value: "open" }],
      },
      is_default: true,
    },
  ],
  demand: [
    {
      id: "default:all_demand",
      name: "All Demand",
      entity_type: "demand",
      filters: { combinator: "and", conditions: [] },
      is_default: true,
    },
    {
      id: "default:open_demand",
      name: "Open",
      entity_type: "demand",
      filters: {
        combinator: "and",
        conditions: [{ field: "status", op: "is", value: "open" }],
      },
      is_default: true,
    },
  ],
};
