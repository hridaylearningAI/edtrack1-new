-- Multi-tenant scoping + platform audit log (wyhrdtxqnudedceeujgz)
-- Run on production Supabase after alter_tenants_add_clerk_org.sql

-- Link users to tenants
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);

CREATE INDEX IF NOT EXISTS users_tenant_id_idx ON public.users (tenant_id);

-- Backfill existing users to canonical Edtec tenant
UPDATE public.users
SET tenant_id = (
  SELECT id FROM public.tenants WHERE slug = 'edtec-online' LIMIT 1
)
WHERE tenant_id IS NULL
  AND EXISTS (SELECT 1 FROM public.tenants WHERE slug = 'edtec-online');

-- Platform audit log for super-admin actions
CREATE TABLE IF NOT EXISTS public.platform_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  actor_email TEXT,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS platform_audit_logs_tenant_id_idx
  ON public.platform_audit_logs (tenant_id);

CREATE INDEX IF NOT EXISTS platform_audit_logs_created_at_idx
  ON public.platform_audit_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS platform_audit_logs_action_idx
  ON public.platform_audit_logs (action);
