-- Ensure mock attempts can store per-question student answers (JSONB log).
ALTER TABLE nclex_mock_attempts
  ADD COLUMN IF NOT EXISTS question_items JSONB NOT NULL DEFAULT '[]'::jsonb;
