-- 002_app_tables.sql
-- Schema addendum for EPIC 2 app: saved_views + ask_history.
-- Run this in the Supabase SQL editor (or via Supabase CLI) after the
-- original migration (001) that created entity_type and brand_label enums.

-- Saved views (per user)
create table if not exists saved_views (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  entity_type entity_type not null,
  filters jsonb not null,
  brand_scope brand_label,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_saved_views_user on saved_views(user_id);

-- Ask history (logged questions + answers)
create table if not exists ask_history (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete set null,
  question text not null,
  answer text,
  tool_calls jsonb,
  input_tokens int,
  output_tokens int,
  brand_context brand_label,
  created_at timestamptz not null default now()
);
create index if not exists idx_ask_history_user on ask_history(user_id, created_at desc);

-- RLS
alter table saved_views enable row level security;
alter table ask_history enable row level security;

drop policy if exists "users_own_views" on saved_views;
create policy "users_own_views" on saved_views
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "users_own_ask_history" on ask_history;
create policy "users_own_ask_history" on ask_history
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
