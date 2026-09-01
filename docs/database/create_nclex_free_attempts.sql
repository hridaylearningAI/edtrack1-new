-- Free NCLEX trial / diagnostic attempts from the portfolio (no enrollment required).
CREATE TABLE IF NOT EXISTS nclex_free_attempts (
    id BIGSERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    clerk_user_id TEXT,
    email TEXT,
    seed TEXT,
    score_percent INTEGER NOT NULL DEFAULT 0,
    total_questions INTEGER NOT NULL,
    correct_count INTEGER NOT NULL,
    -- [{ "program": 1, "courseCode": "...", "title": "...", "correct": 6, "total": 8, "passed": true }]
    program_breakdown JSONB NOT NULL DEFAULT '[]'::jsonb,
    -- Per-question log with selected + correct answers (same spirit as mock question_items)
    question_items JSONB NOT NULL DEFAULT '[]'::jsonb,
    completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nclex_free_attempts_student ON nclex_free_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_nclex_free_attempts_clerk ON nclex_free_attempts(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_nclex_free_attempts_email ON nclex_free_attempts(email);
CREATE INDEX IF NOT EXISTS idx_nclex_free_attempts_completed_at ON nclex_free_attempts(completed_at DESC);

-- A learner may complete the free trial only once.
CREATE UNIQUE INDEX IF NOT EXISTS uq_nclex_free_attempts_student
    ON nclex_free_attempts(student_id)
    WHERE student_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_nclex_free_attempts_clerk
    ON nclex_free_attempts(clerk_user_id)
    WHERE clerk_user_id IS NOT NULL;
