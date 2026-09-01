-- Track partial-payment progress per enrollment for staged plans (10% / 45% / 45%).
-- Run after create_course_plans.sql (requires enrollments.plan_id + course_plans).

CREATE TABLE IF NOT EXISTS enrollment_partial_payments (
  id BIGSERIAL PRIMARY KEY,
  enrollment_id INTEGER NOT NULL UNIQUE REFERENCES enrollments(id) ON DELETE CASCADE,
  student_id INTEGER NOT NULL,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,

  -- Full/root plan for the pathway (e.g. guided_nclex, guided_osce, full_oba)
  root_plan_id INTEGER REFERENCES course_plans(id) ON DELETE SET NULL,
  root_plan_key TEXT,

  -- Last purchased staged plan (e.g. guided_nclex_stage1)
  latest_stage_plan_id INTEGER REFERENCES course_plans(id) ON DELETE SET NULL,
  latest_stage_plan_key TEXT,

  -- Stage tracking
  current_stage INTEGER NOT NULL DEFAULT 1 CHECK (current_stage >= 1),
  max_stage_paid INTEGER NOT NULL DEFAULT 1 CHECK (max_stage_paid >= 1),
  is_partial BOOLEAN NOT NULL DEFAULT true,
  is_fully_paid BOOLEAN NOT NULL DEFAULT false,

  -- Optional paywall cursor (inclusive topic index unlocked by payment, if applicable)
  max_topic_idx_unlocked INTEGER,

  first_partial_payment_at TIMESTAMPTZ DEFAULT NOW(),
  last_payment_at TIMESTAMPTZ DEFAULT NOW(),
  next_due_at TIMESTAMPTZ,

  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_epp_student_course
  ON enrollment_partial_payments(student_id, course_id);
CREATE INDEX IF NOT EXISTS idx_epp_root_plan_key
  ON enrollment_partial_payments(root_plan_key);
CREATE INDEX IF NOT EXISTS idx_epp_fully_paid
  ON enrollment_partial_payments(is_fully_paid);

COMMENT ON TABLE enrollment_partial_payments IS
  'Canonical source for staged/partial-payment progression per enrollment.';
COMMENT ON COLUMN enrollment_partial_payments.root_plan_key IS
  'Root/full plan key without stage suffix (e.g. guided_nclex, guided_osce, full_oba).';
COMMENT ON COLUMN enrollment_partial_payments.latest_stage_plan_key IS
  'Most recent paid staged plan key (e.g. *_stage1, *_stage2, *_part1).';
COMMENT ON COLUMN enrollment_partial_payments.max_topic_idx_unlocked IS
  'Optional cap for content unlock logic; NULL means use plan defaults.';

-- Simple timestamp maintenance (avoid external trigger-function dependency).
CREATE OR REPLACE FUNCTION touch_enrollment_partial_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_touch_enrollment_partial_payments_updated_at ON enrollment_partial_payments;
CREATE TRIGGER trg_touch_enrollment_partial_payments_updated_at
BEFORE UPDATE ON enrollment_partial_payments
FOR EACH ROW
EXECUTE FUNCTION touch_enrollment_partial_payments_updated_at();

-- Helper upsert for webhook/payment handlers.
-- Call this after successful partial/full payment to keep paywall state deterministic.
CREATE OR REPLACE FUNCTION upsert_enrollment_partial_payment(
  p_enrollment_id INTEGER,
  p_stage_plan_id INTEGER,
  p_stage_number INTEGER,
  p_is_fully_paid BOOLEAN DEFAULT false,
  p_max_topic_idx_unlocked INTEGER DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID AS $$
DECLARE
  v_enrollment RECORD;
  v_stage_plan RECORD;
  v_root_plan_key TEXT;
  v_root_plan_id INTEGER;
BEGIN
  SELECT id, student_id, course_id
  INTO v_enrollment
  FROM enrollments
  WHERE id = p_enrollment_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Enrollment % not found', p_enrollment_id;
  END IF;

  SELECT id, course_id, plan_key
  INTO v_stage_plan
  FROM course_plans
  WHERE id = p_stage_plan_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Stage plan % not found', p_stage_plan_id;
  END IF;

  -- guided_nclex_stage1 -> guided_nclex
  -- guided_osce_part1   -> guided_osce
  -- full_oba_partial1   -> full_oba
  v_root_plan_key := regexp_replace(
    COALESCE(v_stage_plan.plan_key, ''),
    '_(stage|part|partial)[_-]?[0-9]+$',
    '',
    'i'
  );

  SELECT id
  INTO v_root_plan_id
  FROM course_plans
  WHERE course_id = v_stage_plan.course_id
    AND plan_key = v_root_plan_key
  LIMIT 1;

  INSERT INTO enrollment_partial_payments (
    enrollment_id,
    student_id,
    course_id,
    root_plan_id,
    root_plan_key,
    latest_stage_plan_id,
    latest_stage_plan_key,
    current_stage,
    max_stage_paid,
    is_partial,
    is_fully_paid,
    max_topic_idx_unlocked,
    first_partial_payment_at,
    last_payment_at,
    notes,
    metadata
  ) VALUES (
    v_enrollment.id,
    v_enrollment.student_id,
    v_enrollment.course_id,
    v_root_plan_id,
    NULLIF(v_root_plan_key, ''),
    v_stage_plan.id,
    v_stage_plan.plan_key,
    GREATEST(1, p_stage_number),
    GREATEST(1, p_stage_number),
    NOT p_is_fully_paid,
    p_is_fully_paid,
    p_max_topic_idx_unlocked,
    NOW(),
    NOW(),
    p_notes,
    COALESCE(p_metadata, '{}'::jsonb)
  )
  ON CONFLICT (enrollment_id) DO UPDATE
  SET
    root_plan_id = COALESCE(EXCLUDED.root_plan_id, enrollment_partial_payments.root_plan_id),
    root_plan_key = COALESCE(EXCLUDED.root_plan_key, enrollment_partial_payments.root_plan_key),
    latest_stage_plan_id = EXCLUDED.latest_stage_plan_id,
    latest_stage_plan_key = EXCLUDED.latest_stage_plan_key,
    current_stage = GREATEST(enrollment_partial_payments.current_stage, EXCLUDED.current_stage),
    max_stage_paid = GREATEST(enrollment_partial_payments.max_stage_paid, EXCLUDED.max_stage_paid),
    is_partial = CASE WHEN EXCLUDED.is_fully_paid THEN false ELSE enrollment_partial_payments.is_partial END,
    is_fully_paid = enrollment_partial_payments.is_fully_paid OR EXCLUDED.is_fully_paid,
    max_topic_idx_unlocked = COALESCE(EXCLUDED.max_topic_idx_unlocked, enrollment_partial_payments.max_topic_idx_unlocked),
    last_payment_at = NOW(),
    notes = COALESCE(EXCLUDED.notes, enrollment_partial_payments.notes),
    metadata = COALESCE(enrollment_partial_payments.metadata, '{}'::jsonb) || COALESCE(EXCLUDED.metadata, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql;

