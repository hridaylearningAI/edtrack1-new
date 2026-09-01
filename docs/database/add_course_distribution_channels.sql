-- Course distribution: control portfolio site listing vs partner read-only API exposure.
-- Run in Supabase after courses table exists.

ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS listed_on_portfolio BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS partner_api_enabled BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.courses.listed_on_portfolio IS
  'When true, course appears on the public EdTec Online portfolio catalog (edtec.online).';

COMMENT ON COLUMN public.courses.partner_api_enabled IS
  'When true, course is included in GET /api/v1/partner/courses for authenticated API clients.';

CREATE INDEX IF NOT EXISTS idx_courses_listed_on_portfolio
  ON public.courses (listed_on_portfolio)
  WHERE listed_on_portfolio = true;

CREATE INDEX IF NOT EXISTS idx_courses_partner_api_enabled
  ON public.courses (partner_api_enabled)
  WHERE partner_api_enabled = true;

-- Optional per-client API keys (v1.1+). Env PARTNER_API_KEYS still works for a shared staging key.
CREATE TABLE IF NOT EXISTS public.partner_api_clients (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  api_key_prefix TEXT NOT NULL,
  api_key_hash TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.partner_api_clients IS
  'External partners that consume the read-only /api/v1/partner/courses JSON API.';

CREATE TABLE IF NOT EXISTS public.partner_api_course_grants (
  partner_client_id BIGINT NOT NULL REFERENCES public.partner_api_clients(id) ON DELETE CASCADE,
  course_id BIGINT NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (partner_client_id, course_id)
);

COMMENT ON TABLE public.partner_api_course_grants IS
  'Per-partner course allowlist. When grants exist for a client, only granted courses are returned (must also be partner_api_enabled and live).';

CREATE INDEX IF NOT EXISTS idx_partner_api_course_grants_course
  ON public.partner_api_course_grants (course_id);
