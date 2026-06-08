-- 005_nomi_startech_stats.sql
-- Add nomi and startech as platform_kind enum values and create their daily stats tables.
-- Mirrors the affise_daily_stats pattern from 004_epic4.sql.

-- ========= Extend platform_kind enum =========

do $$ begin
  if not exists (
    select 1 from pg_enum
    where enumlabel = 'nomi'
    and enumtypid = (select oid from pg_type where typname = 'platform_kind')
  ) then
    alter type platform_kind add value 'nomi';
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_enum
    where enumlabel = 'startech'
    and enumtypid = (select oid from pg_type where typname = 'platform_kind')
  ) then
    alter type platform_kind add value 'startech';
  end if;
end $$;

-- ========= Nomi daily stats =========

create table if not exists nomi_daily_stats (
  id uuid primary key default gen_random_uuid(),
  report_date date not null,
  offer_id text not null,
  source text not null default 'nomi',
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
create index if not exists idx_nomi_daily_date on nomi_daily_stats(report_date desc);
create index if not exists idx_nomi_daily_offer on nomi_daily_stats(offer_id, report_date desc);

-- ========= StarTech daily stats =========

create table if not exists startech_daily_stats (
  id uuid primary key default gen_random_uuid(),
  report_date date not null,
  offer_id text not null,
  source text not null default 'startech',
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
create index if not exists idx_startech_daily_date on startech_daily_stats(report_date desc);
create index if not exists idx_startech_daily_offer on startech_daily_stats(offer_id, report_date desc);

-- ========= RLS =========

alter table nomi_daily_stats enable row level security;
alter table startech_daily_stats enable row level security;

drop policy if exists "nomi_daily_stats_auth_all" on nomi_daily_stats;
create policy "nomi_daily_stats_auth_all" on nomi_daily_stats
  for all to authenticated using (true) with check (true);

drop policy if exists "startech_daily_stats_auth_all" on startech_daily_stats;
create policy "startech_daily_stats_auth_all" on startech_daily_stats
  for all to authenticated using (true) with check (true);
