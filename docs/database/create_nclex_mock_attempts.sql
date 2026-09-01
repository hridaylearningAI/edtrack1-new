-- NCLEX mock test attempts: per-session analytics and per-module breakdown (Topics 1–9 / NGN)
CREATE TABLE IF NOT EXISTS nclex_mock_attempts (
    id BIGSERIAL PRIMARY KEY,
    enrollment_id INTEGER NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    marks_earned INTEGER NOT NULL,
    passing_marks INTEGER NOT NULL DEFAULT 125,
    passed BOOLEAN NOT NULL,
    total_questions_in_sequence INTEGER NOT NULL,
    correct_count INTEGER NOT NULL,
    -- [{ "module": 1, "label": "Module 1", "correct": 2, "total": 5, "marksEarned": 4 }]
    breakdown_by_module JSONB NOT NULL DEFAULT '[]'::jsonb,
    -- Per-question attempt log (selected + correct answers). Shape:
    -- [{
    --   "order": 0,
    --   "module": 1,
    --   "source": "topic"|"ngn",
    --   "difficulty": "easy"|"moderate"|"hard",
    --   "correct": true,
    --   "questionId": "...",
    --   "marksEarned": 1,
    --   "question": "stem text",
    --   "selectedAnswer": "B",
    --   "correctAnswer": "B",
    --   "selectedAnswerText": "...",
    --   "correctAnswerText": "...",
    --   "options": [{"letter":"A","text":"..."}, ...]
    -- }]
    question_items JSONB NOT NULL DEFAULT '[]'::jsonb,
    completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nclex_mock_attempts_enrollment ON nclex_mock_attempts(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_nclex_mock_attempts_course ON nclex_mock_attempts(course_id);
CREATE INDEX IF NOT EXISTS idx_nclex_mock_attempts_student ON nclex_mock_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_nclex_mock_attempts_completed_at ON nclex_mock_attempts(completed_at DESC);

-- Ensure question_items exists on databases created before answer logging was added.
ALTER TABLE nclex_mock_attempts
  ADD COLUMN IF NOT EXISTS question_items JSONB NOT NULL DEFAULT '[]'::jsonb;
