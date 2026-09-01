ALTER TABLE carts
  ADD COLUMN IF NOT EXISTS partner_id BIGINT,
  ADD COLUMN IF NOT EXISTS partner_code TEXT,
  ADD COLUMN IF NOT EXISTS partner_name TEXT,
  ADD COLUMN IF NOT EXISTS partner_phone TEXT,
  ADD COLUMN IF NOT EXISTS partner_applied_at TIMESTAMPTZ;

ALTER TABLE purchases
  ADD COLUMN IF NOT EXISTS partner_id BIGINT,
  ADD COLUMN IF NOT EXISTS partner_code TEXT,
  ADD COLUMN IF NOT EXISTS partner_name TEXT,
  ADD COLUMN IF NOT EXISTS partner_phone TEXT;

ALTER TABLE enrollments
  ADD COLUMN IF NOT EXISTS referred_by_partner_id BIGINT,
  ADD COLUMN IF NOT EXISTS referred_by_partner_code TEXT;

CREATE INDEX IF NOT EXISTS idx_carts_partner_id ON carts (partner_id);
CREATE INDEX IF NOT EXISTS idx_carts_partner_code ON carts (partner_code);
CREATE INDEX IF NOT EXISTS idx_purchases_partner_id ON purchases (partner_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_referred_partner_id ON enrollments (referred_by_partner_id);

