-- Exam proctoring events (NCLEX mock and future high-stakes assessments)
CREATE TABLE IF NOT EXISTS exam_proctoring_events (
    id BIGSERIAL PRIMARY KEY,
    enrollment_id INTEGER NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    attempt_id BIGINT NULL REFERENCES nclex_mock_attempts(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'info',
    message TEXT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    client_timestamp TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exam_proctoring_events_enrollment
  ON exam_proctoring_events(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_exam_proctoring_events_course
  ON exam_proctoring_events(course_id);
CREATE INDEX IF NOT EXISTS idx_exam_proctoring_events_student
  ON exam_proctoring_events(student_id);
CREATE INDEX IF NOT EXISTS idx_exam_proctoring_events_created
  ON exam_proctoring_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_exam_proctoring_events_type
  ON exam_proctoring_events(event_type);

-- Attach proctoring summary to NCLEX mock attempts
ALTER TABLE nclex_mock_attempts
  ADD COLUMN IF NOT EXISTS proctoring_terminated BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE nclex_mock_attempts
  ADD COLUMN IF NOT EXISTS proctoring_terminate_reason TEXT NULL;

ALTER TABLE nclex_mock_attempts
  ADD COLUMN IF NOT EXISTS proctoring_summary JSONB NOT NULL DEFAULT '{}'::jsonb;
