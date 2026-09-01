-- Align partner_api_course_grants.course_id with courses.id (BIGINT in this Supabase project).
-- Run only if verification shows courses.id = bigint but course_id = integer.

DROP TABLE IF EXISTS public.partner_api_course_grants;

CREATE TABLE public.partner_api_course_grants (
  partner_client_id BIGINT NOT NULL
    REFERENCES public.partner_api_clients(id) ON DELETE CASCADE,
  course_id BIGINT NOT NULL
    REFERENCES public.courses(id) ON DELETE CASCADE,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (partner_client_id, course_id)
);

COMMENT ON TABLE public.partner_api_course_grants IS
  'Per-partner course allowlist. When grants exist for a client, only granted courses are returned (must also be partner_api_enabled and live).';

CREATE INDEX IF NOT EXISTS idx_partner_api_course_grants_course
  ON public.partner_api_course_grants (course_id);
