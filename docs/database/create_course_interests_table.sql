-- EdTec Student Management System - Course Interests Table Migration
-- This script creates the course_interests table to track user interest in courses

-- Create course_interests table
CREATE TABLE IF NOT EXISTS course_interests (
    id SERIAL PRIMARY KEY,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    mobile VARCHAR(50),
    region VARCHAR(255),
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL, -- Optional: link to user account if logged in
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Prevent duplicate submissions from the same email for the same course
    UNIQUE(course_id, email)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_course_interests_course_id ON course_interests(course_id);
CREATE INDEX IF NOT EXISTS idx_course_interests_email ON course_interests(email);
CREATE INDEX IF NOT EXISTS idx_course_interests_user_id ON course_interests(user_id);
CREATE INDEX IF NOT EXISTS idx_course_interests_created_at ON course_interests(created_at);

-- Create updated_at trigger function (if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_course_interests_updated_at ON course_interests;
CREATE TRIGGER update_course_interests_updated_at
    BEFORE UPDATE ON course_interests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON course_interests TO authenticated;
GRANT USAGE ON SEQUENCE course_interests_id_seq TO authenticated;

-- Add RLS (Row Level Security) policies
ALTER TABLE course_interests ENABLE ROW LEVEL SECURITY;

-- Policy: Allow service role to do everything (for API operations)
CREATE POLICY "Service role full access course_interests" ON course_interests
    FOR ALL USING (auth.role() = 'service_role');

-- Policy: Users can view their own interests
CREATE POLICY "Users can view own interests" ON course_interests
    FOR SELECT USING (
        auth.uid()::text = user_id::text 
        OR auth.jwt() ->> 'email' = email
        OR auth.role() = 'admin'
    );

-- Policy: Anyone can insert (for public interest submissions)
CREATE POLICY "Anyone can submit interest" ON course_interests
    FOR INSERT WITH CHECK (true);

-- Add comment
COMMENT ON TABLE course_interests IS 'Tracks user interest submissions for courses, particularly for Competitive Test Preparation courses';
COMMENT ON COLUMN course_interests.email IS 'Email address of the person showing interest (used for duplicate detection)';
COMMENT ON COLUMN course_interests.user_id IS 'Optional link to user account if the person is logged in';

