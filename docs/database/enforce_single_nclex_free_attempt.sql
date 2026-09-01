-- Run this after create_nclex_free_attempts.sql.
-- It enforces one completed free-trial attempt per authenticated learner.

CREATE UNIQUE INDEX IF NOT EXISTS uq_nclex_free_attempts_student
    ON nclex_free_attempts(student_id)
    WHERE student_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_nclex_free_attempts_clerk
    ON nclex_free_attempts(clerk_user_id)
    WHERE clerk_user_id IS NOT NULL;
