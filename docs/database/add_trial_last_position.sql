-- Add column to store position within the last page (slide index, quiz question, etc.) for trial resume
ALTER TABLE enrollments
  ADD COLUMN IF NOT EXISTS trial_last_position INTEGER;

COMMENT ON COLUMN enrollments.trial_last_position IS 'Position within trial_last_page_id (e.g. slide index 0-based, or quiz question 1-based). Used to restore exact position on reopen.';
