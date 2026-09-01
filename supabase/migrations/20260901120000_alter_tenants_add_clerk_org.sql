-- Extend existing multi-tenant schema on wyhrdtxqnudedceeujgz (hriday_goswami@edtec.edu.au)
-- Do NOT run create_tenants_table.sql on this project — tenants table already exists.

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS clerk_organization_id TEXT,
  ADD COLUMN IF NOT EXISTS contact_email TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS tenants_clerk_organization_id_unique
  ON public.tenants (clerk_organization_id)
  WHERE clerk_organization_id IS NOT NULL;

-- Seed canonical Edtec tenant (idempotent)
INSERT INTO public.tenants (
  name,
  slug,
  plan,
  status,
  seat_limit,
  campus_count,
  clerk_organization_id,
  contact_email,
  primary_domain
)
VALUES (
  'Edtec.online',
  'edtec-online',
  'institution',
  'active',
  500,
  1,
  'org_3IPkCtWUsZxgzwQWWz3WBjwnmOc',
  'support@edtec.online',
  'edtec.online'
)
ON CONFLICT (slug) DO UPDATE
SET
  clerk_organization_id = COALESCE(public.tenants.clerk_organization_id, EXCLUDED.clerk_organization_id),
  contact_email = COALESCE(public.tenants.contact_email, EXCLUDED.contact_email),
  primary_domain = COALESCE(public.tenants.primary_domain, EXCLUDED.primary_domain),
  updated_at = NOW();
