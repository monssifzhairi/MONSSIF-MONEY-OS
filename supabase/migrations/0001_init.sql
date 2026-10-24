-- ─────────────────────────────────────────────────────────────────────────────
-- MONSSIF MONEY OS — initial schema (Supabase / PostgreSQL)
-- Run this in the Supabase SQL editor (or `supabase db push`) BEFORE enabling
-- Supabase mode in the app.
--
-- Design notes
--  * UUID primary keys, created/updated timestamps, foreign keys, checks.
--  * The opening balance lives on `accounts` — never as a transaction row —
--    so it can be initialized exactly once and edited only via Settings.
--  * Row Level Security on every table: a signed-in user can only read or
--    write their own rows. No table is public.
-- ─────────────────────────────────────────────────────────────────────────────

create extension if not exists "pgcrypto";

-- ─── profiles ────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text,
  full_name   text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ─── accounts ────────────────────────────────────────────────────────────────
create table if not exists public.accounts (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null references public.profiles (id) on delete cascade,
  name                   text not null default 'Main account',
  currency               text not null default 'MAD' check (currency = 'MAD'),
  opening_balance        numeric(12, 2) not null default 0
                           check (opening_balance >= 0 and opening_balance <= 999999999.99),
  -- Set exactly once when the starting balance is initialized.
  opening_balance_set_at timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

-- One account per user keeps "initialize the opening balance exactly once"
-- enforceable at the database level.
create unique index if not exists accounts_user_id_key on public.accounts (user_id);

-- ─── transactions ────────────────────────────────────────────────────────────
create table if not exists public.transactions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  account_id  uuid not null references public.accounts (id) on delete cascade,
  type        text not null check (type in ('income', 'expense')),
  amount      numeric(12, 2) not null check (amount > 0 and amount <= 999999999.99),
  category    text not null check (char_length(category) between 1 and 80),
  date        date not null,
  description text check (char_length(description) <= 200),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists transactions_user_date_idx
  on public.transactions (user_id, date desc);
create index if not exists transactions_user_category_idx
  on public.transactions (user_id, category);
create index if not exists transactions_user_type_idx
  on public.transactions (user_id, type);
create index if not exists transactions_account_idx
  on public.transactions (account_id);

-- ─── financial_goals ─────────────────────────────────────────────────────────
create table if not exists public.financial_goals (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  account_id   uuid not null references public.accounts (id) on delete cascade,
  name         text not null check (char_length(name) between 1 and 80),
  target_amount numeric(12, 2) not null check (target_amount > 0 and target_amount <= 999999999.99),
  deadline     date not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists financial_goals_user_idx
  on public.financial_goals (user_id, deadline);

-- ─── updated_at trigger ──────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_updated_at on public.profiles;
create trigger set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.accounts;
create trigger set_updated_at before update on public.accounts
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.transactions;
create trigger set_updated_at before update on public.transactions
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.financial_goals;
create trigger set_updated_at before update on public.financial_goals
  for each row execute function public.set_updated_at();

-- ─── auto-create profile on signup ───────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── Row Level Security ──────────────────────────────────────────────────────
alter table public.profiles        enable row level security;
alter table public.accounts        enable row level security;
alter table public.transactions    enable row level security;
alter table public.financial_goals enable row level security;

-- profiles: a user sees and edits only their own row.
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- accounts
drop policy if exists "accounts_select_own" on public.accounts;
create policy "accounts_select_own"
  on public.accounts for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "accounts_insert_own" on public.accounts;
create policy "accounts_insert_own"
  on public.accounts for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "accounts_update_own" on public.accounts;
create policy "accounts_update_own"
  on public.accounts for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "accounts_delete_own" on public.accounts;
create policy "accounts_delete_own"
  on public.accounts for delete
  to authenticated
  using (auth.uid() = user_id);

-- transactions
drop policy if exists "transactions_select_own" on public.transactions;
create policy "transactions_select_own"
  on public.transactions for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "transactions_insert_own" on public.transactions;
create policy "transactions_insert_own"
  on public.transactions for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.accounts a
      where a.id = account_id and a.user_id = auth.uid()
    )
  );

drop policy if exists "transactions_update_own" on public.transactions;
create policy "transactions_update_own"
  on public.transactions for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "transactions_delete_own" on public.transactions;
create policy "transactions_delete_own"
  on public.transactions for delete
  to authenticated
  using (auth.uid() = user_id);

-- financial_goals
drop policy if exists "financial_goals_select_own" on public.financial_goals;
create policy "financial_goals_select_own"
  on public.financial_goals for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "financial_goals_insert_own" on public.financial_goals;
create policy "financial_goals_insert_own"
  on public.financial_goals for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.accounts a
      where a.id = account_id and a.user_id = auth.uid()
    )
  );

drop policy if exists "financial_goals_update_own" on public.financial_goals;
create policy "financial_goals_update_own"
  on public.financial_goals for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "financial_goals_delete_own" on public.financial_goals;
create policy "financial_goals_delete_own"
  on public.financial_goals for delete
  to authenticated
  using (auth.uid() = user_id);

-- No anonymous access to financial data: anon role has no policies, and the
-- tables are not exposed through the public schema to unauthenticated roles.
