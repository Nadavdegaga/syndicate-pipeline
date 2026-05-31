-- 004_epic4.sql
-- EPIC 4: External integrations + reporting + smart insights + email infra.
--   - Card 4.5: platform_kind, platform_connections, external_offers, sync_runs
--   - Card 4.6: affise_daily_stats, api_ingest_keys
--   - Card 4.2: insight_kind, smart_insights
--   - Card 4.8: email_kind, email_messages
-- All new tables get permissive auth-only RLS (3-user team; admin gating in app layer).

create extension if not exists pg_trgm;

-- ========= Card 4.5: External offer ingestion =========

do $$ begin
  if not exists (select 1 from pg_type where typname = 'platform_kind') then
    create type platform_kind as enum (
      'everflow', 'cake', 'affise', 'tune', 'hasoffers', 'custom'
    );
  end if;
end $$;

create table if not exists platform_connections (
  id uuid primary key default uuid_generate_v4(),
  platform platform_kind not null,
  display_name text not null,
  base_url text not null,
  api_key_encrypted text not null,
  api_secret_encrypted text,
  extra_config jsonb not null default '{}'::jsonb,
  sync_frequency_hours int not null default 24 check (sync_frequency_hours in (12, 24, 48)),
  last_sync_at timestamptz,
  last_sync_status text check (last_sync_status in ('success', 'error', 'running')),
  last_sync_error text,
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists external_offers (
  id uuid primary key default uuid_generate_v4(),
  connection_id uuid not null references platform_connections(id) on delete cascade,
  platform_offer_id text not null,
  name text not null,
  advertiser text,
  vertical text,
  payout text,
  countries text[] not null default '{}',
  traffic_sources text[] not null default '{}',
  status text,
  preview_url text,
  raw_data jsonb,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  is_active boolean not null default true,
  added_to_my_offers boolean not null default false,
  linked_offer_id uuid references offers(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (connection_id, platform_offer_id)
);
create index if not exists idx_external_offers_active on external_offers(connection_id, is_active);
create index if not exists idx_external_offers_added on external_offers(added_to_my_offers);
create index if not exists idx_external_offers_name_trgm on external_offers using gin (name gin_trgm_ops);

create table if not exists sync_runs (
  id uuid primary key default uuid_generate_v4(),
  connection_id uuid not null references platform_connections(id) on delete cascade,
  triggered_by text not null check (triggered_by in ('cron', 'manual')),
  status text not null check (status in ('running', 'success', 'error')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  offers_fetched int not null default 0,
  offers_new int not null default 0,
  offers_updated int not null default 0,
  offers_deactivated int not null default 0,
  error_message text
);
create index if not exists idx_sync_runs_conn on sync_runs(connection_id, started_at desc);

-- ========= Card 4.6: Affise reporting ingest =========

create table if not exists affise_daily_stats (
  id uuid primary key default uuid_generate_v4(),
  report_date date not null,
  offer_id text not null,
  source text not null default 'affise',
  clicks int not null default 0,
  conversions int not null default 0,
  revenue numeric(12, 2) not null default 0,
  cost numeric(12, 2) not null default 0,
  profit numeric(12, 2) generated always as (revenue - cost) stored,
  raw_data jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (report_date, offer_id, source)
);
create index if not exists idx_affise_daily_date on affise_daily_stats(report_date desc);
create index if not exists idx_affise_daily_offer on affise_daily_stats(offer_id, report_date desc);

create table if not exists api_ingest_keys (
  id uuid primary key default uuid_generate_v4(),
  label text not null,
  key_hash text not null unique,
  scopes text[] not null default '{}',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

-- ========= Card 4.2: Smart insights =========

do $$ begin
  if not exists (select 1 from pg_type where typname = 'insight_kind') then
    create type insight_kind as enum (
      'matchmaker_hit', 'followup_reminder', 'cold_atier',
      'new_offer_pitch', 'pending_too_long', 'new_external_offer', 'data_quality'
    );
  end if;
end $$;

create table if not exists smart_insights (
  id uuid primary key default uuid_generate_v4(),
  kind insight_kind not null,
  title text not null,
  body text,
  priority int not null default 50,
  cta_label text,
  cta_href text,
  related_entity_type text,
  related_entity_id uuid,
  brand_context brand_label,
  dismissed boolean not null default false,
  dismissed_at timestamptz,
  dismissed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists idx_insights_active on smart_insights(dismissed, priority, created_at desc);
-- De-dup: don't recreate the same insight if it already exists undismissed.
-- (Postgres allows NULLS NOT DISTINCT from v15; this index works in any version.)
create unique index if not exists idx_insights_dedup
  on smart_insights(kind, coalesce(related_entity_type, ''), coalesce(related_entity_id::text, ''))
  where dismissed = false;

-- ========= Card 4.8: Email infrastructure =========

do $$ begin
  if not exists (select 1 from pg_type where typname = 'email_kind') then
    create type email_kind as enum (
      'transactional', 'notification', 'digest', 'outreach', 'test'
    );
  end if;
end $$;

create table if not exists email_messages (
  id uuid primary key default uuid_generate_v4(),
  kind email_kind not null,
  to_address text not null,
  from_address text not null,
  cc text[],
  bcc text[],
  subject text not null,
  body_html text,
  body_text text,
  status text not null default 'queued' check (status in (
    'queued', 'sent', 'delivered', 'opened', 'clicked',
    'failed', 'bounced', 'complained'
  )),
  provider_message_id text,
  error text,
  sent_at timestamptz,
  related_entity_type text,
  related_entity_id uuid,
  brand_context brand_label,
  sent_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_email_messages_status on email_messages(status, created_at desc);
create index if not exists idx_email_messages_provider on email_messages(provider_message_id)
  where provider_message_id is not null;

-- ========= RLS — permissive auth-only (3-user team; admin gating in app) =========

alter table platform_connections enable row level security;
alter table external_offers enable row level security;
alter table sync_runs enable row level security;
alter table affise_daily_stats enable row level security;
alter table api_ingest_keys enable row level security;
alter table smart_insights enable row level security;
alter table email_messages enable row level security;

drop policy if exists "platform_connections_auth_all" on platform_connections;
create policy "platform_connections_auth_all" on platform_connections
  for all to authenticated using (true) with check (true);

drop policy if exists "external_offers_auth_all" on external_offers;
create policy "external_offers_auth_all" on external_offers
  for all to authenticated using (true) with check (true);

drop policy if exists "sync_runs_auth_all" on sync_runs;
create policy "sync_runs_auth_all" on sync_runs
  for all to authenticated using (true) with check (true);

drop policy if exists "affise_daily_stats_auth_all" on affise_daily_stats;
create policy "affise_daily_stats_auth_all" on affise_daily_stats
  for all to authenticated using (true) with check (true);

drop policy if exists "api_ingest_keys_auth_all" on api_ingest_keys;
create policy "api_ingest_keys_auth_all" on api_ingest_keys
  for all to authenticated using (true) with check (true);

drop policy if exists "smart_insights_auth_all" on smart_insights;
create policy "smart_insights_auth_all" on smart_insights
  for all to authenticated using (true) with check (true);

drop policy if exists "email_messages_auth_all" on email_messages;
create policy "email_messages_auth_all" on email_messages
  for all to authenticated using (true) with check (true);
