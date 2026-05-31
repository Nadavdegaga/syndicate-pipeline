-- 003_feedback.sql
-- In-app feedback inbox for partners to flag bugs / confusion / suggestions
-- without leaving the workspace. Lives alongside saved_views + ask_history.

create table if not exists feedback (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (category in ('bug','confusion','missing_feature','suggestion','other')),
  page_url text,
  brand_context brand_label,
  message text not null,
  status text not null default 'open' check (status in ('open','reviewing','planned','done','wontfix')),
  admin_notes text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists idx_feedback_status on feedback(status, created_at desc);
create index if not exists idx_feedback_user on feedback(user_id, created_at desc);

alter table feedback enable row level security;

-- Anyone authenticated can insert feedback.
drop policy if exists "feedback_insert_authenticated" on feedback;
create policy "feedback_insert_authenticated" on feedback
  for insert to authenticated
  with check (user_id = auth.uid());

-- Anyone authenticated can read all feedback (3-user team — admin gate is in
-- the app layer; we'll tighten this when partner count grows).
drop policy if exists "feedback_select_authenticated" on feedback;
create policy "feedback_select_authenticated" on feedback
  for select to authenticated
  using (true);

-- Anyone authenticated can update feedback (status + admin_notes). Admin gate
-- in app layer; if needed we can split with a `service_role` admin policy.
drop policy if exists "feedback_update_authenticated" on feedback;
create policy "feedback_update_authenticated" on feedback
  for update to authenticated
  using (true)
  with check (true);
