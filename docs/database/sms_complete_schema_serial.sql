-- =============================================================================
-- EdTec SMS — Complete PostgreSQL schema (integer/serial PKs)
-- Consolidated from docs/database/*.sql + app/api + lib .from() usage
-- Target: fresh / replacement Supabase public schema (NOT edtrack1 UUID schema)
--
-- WARNING: This DROPs existing public SMS tables/views/functions with CASCADE.
-- Run only when intentional. Does not touch auth/storage/realtime schemas.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 0) Drop ALL public base tables / views / SMS functions (destructive reset)
-- -----------------------------------------------------------------------------

DROP VIEW IF EXISTS public.purchase_summary CASCADE;
DROP VIEW IF EXISTS public.course_progress_summary CASCADE;
DROP VIEW IF EXISTS public.course_comprehensive_summary CASCADE;

DROP FUNCTION IF EXISTS public.generate_edtec_student_number(DATE) CASCADE;
DROP FUNCTION IF EXISTS public.generate_support_ticket_reference() CASCADE;
DROP FUNCTION IF EXISTS public.upsert_enrollment_partial_payment(INTEGER, INTEGER, INTEGER, BOOLEAN, INTEGER, TEXT, JSONB) CASCADE;
DROP FUNCTION IF EXISTS public.touch_enrollment_partial_payments_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS public.set_partners_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.update_course_comprehensive_summary(INTEGER) CASCADE;

-- Drop every public base table (covers edtrack1 leftovers + partial SMS installs)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP TABLE IF EXISTS public.%I CASCADE', r.tablename);
  END LOOP;
END $$;

-- Drop leftover enums / custom types in public
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT n.nspname, t.typname
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typtype = 'e'
  LOOP
    EXECUTE format('DROP TYPE IF EXISTS %I.%I CASCADE', r.nspname, r.typname);
  END LOOP;
END $$;

-- -----------------------------------------------------------------------------
-- 1) Shared trigger helper
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_course_comprehensive_summary(course_id INTEGER)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- No-op placeholder for legacy discounts triggers (summary is a live view if present).
  RETURN;
END;
$$;

-- -----------------------------------------------------------------------------
-- 2) Identity
-- -----------------------------------------------------------------------------

CREATE TABLE public.users (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT,
  password_hash TEXT,
  clerk_user_id TEXT,
  role VARCHAR(50) NOT NULL DEFAULT 'student',
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  avatar TEXT,
  student_number VARCHAR(20),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT users_email_unique UNIQUE (email),
  CONSTRAINT users_clerk_user_id_unique UNIQUE (clerk_user_id),
  CONSTRAINT users_student_number_unique UNIQUE (student_number)
);

CREATE INDEX idx_users_email ON public.users (LOWER(email));
CREATE INDEX idx_users_role ON public.users (role);
CREATE INDEX idx_users_status ON public.users (status);
CREATE INDEX idx_users_student_number ON public.users (student_number);

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- students.id is often set explicitly to users.id (see ensureStudentsRowForEnrollment)
CREATE TABLE public.students (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  date_of_birth DATE,
  grade TEXT DEFAULT 'N/A',
  enrollment_date DATE,
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  student_number VARCHAR(20),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT students_student_number_unique UNIQUE (student_number),
  CONSTRAINT students_id_fkey FOREIGN KEY (id) REFERENCES public.users(id) ON DELETE CASCADE
);

CREATE INDEX idx_students_email ON public.students (LOWER(email));
CREATE INDEX idx_students_status ON public.students (status);
CREATE INDEX idx_students_student_number ON public.students (student_number);

CREATE TRIGGER trg_students_updated_at
  BEFORE UPDATE ON public.students
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.student_number_sequences (
  year INT NOT NULL,
  month INT NOT NULL CHECK (month >= 1 AND month <= 12),
  last_sequence INT NOT NULL DEFAULT 0,
  PRIMARY KEY (year, month)
);

CREATE OR REPLACE FUNCTION public.generate_edtec_student_number(reference_date DATE DEFAULT CURRENT_DATE)
RETURNS VARCHAR(20)
LANGUAGE plpgsql
AS $$
DECLARE
  v_year INT;
  v_month INT;
  v_month_letter CHAR(1);
  v_next_seq INT;
  v_result VARCHAR(20);
BEGIN
  v_year := EXTRACT(YEAR FROM reference_date)::INT;
  v_month := EXTRACT(MONTH FROM reference_date)::INT;
  v_month_letter := CHR(64 + v_month);

  INSERT INTO public.student_number_sequences (year, month, last_sequence)
  VALUES (v_year, v_month, 1)
  ON CONFLICT (year, month) DO UPDATE
  SET last_sequence = public.student_number_sequences.last_sequence + 1
  RETURNING last_sequence INTO v_next_seq;

  v_result := 'EDTEC-' ||
    LPAD((v_year % 100)::TEXT, 2, '0') ||
    v_month_letter ||
    LPAD(v_next_seq::TEXT, 4, '0');

  RETURN v_result;
END;
$$;

CREATE TABLE public.otp_codes (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  is_used BOOLEAN NOT NULL DEFAULT FALSE,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_otp_codes_email ON public.otp_codes (email);
CREATE INDEX idx_otp_codes_lookup ON public.otp_codes (email, code, is_used);

-- -----------------------------------------------------------------------------
-- 3) Catalog
-- -----------------------------------------------------------------------------

CREATE TABLE public.course_categories (
  id INTEGER PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  code_prefix VARCHAR(20) NOT NULL,
  description TEXT,
  redirects_to_sms BOOLEAN DEFAULT TRUE,
  default_duration VARCHAR(50),
  default_deadline_months INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.course_categories (id, name, code_prefix, description, redirects_to_sms, default_duration, default_deadline_months)
VALUES
  (1, 'Professional Program', 'ETBND', 'Workforce-focused skill development programs.', TRUE, 'Self-Paced', NULL),
  (2, 'Skill Development Program', 'ETDIY', 'Affordable self-learning packs.', TRUE, 'Self-Paced', 3),
  (3, 'Trade Qualifications in VET Sector', 'BSB', 'Accredited VET / trade pathways.', FALSE, 'Varies', NULL),
  (4, 'Higher Education Qualifications in HE Sector', 'HE', 'Higher Education partner programs.', FALSE, 'Varies', NULL),
  (5, 'Competitive Test Preparation', 'ETP', 'Test prep with practice and mocks.', TRUE, 'Self-Paced', NULL),
  (6, 'Accredited Higher Education (HE) Courses', 'HE-ACC', 'Accredited HE provider courses.', FALSE, 'Varies', NULL),
  (7, 'Accredited VET Provider Courses', 'VET-ACC', 'Accredited VET provider courses.', FALSE, 'Varies', NULL);

CREATE TABLE public.courses (
  id SERIAL PRIMARY KEY,
  name VARCHAR(500) NOT NULL,
  description TEXT,
  details TEXT,
  price DECIMAL(10, 2),
  price_without_certificate DECIMAL(10, 2),
  price_with_certificate DECIMAL(10, 2),
  discount DECIMAL(10, 2) DEFAULT 0,
  students_enrolled INTEGER DEFAULT 0,
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  course_status VARCHAR(50) NOT NULL DEFAULT 'live',
  category INTEGER DEFAULT 1 CHECK (category IN (1, 2, 3, 4, 5, 6, 7)),
  category_code VARCHAR(20),
  category_name VARCHAR(100),
  course_code VARCHAR(50),
  tags TEXT[] DEFAULT '{}',
  features TEXT[] DEFAULT '{}',
  curriculum TEXT[] DEFAULT '{}',
  outcomes TEXT[] DEFAULT '{}',
  requirements TEXT[] DEFAULT '{}',
  image_url TEXT,
  rating DECIMAL(3, 2) DEFAULT 0,
  level TEXT,
  duration TEXT,
  deadline_months INTEGER CHECK (deadline_months IS NULL OR deadline_months > 0),
  trial_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  trial_duration_days INTEGER,
  trial_link TEXT,
  content_folder VARCHAR(255),
  provider_logo_url TEXT,
  provider_name TEXT,
  listed_on_portfolio BOOLEAN NOT NULL DEFAULT TRUE,
  partner_api_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  stripe_product_id VARCHAR(255),
  stripe_price_id_without_certificate VARCHAR(255),
  stripe_price_id_with_certificate VARCHAR(255),
  stripe_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT courses_course_code_unique UNIQUE (course_code)
);

CREATE INDEX idx_courses_status ON public.courses (status);
CREATE INDEX idx_courses_course_status ON public.courses (course_status);
CREATE INDEX idx_courses_category ON public.courses (category);
CREATE INDEX idx_courses_course_code ON public.courses (course_code);
CREATE INDEX idx_courses_content_folder ON public.courses (content_folder) WHERE content_folder IS NOT NULL;
CREATE INDEX idx_courses_listed_on_portfolio ON public.courses (listed_on_portfolio) WHERE listed_on_portfolio = TRUE;
CREATE INDEX idx_courses_partner_api_enabled ON public.courses (partner_api_enabled) WHERE partner_api_enabled = TRUE;
CREATE INDEX idx_courses_stripe_product_id ON public.courses (stripe_product_id);

CREATE TRIGGER trg_courses_updated_at
  BEFORE UPDATE ON public.courses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.course_plans (
  id SERIAL PRIMARY KEY,
  course_id INTEGER NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  plan_key VARCHAR(64) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  stripe_price_id VARCHAR(255),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (course_id, plan_key)
);

CREATE INDEX idx_course_plans_course_id ON public.course_plans (course_id);

CREATE TRIGGER trg_course_plans_updated_at
  BEFORE UPDATE ON public.course_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.discounts (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  discount_type VARCHAR(50) NOT NULL,
  discount_value DECIMAL(12, 2) NOT NULL,
  min_purchase_amount DECIMAL(12, 2),
  max_discount_amount DECIMAL(12, 2),
  usage_limit INTEGER,
  usage_count INTEGER NOT NULL DEFAULT 0,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  is_one_time_use BOOLEAN NOT NULL DEFAULT FALSE,
  is_student_specific BOOLEAN NOT NULL DEFAULT FALSE,
  student_ids INTEGER[] DEFAULT '{}',
  course_ids INTEGER[] DEFAULT '{}',
  coupon_code VARCHAR(100) NOT NULL,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT discounts_coupon_code_unique UNIQUE (coupon_code)
);

CREATE INDEX idx_discounts_status ON public.discounts (status);
CREATE INDEX idx_discounts_coupon_code ON public.discounts (coupon_code);

CREATE TRIGGER trg_discounts_updated_at
  BEFORE UPDATE ON public.discounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- -----------------------------------------------------------------------------
-- 4) Carts, purchases, enrollments
-- -----------------------------------------------------------------------------

CREATE TABLE public.carts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  final_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  partner_id BIGINT,
  partner_code TEXT,
  partner_name TEXT,
  partner_phone TEXT,
  partner_applied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_carts_user_id ON public.carts (user_id);
CREATE INDEX idx_carts_status ON public.carts (status);
CREATE INDEX idx_carts_partner_id ON public.carts (partner_id);
CREATE INDEX idx_carts_partner_code ON public.carts (partner_code);

CREATE TRIGGER trg_carts_updated_at
  BEFORE UPDATE ON public.carts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.cart_items (
  id SERIAL PRIMARY KEY,
  cart_id INTEGER NOT NULL REFERENCES public.carts(id) ON DELETE CASCADE,
  course_id INTEGER NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  plan_id INTEGER REFERENCES public.course_plans(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(12, 2) NOT NULL DEFAULT 0,
  total_price DECIMAL(12, 2) NOT NULL DEFAULT 0,
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (cart_id, course_id)
);

CREATE INDEX idx_cart_items_cart_id ON public.cart_items (cart_id);
CREATE INDEX idx_cart_items_course_id ON public.cart_items (course_id);
CREATE INDEX idx_cart_items_plan_id ON public.cart_items (plan_id);
CREATE INDEX idx_cart_items_status ON public.cart_items (status);

CREATE TRIGGER trg_cart_items_updated_at
  BEFORE UPDATE ON public.cart_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.purchases (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  cart_id INTEGER REFERENCES public.carts(id) ON DELETE SET NULL,
  purchase_number VARCHAR(100),
  -- Canonical money fields
  total_amount DECIMAL(12, 2) DEFAULT 0,
  subtotal DECIMAL(12, 2) DEFAULT 0,
  discount_amount DECIMAL(12, 2) DEFAULT 0,
  tax_amount DECIMAL(12, 2) DEFAULT 0,
  -- Legacy alternate insert path (payments/confirm)
  amount DECIMAL(12, 2),
  currency VARCHAR(10) DEFAULT 'USD',
  status VARCHAR(50) DEFAULT 'pending',
  payment_status VARCHAR(50) DEFAULT 'pending',
  payment_method VARCHAR(50),
  payment_intent_id TEXT,
  transaction_id TEXT,
  description TEXT,
  notes TEXT,
  refund_amount DECIMAL(12, 2),
  refund_reason TEXT,
  refunded_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  partner_id BIGINT,
  partner_code TEXT,
  partner_name TEXT,
  partner_phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_purchases_user_id ON public.purchases (user_id);
CREATE INDEX idx_purchases_status ON public.purchases (status);
CREATE INDEX idx_purchases_payment_status ON public.purchases (payment_status);
CREATE INDEX idx_purchases_payment_intent_id ON public.purchases (payment_intent_id);
CREATE INDEX idx_purchases_partner_id ON public.purchases (partner_id);
CREATE INDEX idx_purchases_purchase_number ON public.purchases (purchase_number);

CREATE TRIGGER trg_purchases_updated_at
  BEFORE UPDATE ON public.purchases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.purchase_items (
  id SERIAL PRIMARY KEY,
  purchase_id INTEGER NOT NULL REFERENCES public.purchases(id) ON DELETE CASCADE,
  course_id INTEGER REFERENCES public.courses(id) ON DELETE SET NULL,
  course_name TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(12, 2) NOT NULL DEFAULT 0,
  total_price DECIMAL(12, 2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(12, 2) DEFAULT 0,
  with_certificate BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_purchase_items_purchase_id ON public.purchase_items (purchase_id);
CREATE INDEX idx_purchase_items_course_id ON public.purchase_items (course_id);

CREATE TRIGGER trg_purchase_items_updated_at
  BEFORE UPDATE ON public.purchase_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.enrollments (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  course_id INTEGER NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  enrollment_date TIMESTAMPTZ DEFAULT NOW(),
  completion_date TIMESTAMPTZ,
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  progress DECIMAL(5, 2) NOT NULL DEFAULT 0,
  grade TEXT,
  notes TEXT,
  with_certificate BOOLEAN NOT NULL DEFAULT FALSE,
  plan_id INTEGER REFERENCES public.course_plans(id) ON DELETE SET NULL,
  moodle_course_id INTEGER,
  payment_status VARCHAR(20),
  payment_session_id VARCHAR(255),
  payment_completed_at TIMESTAMPTZ,
  referred_by_partner_id BIGINT,
  referred_by_partner_code TEXT,
  trial_last_page_id VARCHAR(255),
  trial_last_position INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (student_id, course_id)
);

CREATE INDEX idx_enrollments_student_id ON public.enrollments (student_id);
CREATE INDEX idx_enrollments_course_id ON public.enrollments (course_id);
CREATE INDEX idx_enrollments_status ON public.enrollments (status);
CREATE INDEX idx_enrollments_plan_id ON public.enrollments (plan_id);
CREATE INDEX idx_enrollments_payment_status ON public.enrollments (payment_status);
CREATE INDEX idx_enrollments_payment_session_id ON public.enrollments (payment_session_id);
CREATE INDEX idx_enrollments_referred_partner_id ON public.enrollments (referred_by_partner_id);

CREATE TRIGGER trg_enrollments_updated_at
  BEFORE UPDATE ON public.enrollments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.enrollment_partial_payments (
  id BIGSERIAL PRIMARY KEY,
  enrollment_id INTEGER NOT NULL UNIQUE REFERENCES public.enrollments(id) ON DELETE CASCADE,
  student_id INTEGER NOT NULL,
  course_id INTEGER NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  root_plan_id INTEGER REFERENCES public.course_plans(id) ON DELETE SET NULL,
  root_plan_key TEXT,
  latest_stage_plan_id INTEGER REFERENCES public.course_plans(id) ON DELETE SET NULL,
  latest_stage_plan_key TEXT,
  current_stage INTEGER NOT NULL DEFAULT 1 CHECK (current_stage >= 1),
  max_stage_paid INTEGER NOT NULL DEFAULT 1 CHECK (max_stage_paid >= 1),
  is_partial BOOLEAN NOT NULL DEFAULT TRUE,
  is_fully_paid BOOLEAN NOT NULL DEFAULT FALSE,
  max_topic_idx_unlocked INTEGER,
  first_partial_payment_at TIMESTAMPTZ DEFAULT NOW(),
  last_payment_at TIMESTAMPTZ DEFAULT NOW(),
  next_due_at TIMESTAMPTZ,
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_epp_student_course ON public.enrollment_partial_payments (student_id, course_id);
CREATE INDEX idx_epp_root_plan_key ON public.enrollment_partial_payments (root_plan_key);
CREATE INDEX idx_epp_fully_paid ON public.enrollment_partial_payments (is_fully_paid);

CREATE OR REPLACE FUNCTION public.touch_enrollment_partial_payments_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_touch_enrollment_partial_payments_updated_at
  BEFORE UPDATE ON public.enrollment_partial_payments
  FOR EACH ROW EXECUTE FUNCTION public.touch_enrollment_partial_payments_updated_at();

CREATE OR REPLACE FUNCTION public.upsert_enrollment_partial_payment(
  p_enrollment_id INTEGER,
  p_stage_plan_id INTEGER,
  p_stage_number INTEGER,
  p_is_fully_paid BOOLEAN DEFAULT FALSE,
  p_max_topic_idx_unlocked INTEGER DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_enrollment RECORD;
  v_stage_plan RECORD;
  v_root_plan_key TEXT;
  v_root_plan_id INTEGER;
BEGIN
  SELECT id, student_id, course_id
  INTO v_enrollment
  FROM public.enrollments
  WHERE id = p_enrollment_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Enrollment % not found', p_enrollment_id;
  END IF;

  SELECT id, course_id, plan_key
  INTO v_stage_plan
  FROM public.course_plans
  WHERE id = p_stage_plan_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Stage plan % not found', p_stage_plan_id;
  END IF;

  v_root_plan_key := regexp_replace(
    COALESCE(v_stage_plan.plan_key, ''),
    '_(stage|part|partial)[_-]?[0-9]+$',
    '',
    'i'
  );

  SELECT id
  INTO v_root_plan_id
  FROM public.course_plans
  WHERE course_id = v_stage_plan.course_id
    AND plan_key = v_root_plan_key
  LIMIT 1;

  INSERT INTO public.enrollment_partial_payments (
    enrollment_id, student_id, course_id,
    root_plan_id, root_plan_key,
    latest_stage_plan_id, latest_stage_plan_key,
    current_stage, max_stage_paid,
    is_partial, is_fully_paid,
    max_topic_idx_unlocked,
    first_partial_payment_at, last_payment_at,
    notes, metadata
  ) VALUES (
    v_enrollment.id, v_enrollment.student_id, v_enrollment.course_id,
    v_root_plan_id, NULLIF(v_root_plan_key, ''),
    v_stage_plan.id, v_stage_plan.plan_key,
    GREATEST(1, p_stage_number), GREATEST(1, p_stage_number),
    NOT p_is_fully_paid, p_is_fully_paid,
    p_max_topic_idx_unlocked,
    NOW(), NOW(),
    p_notes, COALESCE(p_metadata, '{}'::jsonb)
  )
  ON CONFLICT (enrollment_id) DO UPDATE
  SET
    root_plan_id = COALESCE(EXCLUDED.root_plan_id, public.enrollment_partial_payments.root_plan_id),
    root_plan_key = COALESCE(EXCLUDED.root_plan_key, public.enrollment_partial_payments.root_plan_key),
    latest_stage_plan_id = EXCLUDED.latest_stage_plan_id,
    latest_stage_plan_key = EXCLUDED.latest_stage_plan_key,
    current_stage = GREATEST(public.enrollment_partial_payments.current_stage, EXCLUDED.current_stage),
    max_stage_paid = GREATEST(public.enrollment_partial_payments.max_stage_paid, EXCLUDED.max_stage_paid),
    is_partial = CASE WHEN EXCLUDED.is_fully_paid THEN FALSE ELSE public.enrollment_partial_payments.is_partial END,
    is_fully_paid = public.enrollment_partial_payments.is_fully_paid OR EXCLUDED.is_fully_paid,
    max_topic_idx_unlocked = COALESCE(EXCLUDED.max_topic_idx_unlocked, public.enrollment_partial_payments.max_topic_idx_unlocked),
    last_payment_at = NOW(),
    notes = COALESCE(EXCLUDED.notes, public.enrollment_partial_payments.notes),
    metadata = COALESCE(public.enrollment_partial_payments.metadata, '{}'::jsonb) || COALESCE(EXCLUDED.metadata, '{}'::jsonb);
END;
$$;

CREATE TABLE public.trial_enrollments (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  course_id INTEGER NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  trial_started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  trial_expires_at TIMESTAMPTZ NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  trial_converted BOOLEAN NOT NULL DEFAULT FALSE,
  converted_to_enrollment_id INTEGER REFERENCES public.enrollments(id) ON DELETE SET NULL,
  converted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (email, course_id)
);

CREATE INDEX idx_trial_enrollments_email ON public.trial_enrollments (LOWER(email));
CREATE INDEX idx_trial_enrollments_course_id ON public.trial_enrollments (course_id);
CREATE INDEX idx_trial_enrollments_status ON public.trial_enrollments (status);

CREATE TRIGGER trg_trial_enrollments_updated_at
  BEFORE UPDATE ON public.trial_enrollments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- -----------------------------------------------------------------------------
-- 5) Partners / trainers / assessments
-- -----------------------------------------------------------------------------

CREATE TABLE public.partners (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  country_code TEXT,
  phone TEXT,
  address TEXT,
  partner_code TEXT,
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
  join_date DATE,
  avatar TEXT,
  notes TEXT,
  created_by BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_partners_email ON public.partners (LOWER(email));
CREATE INDEX idx_partners_status ON public.partners (status);
CREATE UNIQUE INDEX idx_partners_partner_code_unique ON public.partners (partner_code) WHERE partner_code IS NOT NULL;

CREATE OR REPLACE FUNCTION public.set_partners_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_partners_updated_at
  BEFORE UPDATE ON public.partners
  FOR EACH ROW EXECUTE FUNCTION public.set_partners_updated_at();

-- Optional FK after partners exists
ALTER TABLE public.carts
  ADD CONSTRAINT carts_partner_id_fkey
  FOREIGN KEY (partner_id) REFERENCES public.partners(id) ON DELETE SET NULL;

ALTER TABLE public.purchases
  ADD CONSTRAINT purchases_partner_id_fkey
  FOREIGN KEY (partner_id) REFERENCES public.partners(id) ON DELETE SET NULL;

ALTER TABLE public.enrollments
  ADD CONSTRAINT enrollments_referred_by_partner_id_fkey
  FOREIGN KEY (referred_by_partner_id) REFERENCES public.partners(id) ON DELETE SET NULL;

CREATE TABLE public.partner_api_clients (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  api_key_prefix TEXT NOT NULL,
  api_key_hash TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.partner_api_course_grants (
  partner_client_id BIGINT NOT NULL REFERENCES public.partner_api_clients(id) ON DELETE CASCADE,
  course_id INTEGER NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (partner_client_id, course_id)
);

CREATE INDEX idx_partner_api_course_grants_course ON public.partner_api_course_grants (course_id);

CREATE TABLE public.trainers (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES public.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  specialization VARCHAR(255),
  experience VARCHAR(100),
  rating DECIMAL(3, 2) DEFAULT 0.0 CHECK (rating >= 0 AND rating <= 5),
  students_assigned INTEGER DEFAULT 0,
  status VARCHAR(50) NOT NULL DEFAULT 'Active',
  join_date DATE,
  avatar VARCHAR(500),
  qualifications TEXT[],
  courses_teaching INTEGER[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL
);

CREATE INDEX idx_trainers_user_id ON public.trainers (user_id);
CREATE INDEX idx_trainers_status ON public.trainers (status);
CREATE INDEX idx_trainers_email ON public.trainers (email);

CREATE TRIGGER trg_trainers_updated_at
  BEFORE UPDATE ON public.trainers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.assessments (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  course_id INTEGER REFERENCES public.courses(id) ON DELETE SET NULL,
  course_name VARCHAR(255),
  trainer_id INTEGER REFERENCES public.trainers(id) ON DELETE SET NULL,
  trainer_name VARCHAR(255),
  type VARCHAR(50) NOT NULL CHECK (type IN ('Quiz', 'Project', 'Assignment', 'Exam', 'Other')),
  duration VARCHAR(100),
  total_questions INTEGER DEFAULT 0,
  passing_score INTEGER DEFAULT 0 CHECK (passing_score >= 0 AND passing_score <= 100),
  students_attempted INTEGER DEFAULT 0,
  average_score DECIMAL(5, 2) DEFAULT 0.0 CHECK (average_score >= 0 AND average_score <= 100),
  status VARCHAR(50) NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Active', 'Completed', 'Archived')),
  description TEXT,
  instructions TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL
);

CREATE INDEX idx_assessments_course_id ON public.assessments (course_id);
CREATE INDEX idx_assessments_trainer_id ON public.assessments (trainer_id);
CREATE INDEX idx_assessments_status ON public.assessments (status);

CREATE TRIGGER trg_assessments_updated_at
  BEFORE UPDATE ON public.assessments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- -----------------------------------------------------------------------------
-- 6) Eligibility / interests / unlock / content
-- -----------------------------------------------------------------------------

CREATE TABLE public.course_eligibility (
  id SERIAL PRIMARY KEY,
  course_id INTEGER NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  mobile VARCHAR(50),
  region VARCHAR(255),
  user_id INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  eligibility_status VARCHAR(50) DEFAULT 'pending',
  eligibility_data JSONB,
  notes TEXT,
  checked_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  checked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (course_id, email)
);

CREATE INDEX idx_course_eligibility_course_id ON public.course_eligibility (course_id);
CREATE INDEX idx_course_eligibility_email ON public.course_eligibility (email);
CREATE INDEX idx_course_eligibility_user_id ON public.course_eligibility (user_id);
CREATE INDEX idx_course_eligibility_status ON public.course_eligibility (eligibility_status);

CREATE TRIGGER trg_course_eligibility_updated_at
  BEFORE UPDATE ON public.course_eligibility
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.course_interests (
  id SERIAL PRIMARY KEY,
  course_id INTEGER NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  mobile VARCHAR(50),
  region VARCHAR(255),
  user_id INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  unlocked_at TIMESTAMPTZ,
  unlocked_by_user_id INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (course_id, email)
);

CREATE INDEX idx_course_interests_course_id ON public.course_interests (course_id);
CREATE INDEX idx_course_interests_email ON public.course_interests (email);
CREATE INDEX idx_course_interests_user_id ON public.course_interests (user_id);
CREATE INDEX idx_course_interests_unlocked_at ON public.course_interests (unlocked_at) WHERE unlocked_at IS NOT NULL;

CREATE TRIGGER trg_course_interests_updated_at
  BEFORE UPDATE ON public.course_interests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.course_unlock_requests (
  id SERIAL PRIMARY KEY,
  enrollment_id INTEGER NOT NULL REFERENCES public.enrollments(id) ON DELETE CASCADE,
  course_id INTEGER NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (enrollment_id, course_id)
);

CREATE INDEX idx_course_unlock_requests_course ON public.course_unlock_requests (course_id);
CREATE INDEX idx_course_unlock_requests_status ON public.course_unlock_requests (status);

CREATE TABLE public.course_content_overrides (
  id BIGSERIAL PRIMARY KEY,
  course_id INTEGER NOT NULL UNIQUE REFERENCES public.courses(id) ON DELETE CASCADE,
  practice_q_manifest JSONB,
  slides_manifest JSONB,
  quiz_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_course_content_overrides_course_id ON public.course_content_overrides (course_id);

CREATE TABLE public.course_content_sections (
  id BIGSERIAL PRIMARY KEY,
  course_id INTEGER NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  section_kind TEXT NOT NULL CHECK (section_kind IN ('program_overview', 'topic')),
  topic_slug TEXT,
  folder TEXT NOT NULL,
  label TEXT NOT NULL,
  practice_q_source_topic_num INTEGER,
  quiz_source_topic_num INTEGER,
  ngn_source_topic_num INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT course_content_sections_topic_requires_slug CHECK (
    (section_kind = 'program_overview' AND topic_slug IS NULL)
    OR (section_kind = 'topic' AND topic_slug IS NOT NULL AND length(trim(topic_slug)) > 0)
  ),
  CONSTRAINT course_content_sections_practice_q_source_topic_num_check
    CHECK (practice_q_source_topic_num IS NULL OR practice_q_source_topic_num > 0),
  CONSTRAINT course_content_sections_quiz_source_topic_num_check
    CHECK (quiz_source_topic_num IS NULL OR quiz_source_topic_num > 0),
  CONSTRAINT course_content_sections_ngn_source_topic_num_check
    CHECK (ngn_source_topic_num IS NULL OR ngn_source_topic_num > 0)
);

CREATE UNIQUE INDEX idx_course_content_sections_one_program
  ON public.course_content_sections (course_id)
  WHERE section_kind = 'program_overview';

CREATE UNIQUE INDEX idx_course_content_sections_topic_slug
  ON public.course_content_sections (course_id, topic_slug)
  WHERE topic_slug IS NOT NULL;

CREATE INDEX idx_course_content_sections_course_sort
  ON public.course_content_sections (course_id, sort_order);

-- -----------------------------------------------------------------------------
-- 7) Progress / forums / certificates / documents
-- -----------------------------------------------------------------------------

CREATE TABLE public.course_resource_access (
  id SERIAL PRIMARY KEY,
  enrollment_id INTEGER NOT NULL REFERENCES public.enrollments(id) ON DELETE CASCADE,
  student_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  course_id INTEGER NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  moodle_course_id INTEGER,
  resource_id INTEGER NOT NULL,
  resource_name VARCHAR(500) NOT NULL,
  resource_type VARCHAR(100) NOT NULL,
  resource_url TEXT,
  access_count INTEGER DEFAULT 1,
  first_accessed_at TIMESTAMPTZ DEFAULT NOW(),
  last_accessed_at TIMESTAMPTZ DEFAULT NOW(),
  time_spent_seconds INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (enrollment_id, resource_id)
);

CREATE INDEX idx_resource_access_enrollment ON public.course_resource_access (enrollment_id);
CREATE INDEX idx_resource_access_student ON public.course_resource_access (student_id);
CREATE INDEX idx_resource_access_course ON public.course_resource_access (course_id);

CREATE TABLE public.course_section_progress (
  id SERIAL PRIMARY KEY,
  enrollment_id INTEGER NOT NULL REFERENCES public.enrollments(id) ON DELETE CASCADE,
  student_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  course_id INTEGER NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  moodle_course_id INTEGER,
  section_id INTEGER NOT NULL,
  section_name VARCHAR(500) NOT NULL,
  section_number INTEGER NOT NULL,
  resources_total INTEGER DEFAULT 0,
  resources_accessed INTEGER DEFAULT 0,
  resources_completed INTEGER DEFAULT 0,
  progress_percentage INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (enrollment_id, section_id)
);

CREATE INDEX idx_section_progress_enrollment ON public.course_section_progress (enrollment_id);
CREATE INDEX idx_section_progress_student ON public.course_section_progress (student_id);

CREATE TABLE public.course_activity_log (
  id SERIAL PRIMARY KEY,
  enrollment_id INTEGER NOT NULL REFERENCES public.enrollments(id) ON DELETE CASCADE,
  student_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  course_id INTEGER NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  activity_type VARCHAR(50) NOT NULL,
  activity_details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_activity_log_enrollment ON public.course_activity_log (enrollment_id);
CREATE INDEX idx_activity_log_created ON public.course_activity_log (created_at DESC);

CREATE TABLE public.course_trial_progress (
  id SERIAL PRIMARY KEY,
  enrollment_id INTEGER NOT NULL REFERENCES public.enrollments(id) ON DELETE CASCADE,
  course_id INTEGER NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  section_id VARCHAR(255) NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (enrollment_id, section_id)
);

CREATE INDEX idx_trial_progress_enrollment ON public.course_trial_progress (enrollment_id);

CREATE TABLE public.course_quiz_attempts (
  id SERIAL PRIMARY KEY,
  enrollment_id INTEGER NOT NULL REFERENCES public.enrollments(id) ON DELETE CASCADE,
  course_id INTEGER NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  student_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  quiz_identifier VARCHAR(255) NOT NULL,
  score_percent INTEGER NOT NULL,
  passed BOOLEAN NOT NULL,
  total_questions INTEGER NOT NULL,
  correct_count INTEGER NOT NULL,
  answers_snapshot JSONB,
  attempted_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_quiz_attempts_enrollment ON public.course_quiz_attempts (enrollment_id);
CREATE INDEX idx_quiz_attempts_student ON public.course_quiz_attempts (student_id);

CREATE TABLE public.course_forums (
  id SERIAL PRIMARY KEY,
  course_id INTEGER NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('general', 'personal')),
  enrollment_id INTEGER REFERENCES public.enrollments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (course_id, type, enrollment_id)
);

CREATE INDEX idx_course_forums_course ON public.course_forums (course_id);
CREATE INDEX idx_course_forums_enrollment ON public.course_forums (enrollment_id);

CREATE TABLE public.course_forum_threads (
  id SERIAL PRIMARY KEY,
  forum_id INTEGER NOT NULL REFERENCES public.course_forums(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  author_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_forum_threads_forum ON public.course_forum_threads (forum_id);

CREATE TABLE public.course_forum_posts (
  id SERIAL PRIMARY KEY,
  thread_id INTEGER NOT NULL REFERENCES public.course_forum_threads(id) ON DELETE CASCADE,
  author_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_forum_posts_thread ON public.course_forum_posts (thread_id);

CREATE TABLE public.certificates (
  id SERIAL PRIMARY KEY,
  enrollment_id INTEGER NOT NULL UNIQUE REFERENCES public.enrollments(id) ON DELETE CASCADE,
  student_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  course_id INTEGER NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  certificate_number VARCHAR(100) NOT NULL UNIQUE,
  certificate_url TEXT,
  certificate_pdf_url TEXT,
  issued_date DATE NOT NULL DEFAULT CURRENT_DATE,
  issued_at TIMESTAMPTZ DEFAULT NOW(),
  email_sent BOOLEAN DEFAULT FALSE,
  email_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_certificates_student ON public.certificates (student_id);
CREATE INDEX idx_certificates_course ON public.certificates (course_id);
CREATE INDEX idx_certificates_certificate_number ON public.certificates (certificate_number);

CREATE TABLE public.documents (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  original_name TEXT,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  document_type TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  notes TEXT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  verified_at TIMESTAMPTZ,
  verified_by TEXT,
  rejection_reason TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_documents_student_id ON public.documents (student_id);
CREATE INDEX idx_documents_status ON public.documents (status);
CREATE INDEX idx_documents_uploaded_at ON public.documents (uploaded_at DESC);

CREATE TRIGGER trg_documents_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- -----------------------------------------------------------------------------
-- 8) Notifications / support / NCLEX / proctoring / timetable
-- -----------------------------------------------------------------------------

CREATE TABLE public.notifications (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) NOT NULL DEFAULT 'General'
    CHECK (type IN ('Payment', 'Achievement', 'Reminder', 'Welcome', 'Course', 'System', 'General')),
  priority VARCHAR(50) NOT NULL DEFAULT 'Medium'
    CHECK (priority IN ('Low', 'Medium', 'High')),
  recipient_id INTEGER REFERENCES public.users(id) ON DELETE CASCADE,
  recipient_name VARCHAR(255),
  recipient_email VARCHAR(255),
  status VARCHAR(50) NOT NULL DEFAULT 'Pending'
    CHECK (status IN ('Pending', 'Sent', 'Delivered', 'Failed')),
  delivery_method VARCHAR(50) NOT NULL DEFAULT 'Email'
    CHECK (delivery_method IN ('Email', 'Push', 'SMS', 'In-App')),
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  metadata JSONB
);

CREATE INDEX idx_notifications_recipient_id ON public.notifications (recipient_id);
CREATE INDEX idx_notifications_status ON public.notifications (status);
CREATE INDEX idx_notifications_type ON public.notifications (type);
CREATE INDEX idx_notifications_created_at ON public.notifications (created_at);

CREATE TRIGGER trg_notifications_updated_at
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.notification_settings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  category VARCHAR(100) NOT NULL,
  email_enabled BOOLEAN DEFAULT TRUE,
  push_enabled BOOLEAN DEFAULT TRUE,
  sms_enabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, category)
);

CREATE INDEX idx_notification_settings_user_id ON public.notification_settings (user_id);

CREATE TRIGGER trg_notification_settings_updated_at
  BEFORE UPDATE ON public.notification_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.notification_reads (
  id SERIAL PRIMARY KEY,
  notification_id INTEGER NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (notification_id, user_id)
);

CREATE INDEX idx_notification_reads_notification_id ON public.notification_reads (notification_id);
CREATE INDEX idx_notification_reads_user_id ON public.notification_reads (user_id);

CREATE TABLE public.support_ticket_sequences (
  year INT NOT NULL PRIMARY KEY,
  last_sequence INT NOT NULL DEFAULT 0
);

CREATE TABLE public.support_tickets (
  id SERIAL PRIMARY KEY,
  ticket_reference VARCHAR(20) NOT NULL UNIQUE,
  user_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  user_name VARCHAR(255),
  user_email VARCHAR(255),
  title VARCHAR(500) NOT NULL,
  category VARCHAR(100) NOT NULL,
  priority VARCHAR(50) NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  description TEXT NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_support_tickets_user_id ON public.support_tickets (user_id);
CREATE INDEX idx_support_tickets_status ON public.support_tickets (status);
CREATE INDEX idx_support_tickets_ticket_reference ON public.support_tickets (ticket_reference);

CREATE TRIGGER trg_support_tickets_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.support_ticket_replies (
  id SERIAL PRIMARY KEY,
  ticket_id INTEGER NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  message TEXT NOT NULL,
  is_staff BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_support_ticket_replies_ticket_id ON public.support_ticket_replies (ticket_id);

CREATE OR REPLACE FUNCTION public.generate_support_ticket_reference()
RETURNS VARCHAR(20)
LANGUAGE plpgsql
AS $$
DECLARE
  v_year INT;
  v_next_seq INT;
  v_result VARCHAR(20);
BEGIN
  v_year := EXTRACT(YEAR FROM CURRENT_DATE)::INT;

  INSERT INTO public.support_ticket_sequences (year, last_sequence)
  VALUES (v_year, 1)
  ON CONFLICT (year) DO UPDATE
  SET last_sequence = public.support_ticket_sequences.last_sequence + 1
  RETURNING last_sequence INTO v_next_seq;

  v_result := 'SR-' || v_year || '-' || LPAD(v_next_seq::TEXT, 4, '0');
  RETURN v_result;
END;
$$;

CREATE TABLE public.nclex_free_attempts (
  id BIGSERIAL PRIMARY KEY,
  student_id INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  clerk_user_id TEXT,
  email TEXT,
  seed TEXT,
  score_percent INTEGER NOT NULL DEFAULT 0,
  total_questions INTEGER NOT NULL,
  correct_count INTEGER NOT NULL,
  program_breakdown JSONB NOT NULL DEFAULT '[]'::jsonb,
  question_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_nclex_free_attempts_student ON public.nclex_free_attempts (student_id);
CREATE INDEX idx_nclex_free_attempts_clerk ON public.nclex_free_attempts (clerk_user_id);
CREATE INDEX idx_nclex_free_attempts_email ON public.nclex_free_attempts (email);
CREATE UNIQUE INDEX uq_nclex_free_attempts_student
  ON public.nclex_free_attempts (student_id) WHERE student_id IS NOT NULL;
CREATE UNIQUE INDEX uq_nclex_free_attempts_clerk
  ON public.nclex_free_attempts (clerk_user_id) WHERE clerk_user_id IS NOT NULL;

CREATE TABLE public.nclex_mock_attempts (
  id BIGSERIAL PRIMARY KEY,
  enrollment_id INTEGER NOT NULL REFERENCES public.enrollments(id) ON DELETE CASCADE,
  course_id INTEGER NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  student_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  marks_earned INTEGER NOT NULL,
  passing_marks INTEGER NOT NULL DEFAULT 125,
  passed BOOLEAN NOT NULL,
  total_questions_in_sequence INTEGER NOT NULL,
  correct_count INTEGER NOT NULL,
  breakdown_by_module JSONB NOT NULL DEFAULT '[]'::jsonb,
  question_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  proctoring_terminated BOOLEAN NOT NULL DEFAULT FALSE,
  proctoring_terminate_reason TEXT,
  proctoring_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_nclex_mock_attempts_enrollment ON public.nclex_mock_attempts (enrollment_id);
CREATE INDEX idx_nclex_mock_attempts_course ON public.nclex_mock_attempts (course_id);
CREATE INDEX idx_nclex_mock_attempts_student ON public.nclex_mock_attempts (student_id);
CREATE INDEX idx_nclex_mock_attempts_completed_at ON public.nclex_mock_attempts (completed_at DESC);

CREATE TABLE public.exam_proctoring_events (
  id BIGSERIAL PRIMARY KEY,
  enrollment_id INTEGER NOT NULL REFERENCES public.enrollments(id) ON DELETE CASCADE,
  course_id INTEGER NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  student_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  attempt_id BIGINT REFERENCES public.nclex_mock_attempts(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info',
  message TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  client_timestamp TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_exam_proctoring_events_enrollment ON public.exam_proctoring_events (enrollment_id);
CREATE INDEX idx_exam_proctoring_events_student ON public.exam_proctoring_events (student_id);
CREATE INDEX idx_exam_proctoring_events_created ON public.exam_proctoring_events (created_at DESC);

CREATE TABLE public.nclex_timetable_events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  date DATE NOT NULL,
  time TEXT NOT NULL,
  type TEXT NOT NULL CHECK (
    type IN ('lecture', 'workshop', 'assessment', 'exam', 'lab', 'due_soon', 'in_progress')
  ),
  course TEXT,
  sheet TEXT,
  meeting_link TEXT,
  recording_link TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_nclex_timetable_events_date ON public.nclex_timetable_events (date);
CREATE INDEX idx_nclex_timetable_events_type ON public.nclex_timetable_events (type);

CREATE TRIGGER trg_nclex_timetable_events_updated_at
  BEFORE UPDATE ON public.nclex_timetable_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- -----------------------------------------------------------------------------
-- 9) Views used by the app
-- -----------------------------------------------------------------------------

CREATE OR REPLACE VIEW public.purchase_summary AS
SELECT
  p.id AS purchase_id,
  p.id,
  p.purchase_number,
  p.user_id,
  u.name AS user_name,
  u.email AS user_email,
  p.cart_id,
  p.total_amount,
  p.subtotal,
  p.discount_amount,
  p.tax_amount,
  p.currency,
  p.status,
  p.payment_status,
  p.payment_method,
  p.payment_intent_id,
  p.transaction_id,
  p.description,
  p.notes,
  p.refund_amount,
  p.refund_reason,
  p.refunded_at,
  p.completed_at,
  p.created_at AS purchase_date,
  p.created_at,
  p.updated_at,
  p.partner_id,
  p.partner_code,
  p.partner_name,
  p.partner_phone,
  (
    SELECT COUNT(*)::INTEGER
    FROM public.purchase_items pi
    WHERE pi.purchase_id = p.id
  ) AS item_count,
  COALESCE(
    (
      SELECT json_agg(
        json_build_object(
          'course_id', pi.course_id,
          'course_name', pi.course_name,
          'quantity', pi.quantity,
          'unit_price', pi.unit_price,
          'discount_amount', pi.discount_amount,
          'total_price', pi.total_price,
          'with_certificate', pi.with_certificate
        )
        ORDER BY pi.id
      )
      FROM public.purchase_items pi
      WHERE pi.purchase_id = p.id
    ),
    '[]'::json
  ) AS items
FROM public.purchases p
LEFT JOIN public.users u ON u.id = p.user_id;

CREATE OR REPLACE VIEW public.course_progress_summary AS
SELECT
  e.id AS enrollment_id,
  e.student_id,
  e.course_id,
  e.moodle_course_id,
  e.progress AS overall_progress,
  COUNT(DISTINCT ra.resource_id) AS total_resources_accessed,
  COUNT(DISTINCT CASE WHEN ra.completed THEN ra.resource_id END) AS total_resources_completed,
  SUM(ra.time_spent_seconds) AS total_time_spent_seconds,
  COUNT(DISTINCT sp.section_id) AS sections_started,
  COUNT(DISTINCT CASE WHEN sp.progress_percentage = 100 THEN sp.section_id END) AS sections_completed,
  MAX(ra.last_accessed_at) AS last_activity_at,
  COUNT(DISTINCT al.id) AS total_activities
FROM public.enrollments e
LEFT JOIN public.course_resource_access ra ON ra.enrollment_id = e.id
LEFT JOIN public.course_section_progress sp ON sp.enrollment_id = e.id
LEFT JOIN public.course_activity_log al ON al.enrollment_id = e.id
WHERE e.status IN ('active', 'enrolled')
GROUP BY e.id, e.student_id, e.course_id, e.moodle_course_id, e.progress;

-- -----------------------------------------------------------------------------
-- 10) Grants for PostgREST / service role usage (Supabase)
-- -----------------------------------------------------------------------------

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_edtec_student_number(DATE) TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION public.generate_support_ticket_reference() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.upsert_enrollment_partial_payment(INTEGER, INTEGER, INTEGER, BOOLEAN, INTEGER, TEXT, JSONB)
  TO authenticated, service_role;

COMMIT;

-- =============================================================================
-- Notes
-- - Storage bucket `course-images` is NOT a table (setup_course_images_storage.sql).
-- - App uses service role / API routes; RLS policies from older migrations are omitted
--   so a fresh DB is not locked behind auth.uid()/UUID mismatches.
-- - Seed courses/plans separately (seed_nclex_*.sql, seed_gnps_*.sql) after this runs.
-- =============================================================================
