-- Add unlock fields to course_interests so admins can grant "purchase unlock" to people who showed interest.
-- When unlocked, the course page shows plans and Add to cart instead of Show Interest.
-- Run after create_course_interests_table.sql

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'course_interests' AND column_name = 'unlocked_at'
  ) THEN
    ALTER TABLE course_interests
      ADD COLUMN unlocked_at TIMESTAMP WITH TIME ZONE,
      ADD COLUMN unlocked_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_course_interests_unlocked_at ON course_interests(unlocked_at) WHERE unlocked_at IS NOT NULL;
    COMMENT ON COLUMN course_interests.unlocked_at IS 'When set, this person can see the course purchase/plans and add to cart (portfolio course page).';
  END IF;
END $$;
