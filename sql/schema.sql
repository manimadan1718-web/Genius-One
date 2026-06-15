-- ============================================================
-- GeniusOne Typing Portal — Supabase Schema
-- Run this entire file in Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ── USERS (handled by Supabase Auth, this is the profile table) ──
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text not null,
  role text not null default 'typist' check (role in ('admin', 'typist', 'reviewer')),
  is_active boolean default true,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users can read own profile"
  on public.profiles for select using (auth.uid() = id);

create policy "Admins can read all profiles"
  on public.profiles for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- ── ORDERS ──────────────────────────────────────────────────────
create table public.orders (
  id uuid default uuid_generate_v4() primary key,
  order_no text unique not null,
  search_type text not null default 'Full Search',
  status text not null default 'pending' check (status in ('pending','in_progress','completed','reviewed')),
  created_by uuid references public.profiles(id),
  assigned_to uuid references public.profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.orders enable row level security;

create policy "Authenticated users can read orders"
  on public.orders for select using (auth.role() = 'authenticated');

create policy "Authenticated users can insert orders"
  on public.orders for insert with check (auth.role() = 'authenticated');

create policy "Authenticated users can update orders"
  on public.orders for update using (auth.role() = 'authenticated');

-- ── PROPERTY INFO ────────────────────────────────────────────────
create table public.property_info (
  id uuid default uuid_generate_v4() primary key,
  order_id uuid references public.orders(id) on delete cascade unique not null,
  address text,
  county_state text,
  zip_code text,
  owner text,
  buyer_borrower text,
  creation_date date,
  effective_date date,
  -- Tax & Assessment
  apn text,
  land numeric(15,2),
  improvements numeric(15,2),
  total numeric(15,2),
  exempt text,
  spl_assess text,
  brief_legal text,
  -- Bottom sections
  legal_description text,
  chain_of_title text,
  plat_map_dated date,
  plat_map_recorded date,
  plat_map_bkpgdoc text,
  plat_map_instrument text,
  plat_map_notes text,
  updated_at timestamptz default now()
);

alter table public.property_info enable row level security;
create policy "Authenticated users full access on property_info"
  on public.property_info for all using (auth.role() = 'authenticated');

-- ── TAX ENTRIES ──────────────────────────────────────────────────
create table public.tax_entries (
  id uuid default uuid_generate_v4() primary key,
  order_id uuid references public.orders(id) on delete cascade not null,
  tax_type text,
  amount numeric(12,2),
  status text check (status in ('Paid','Due','Delinquent')),
  entry_date date,
  sort_order int default 0
);

alter table public.tax_entries enable row level security;
create policy "Authenticated users full access on tax_entries"
  on public.tax_entries for all using (auth.role() = 'authenticated');

-- ── VESTING DEEDS ────────────────────────────────────────────────
create table public.vesting_deeds (
  id uuid default uuid_generate_v4() primary key,
  order_id uuid references public.orders(id) on delete cascade not null,
  deed_type text,
  dated date,
  recorded date,
  bkpgdoc text,
  instrument_number text,
  consideration numeric(15,2),
  grantor text,
  grantee text,
  notes text,
  sort_order int default 0
);

alter table public.vesting_deeds enable row level security;
create policy "Authenticated users full access on vesting_deeds"
  on public.vesting_deeds for all using (auth.role() = 'authenticated');

-- ── OPEN MORTGAGES ───────────────────────────────────────────────
create table public.open_mortgages (
  id uuid default uuid_generate_v4() primary key,
  order_id uuid references public.orders(id) on delete cascade not null,
  doc_type text,
  type text,
  dated date,
  recorded date,
  bkpgdoc text,
  instrument_number text,
  amount numeric(15,2),
  borrower text,
  lender text,
  trustee text,
  notes text,
  -- modification
  mod_dated date,
  mod_recorded date,
  mod_bkpgdoc text,
  mod_instrument text,
  mod_notes text,
  -- lis pendens
  lp_dated date,
  lp_recorded date,
  lp_bkpgdoc text,
  lp_instrument text,
  lp_notes text,
  sort_order int default 0
);

alter table public.open_mortgages enable row level security;
create policy "Authenticated users full access on open_mortgages"
  on public.open_mortgages for all using (auth.role() = 'authenticated');

-- ── SATELLITE DOCUMENTS ──────────────────────────────────────────
create table public.satellite_docs (
  id uuid default uuid_generate_v4() primary key,
  order_id uuid references public.orders(id) on delete cascade not null,
  title text,
  dated date,
  recorded date,
  bkpgdoc text,
  instrument_number text,
  doc_type text,
  assignor text,
  assignee text,
  notes text,
  sort_order int default 0
);

alter table public.satellite_docs enable row level security;
create policy "Authenticated users full access on satellite_docs"
  on public.satellite_docs for all using (auth.role() = 'authenticated');

-- ── LIENS & JUDGEMENTS ───────────────────────────────────────────
create table public.liens_judgements (
  id uuid default uuid_generate_v4() primary key,
  order_id uuid references public.orders(id) on delete cascade not null,
  doc_name text,
  dated date,
  recorded date,
  bkpgdoc text,
  instrument_number text,
  case_number text,
  amount numeric(12,2),
  creditor text,
  debtor text,
  sort_order int default 0
);

alter table public.liens_judgements enable row level security;
create policy "Authenticated users full access on liens_judgements"
  on public.liens_judgements for all using (auth.role() = 'authenticated');

-- ── ROWS CCRs EASEMENTS ──────────────────────────────────────────
create table public.rows_ccrs (
  id uuid default uuid_generate_v4() primary key,
  order_id uuid references public.orders(id) on delete cascade not null,
  doc_name text,
  dated date,
  recorded date,
  bkpgdoc text,
  instrument_number text,
  notes text,
  sort_order int default 0
);

alter table public.rows_ccrs enable row level security;
create policy "Authenticated users full access on rows_ccrs"
  on public.rows_ccrs for all using (auth.role() = 'authenticated');

-- ── DIVORCE / PROBATE ────────────────────────────────────────────
create table public.divorce_probate (
  id uuid default uuid_generate_v4() primary key,
  order_id uuid references public.orders(id) on delete cascade not null,
  doc_name text,
  dated date,
  recorded date,
  bkpgdoc text,
  instrument_number text,
  notes text,
  sort_order int default 0
);

alter table public.divorce_probate enable row level security;
create policy "Authenticated users full access on divorce_probate"
  on public.divorce_probate for all using (auth.role() = 'authenticated');

-- ── MISC DOCS ────────────────────────────────────────────────────
create table public.misc_docs (
  id uuid default uuid_generate_v4() primary key,
  order_id uuid references public.orders(id) on delete cascade not null,
  doc_name text,
  dated date,
  recorded date,
  bkpgdoc text,
  instrument_number text,
  notes text,
  sort_order int default 0
);

alter table public.misc_docs enable row level security;
create policy "Authenticated users full access on misc_docs"
  on public.misc_docs for all using (auth.role() = 'authenticated');

-- ── AUTO-UPDATE updated_at TRIGGER ──────────────────────────────
create or replace function update_updated_at()
returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

create trigger trg_orders_updated before update on public.orders
  for each row execute function update_updated_at();

create trigger trg_property_updated before update on public.property_info
  for each row execute function update_updated_at();

-- ── PROFILE AUTO-CREATE ON SIGNUP ────────────────────────────────
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name','New User'), 'typist');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
