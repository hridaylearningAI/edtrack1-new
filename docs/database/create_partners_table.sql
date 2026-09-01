CREATE TABLE IF NOT EXISTS partners (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  country_code TEXT,
  phone TEXT,
  address TEXT,
  partner_code TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
  join_date DATE,
  avatar TEXT,
  notes TEXT,
  created_by BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_partners_email ON partners (LOWER(email));
CREATE INDEX IF NOT EXISTS idx_partners_status ON partners (status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_partners_partner_code_unique ON partners (partner_code) WHERE partner_code IS NOT NULL;

CREATE OR REPLACE FUNCTION set_partners_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_partners_updated_at ON partners;
CREATE TRIGGER trg_partners_updated_at
BEFORE UPDATE ON partners
FOR EACH ROW
EXECUTE FUNCTION set_partners_updated_at();

