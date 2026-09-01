-- Course content overrides for Practice Q manifest and Quiz JSON.
-- DB rows here override CDN files for the selected course.
--
-- APPLY ONCE:
-- Supabase Dashboard -> SQL Editor -> paste this file -> Run.

CREATE TABLE IF NOT EXISTS course_content_overrides (
  id BIGSERIAL PRIMARY KEY,
  course_id INTEGER NOT NULL UNIQUE REFERENCES courses(id) ON DELETE CASCADE,
  practice_q_manifest JSONB,
  slides_manifest JSONB,
  quiz_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_course_content_overrides_course_id
  ON course_content_overrides (course_id);

COMMENT ON TABLE course_content_overrides IS 'Per-course DB overrides for practice-q.json and quiz JSON.';
COMMENT ON COLUMN course_content_overrides.practice_q_manifest IS 'JSON shape: { folders: [{ folder: string, slides: string[] }] }';
COMMENT ON COLUMN course_content_overrides.slides_manifest IS 'Lecture slide manifest: same JSON shape as practice_q_manifest.';
COMMENT ON COLUMN course_content_overrides.quiz_json IS 'Quiz JSON in either ParsedQuiz topics format or module-based format.';
