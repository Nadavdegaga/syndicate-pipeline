-- 006_brand_context_columns.sql
-- Add brand_context to offers, publisher_wishlists, and network_demand.
-- NULL = visible to all brands (shared record).
-- Non-null = scoped to that brand only (when filtering by brand).
-- Mirrors the brand_context pattern already used on smart_insights and email_messages.

alter table offers              add column if not exists brand_context brand_label;
alter table publisher_wishlists add column if not exists brand_context brand_label;
alter table network_demand      add column if not exists brand_context brand_label;

create index if not exists idx_offers_brand     on offers(brand_context);
create index if not exists idx_wishlists_brand  on publisher_wishlists(brand_context);
create index if not exists idx_demand_brand     on network_demand(brand_context);
