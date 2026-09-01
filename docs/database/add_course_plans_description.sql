-- Add optional description to course_plans (shown under plan name on course detail)
-- Run after create_course_plans.sql

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'course_plans' AND column_name = 'description'
  ) THEN
    ALTER TABLE course_plans ADD COLUMN description TEXT;
    COMMENT ON COLUMN course_plans.description IS 'Short description of what this plan includes (e.g. differences from other plans).';
  END IF;
END $$;
