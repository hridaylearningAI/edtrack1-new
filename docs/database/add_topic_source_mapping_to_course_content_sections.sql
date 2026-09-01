-- Adds per-topic source mapping fields so admins can reassign which
-- Practice Q topic and Quiz topic feed each course topic.
--
-- APPLY ONCE:
-- Supabase Dashboard -> SQL Editor -> paste this file -> Run.

ALTER TABLE course_content_sections
  ADD COLUMN IF NOT EXISTS practice_q_source_topic_num INTEGER,
  ADD COLUMN IF NOT EXISTS quiz_source_topic_num INTEGER;

ALTER TABLE course_content_sections
  DROP CONSTRAINT IF EXISTS course_content_sections_practice_q_source_topic_num_check;

ALTER TABLE course_content_sections
  ADD CONSTRAINT course_content_sections_practice_q_source_topic_num_check
  CHECK (practice_q_source_topic_num IS NULL OR practice_q_source_topic_num > 0);

ALTER TABLE course_content_sections
  DROP CONSTRAINT IF EXISTS course_content_sections_quiz_source_topic_num_check;

ALTER TABLE course_content_sections
  ADD CONSTRAINT course_content_sections_quiz_source_topic_num_check
  CHECK (quiz_source_topic_num IS NULL OR quiz_source_topic_num > 0);

COMMENT ON COLUMN course_content_sections.practice_q_source_topic_num IS
  'Optional source topic number from practice-q.json (e.g. 3 means use Topic 3.* folders for this course topic).';

COMMENT ON COLUMN course_content_sections.quiz_source_topic_num IS
  'Optional source quiz topic/module number (1-based) to use for this course topic.';
