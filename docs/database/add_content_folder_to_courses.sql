-- Migration: Add content_folder field to courses table
-- Admin provides a folder name; the app builds content URLs as:
--   {NEXT_PUBLIC_H5P_CONTENT_BASE_URL}/{content_folder}/manifest.json
--   {NEXT_PUBLIC_H5P_CONTENT_BASE_URL}/{content_folder}/student-learning-notes.json
--   etc.
-- Date: 2025

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'courses' AND column_name = 'content_folder'
    ) THEN
        ALTER TABLE courses
        ADD COLUMN content_folder VARCHAR(255);

        COMMENT ON COLUMN courses.content_folder IS 'Folder name under the CDN/content base. URLs are built automatically as {base}/{content_folder}/manifest.json, student-learning-notes.json, etc.';

        CREATE INDEX IF NOT EXISTS idx_courses_content_folder ON courses(content_folder) WHERE content_folder IS NOT NULL;
    END IF;
END $$;
