ALTER TABLE partners
  ADD COLUMN IF NOT EXISTS country_code TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS partner_code TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_partners_partner_code_unique
  ON partners (partner_code)
  WHERE partner_code IS NOT NULL;

