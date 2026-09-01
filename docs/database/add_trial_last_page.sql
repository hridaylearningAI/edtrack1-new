-- Add column to store last viewed page/section for trial course (resume on reopen)
ALTER TABLE enrollments
  ADD COLUMN IF NOT EXISTS trial_last_page_id VARCHAR(255);

COMMENT ON COLUMN enrollments.trial_last_page_id IS 'Page/section ID the student was last viewing in the trial course (e.g. program-overview, topic-1-slides). Used to restore position on reopen.';
