-- Adds per-topic NGN source mapping so admins can reassign which NGN module
-- powers each course topic.
--
-- APPLY ONCE:
-- Supabase Dashboard -> SQL Editor -> paste this file -> Run.

ALTER TABLE course_content_sections
  ADD COLUMN IF NOT EXISTS ngn_source_topic_num INTEGER;

ALTER TABLE course_content_sections
  DROP CONSTRAINT IF EXISTS course_content_sections_ngn_source_topic_num_check;

ALTER TABLE course_content_sections
  ADD CONSTRAINT course_content_sections_ngn_source_topic_num_check
  CHECK (ngn_source_topic_num IS NULL OR ngn_source_topic_num > 0);

COMMENT ON COLUMN course_content_sections.ngn_source_topic_num IS
  'Optional source NGN module/topic number (1-based) for this course topic.';
