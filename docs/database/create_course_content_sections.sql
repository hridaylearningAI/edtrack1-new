-- Course learn-page structure: order and labels for program overview + topics.
-- When a course has rows here, /api/course-manifest uses them instead of CDN manifest.json.
--
-- APPLY ONCE (required or you will see "Could not find the table ... course_content_sections"):
-- Supabase Dashboard → SQL Editor → New query → paste this entire file → Run.
-- Requires an existing public.courses(id) column (already true in this project).

CREATE TABLE IF NOT EXISTS course_content_sections (
  id BIGSERIAL PRIMARY KEY,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
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
  CONSTRAINT course_content_sections_topic_requires_slug
    CHECK (
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

CREATE UNIQUE INDEX IF NOT EXISTS idx_course_content_sections_one_program
  ON course_content_sections (course_id)
  WHERE section_kind = 'program_overview';

CREATE UNIQUE INDEX IF NOT EXISTS idx_course_content_sections_topic_slug
  ON course_content_sections (course_id, topic_slug)
  WHERE topic_slug IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_course_content_sections_course_sort
  ON course_content_sections (course_id, sort_order);

COMMENT ON TABLE course_content_sections IS 'Ordered learn-page units (program overview + topics). Replaces CDN manifest.json when present.';
COMMENT ON COLUMN course_content_sections.topic_slug IS 'Stable id e.g. topic-1 (topic rows only). Maps to manifest topics[].id.';
COMMENT ON COLUMN course_content_sections.folder IS 'CDN subfolder name under content_folder; must match bucket folders.';
COMMENT ON COLUMN course_content_sections.practice_q_source_topic_num IS 'Optional source topic number from practice-q.json for this course topic.';
COMMENT ON COLUMN course_content_sections.quiz_source_topic_num IS 'Optional source quiz topic/module number (1-based) for this course topic.';
COMMENT ON COLUMN course_content_sections.ngn_source_topic_num IS 'Optional source NGN module/topic number (1-based) for this course topic.';
