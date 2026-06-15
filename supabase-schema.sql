-- ============================================================
-- GeniusOne Typing Portal — Supabase Schema
-- Run this in: Supabase Dashboard > SQL Editor > New Query
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'typist' CHECK (role IN ('admin', 'typist')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS property_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_no TEXT UNIQUE NOT NULL,
  search_type TEXT NOT NULL DEFAULT 'Full Search',
  creation_date DATE,
  effective_date DATE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','in_progress','completed','reviewed')),
  address TEXT,
  county_state TEXT,
  zip_code TEXT,
  owner TEXT,
  buyer_borrower TEXT,
  apn TEXT,
  land_value NUMERIC(14,2),
  improvements_value NUMERIC(14,2),
  total_value NUMERIC(14,2),
  exempt TEXT DEFAULT 'None',
  spl_assess TEXT,
  brief_legal TEXT,
  legal_description TEXT,
  chain_of_title TEXT,
  plat_dated DATE,
  plat_recorded DATE,
  plat_bk_pg_doc TEXT,
  plat_instrument_no TEXT,
  plat_notes TEXT,
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tax_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id UUID NOT NULL REFERENCES property_records(id) ON DELETE CASCADE,
  tax_type TEXT, amount NUMERIC(12,2),
  status TEXT CHECK (status IN ('Paid','Due','Delinquent')),
  entry_date DATE, sort_order INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS vesting_deeds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id UUID NOT NULL REFERENCES property_records(id) ON DELETE CASCADE,
  deed_type TEXT, dated DATE, recorded DATE, bk_pg_doc TEXT,
  instrument_number TEXT, consideration NUMERIC(14,2),
  grantor TEXT, grantee TEXT, notes TEXT, sort_order INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS open_mortgages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id UUID NOT NULL REFERENCES property_records(id) ON DELETE CASCADE,
  doc_type TEXT, mortgage_type TEXT, dated DATE, recorded DATE,
  bk_pg_doc TEXT, instrument_number TEXT, amount NUMERIC(14,2),
  borrower TEXT, lender TEXT, trustee TEXT, notes TEXT,
  mod_dated DATE, mod_recorded DATE, mod_bk_pg_doc TEXT, mod_instrument_number TEXT, mod_notes TEXT,
  lp_dated DATE, lp_recorded DATE, lp_bk_pg_doc TEXT, lp_instrument_number TEXT, lp_notes TEXT,
  sort_order INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS satellite_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id UUID NOT NULL REFERENCES property_records(id) ON DELETE CASCADE,
  title TEXT, doc_type TEXT, dated DATE, recorded DATE,
  bk_pg_doc TEXT, instrument_number TEXT, assignor TEXT, assignee TEXT,
  notes TEXT, sort_order INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS liens_judgements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id UUID NOT NULL REFERENCES property_records(id) ON DELETE CASCADE,
  doc_name TEXT, dated DATE, recorded DATE, bk_pg_doc TEXT,
  instrument_number TEXT, case_number TEXT, amount NUMERIC(12,2),
  creditor TEXT, debtor TEXT, sort_order INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS rows_ccrs_easements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id UUID NOT NULL REFERENCES property_records(id) ON DELETE CASCADE,
  doc_name TEXT, dated DATE, recorded DATE, bk_pg_doc TEXT,
  instrument_number TEXT, notes TEXT, sort_order INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS divorce_probate (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id UUID NOT NULL REFERENCES property_records(id) ON DELETE CASCADE,
  doc_name TEXT, dated DATE, recorded DATE, bk_pg_doc TEXT,
  instrument_number TEXT, notes TEXT, sort_order INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS misc_docs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id UUID NOT NULL REFERENCES property_records(id) ON DELETE CASCADE,
  doc_name TEXT, dated DATE, recorded DATE, bk_pg_doc TEXT,
  instrument_number TEXT, notes TEXT, sort_order INT DEFAULT 0
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_records_order_no ON property_records(order_no);
CREATE INDEX IF NOT EXISTS idx_records_status ON property_records(status);
CREATE INDEX IF NOT EXISTS idx_records_created_by ON property_records(created_by);

-- Auto-update trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_records_updated BEFORE UPDATE ON property_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS - service role has full access
ALTER TABLE property_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_all" ON property_records FOR ALL USING (true);
CREATE POLICY "service_all_users" ON users FOR ALL USING (true);

-- Seed admin (password: Admin@123 — change after first login)
INSERT INTO users (email, full_name, role, password_hash)
VALUES ('admin@geniusonesolutions.com','Admin User','admin',
  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi')
ON CONFLICT (email) DO NOTHING;
