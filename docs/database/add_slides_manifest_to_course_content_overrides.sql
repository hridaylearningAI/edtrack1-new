-- Per-course lecture slide manifest (folder → ordered filenames). Same JSON shape as practice_q_manifest.
-- Run once in Supabase SQL editor.

ALTER TABLE course_content_overrides
  ADD COLUMN IF NOT EXISTS slides_manifest JSONB;

COMMENT ON COLUMN course_content_overrides.slides_manifest IS
  'Lecture slide manifest: { folders: [{ folder: string, slides: string[] }] }. Avoids client-side slide probing.';
