-- Course unlock requests: students request access to locked modules (e.g. NCLEX modules 10+);
-- admin approves or rejects. Used for course_id 45 (NCLEX) and any future gated courses.
CREATE TABLE IF NOT EXISTS course_unlock_requests (
    id SERIAL PRIMARY KEY,
    enrollment_id INTEGER NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(enrollment_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_course_unlock_requests_course ON course_unlock_requests(course_id);
CREATE INDEX IF NOT EXISTS idx_course_unlock_requests_status ON course_unlock_requests(status);
CREATE INDEX IF NOT EXISTS idx_course_unlock_requests_enrollment ON course_unlock_requests(enrollment_id);

COMMENT ON TABLE course_unlock_requests IS 'Student requests to unlock extended course modules; admin approves for NCLEX (course 45) etc.';
