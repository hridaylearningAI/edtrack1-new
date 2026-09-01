-- Create table to track individual resource/file access by students
CREATE TABLE IF NOT EXISTS course_resource_access (
    id SERIAL PRIMARY KEY,
    enrollment_id INTEGER NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
    student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    moodle_course_id INTEGER,
    resource_id INTEGER NOT NULL, -- Moodle resource/module ID
    resource_name VARCHAR(500) NOT NULL,
    resource_type VARCHAR(100) NOT NULL, -- 'file', 'folder', 'page', 'url', 'assignment', etc.
    resource_url TEXT,
    access_count INTEGER DEFAULT 1,
    first_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    time_spent_seconds INTEGER DEFAULT 0, -- Total time spent on this resource
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(enrollment_id, resource_id) -- Prevent duplicate entries for same resource
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_resource_access_enrollment ON course_resource_access(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_resource_access_student ON course_resource_access(student_id);
CREATE INDEX IF NOT EXISTS idx_resource_access_course ON course_resource_access(course_id);
CREATE INDEX IF NOT EXISTS idx_resource_access_moodle_course ON course_resource_access(moodle_course_id);
CREATE INDEX IF NOT EXISTS idx_resource_access_resource_id ON course_resource_access(resource_id);
CREATE INDEX IF NOT EXISTS idx_resource_access_completed ON course_resource_access(completed);
CREATE INDEX IF NOT EXISTS idx_resource_access_last_accessed ON course_resource_access(last_accessed_at DESC);

-- Create table to track course section/module progress
CREATE TABLE IF NOT EXISTS course_section_progress (
    id SERIAL PRIMARY KEY,
    enrollment_id INTEGER NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
    student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    moodle_course_id INTEGER,
    section_id INTEGER NOT NULL, -- Moodle section ID
    section_name VARCHAR(500) NOT NULL,
    section_number INTEGER NOT NULL,
    resources_total INTEGER DEFAULT 0,
    resources_accessed INTEGER DEFAULT 0,
    resources_completed INTEGER DEFAULT 0,
    progress_percentage INTEGER DEFAULT 0,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(enrollment_id, section_id)
);

-- Create indexes for section progress
CREATE INDEX IF NOT EXISTS idx_section_progress_enrollment ON course_section_progress(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_section_progress_student ON course_section_progress(student_id);
CREATE INDEX IF NOT EXISTS idx_section_progress_course ON course_section_progress(course_id);
CREATE INDEX IF NOT EXISTS idx_section_progress_section ON course_section_progress(section_id);

-- Create table to track overall course activity
CREATE TABLE IF NOT EXISTS course_activity_log (
    id SERIAL PRIMARY KEY,
    enrollment_id INTEGER NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
    student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    activity_type VARCHAR(50) NOT NULL, -- 'resource_access', 'assignment_submission', 'quiz_attempt', 'forum_post', etc.
    activity_details JSONB, -- Store additional activity-specific data
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for activity log
CREATE INDEX IF NOT EXISTS idx_activity_log_enrollment ON course_activity_log(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_student ON course_activity_log(student_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_course ON course_activity_log(course_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_type ON course_activity_log(activity_type);
CREATE INDEX IF NOT EXISTS idx_activity_log_created ON course_activity_log(created_at DESC);

-- Add RLS (Row Level Security) policies
ALTER TABLE course_resource_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_section_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_activity_log ENABLE ROW LEVEL SECURITY;

-- Policy: Allow service role to do everything (for API operations)
CREATE POLICY "Service role full access resource_access" ON course_resource_access
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access section_progress" ON course_section_progress
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access activity_log" ON course_activity_log
    FOR ALL USING (auth.role() = 'service_role');

-- Policy: Admins can view all progress data
CREATE POLICY "Admins can view all resource_access" ON course_resource_access
    FOR SELECT USING (auth.role() = 'admin');

CREATE POLICY "Admins can view all section_progress" ON course_section_progress
    FOR SELECT USING (auth.role() = 'admin');

CREATE POLICY "Admins can view all activity_log" ON course_activity_log
    FOR SELECT USING (auth.role() = 'admin');

-- Policy: Students can view their own progress
CREATE POLICY "Students can view own resource_access" ON course_resource_access
    FOR SELECT USING (auth.uid()::text = (SELECT id::text FROM users WHERE id = student_id));

CREATE POLICY "Students can view own section_progress" ON course_section_progress
    FOR SELECT USING (auth.uid()::text = (SELECT id::text FROM users WHERE id = student_id));

CREATE POLICY "Students can view own activity_log" ON course_activity_log
    FOR SELECT USING (auth.uid()::text = (SELECT id::text FROM users WHERE id = student_id));

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON course_resource_access TO authenticated;
GRANT SELECT, INSERT, UPDATE ON course_section_progress TO authenticated;
GRANT SELECT, INSERT ON course_activity_log TO authenticated;
GRANT USAGE ON SEQUENCE course_resource_access_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE course_section_progress_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE course_activity_log_id_seq TO authenticated;

-- Create a view for detailed progress summary
CREATE OR REPLACE VIEW course_progress_summary AS
SELECT 
    e.id AS enrollment_id,
    e.student_id,
    e.course_id,
    e.moodle_course_id,
    e.progress AS overall_progress,
    COUNT(DISTINCT ra.resource_id) AS total_resources_accessed,
    COUNT(DISTINCT CASE WHEN ra.completed THEN ra.resource_id END) AS total_resources_completed,
    SUM(ra.time_spent_seconds) AS total_time_spent_seconds,
    COUNT(DISTINCT sp.section_id) AS sections_started,
    COUNT(DISTINCT CASE WHEN sp.progress_percentage = 100 THEN sp.section_id END) AS sections_completed,
    MAX(ra.last_accessed_at) AS last_activity_at,
    COUNT(DISTINCT al.id) AS total_activities
FROM enrollments e
LEFT JOIN course_resource_access ra ON ra.enrollment_id = e.id
LEFT JOIN course_section_progress sp ON sp.enrollment_id = e.id
LEFT JOIN course_activity_log al ON al.enrollment_id = e.id
WHERE e.status IN ('active', 'enrolled')
GROUP BY e.id, e.student_id, e.course_id, e.moodle_course_id, e.progress;

