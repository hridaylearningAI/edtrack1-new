-- Scope institution-owned tables to a tenant.
-- Additive and idempotent: adds tenant_id + index, then backfills existing rows to the
-- canonical Edtec tenant. Skips users / platform_audit_logs (already scoped), tenants itself,
-- and course_categories (shared reference data).

DO $$
DECLARE
  t text;
  canonical uuid;
  tables text[] := ARRAY[
    'students', 'courses', 'course_plans', 'enrollments', 'enrollment_partial_payments',
    'trial_enrollments', 'carts', 'cart_items', 'purchases', 'purchase_items',
    'discounts', 'documents', 'certificates',
    'notifications', 'notification_reads', 'notification_settings',
    'trainers', 'partners', 'partner_api_clients', 'partner_api_course_grants',
    'assessments', 'support_tickets', 'support_ticket_replies',
    'course_content_overrides', 'course_content_sections', 'course_eligibility',
    'course_forums', 'course_forum_threads', 'course_forum_posts',
    'course_interests', 'course_unlock_requests', 'course_activity_log',
    'course_quiz_attempts', 'course_resource_access', 'course_section_progress',
    'course_trial_progress', 'exam_proctoring_events',
    'nclex_free_attempts', 'nclex_mock_attempts', 'nclex_timetable_events',
    'otp_codes'
  ];
BEGIN
  SELECT id INTO canonical FROM public.tenants WHERE slug = 'edtec-online' LIMIT 1;

  FOREACH t IN ARRAY tables LOOP
    IF to_regclass(format('public.%I', t)) IS NULL THEN
      RAISE NOTICE 'skipping %, table not present', t;
      CONTINUE;
    END IF;

    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id)', t);
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I (tenant_id)', t || '_tenant_id_idx', t);

    IF canonical IS NOT NULL THEN
      EXECUTE format('UPDATE public.%I SET tenant_id = %L WHERE tenant_id IS NULL', t, canonical);
    END IF;
  END LOOP;

  IF canonical IS NULL THEN
    RAISE NOTICE 'no tenant with slug edtec-online — columns added but nothing backfilled';
  END IF;
END $$;
