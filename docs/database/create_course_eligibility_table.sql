-- EdTec Student Management System - Course Eligibility Table Migration
-- This script creates the course_eligibility table to track user eligibility checks for courses
-- Specifically used for NCLEX and other courses that require eligibility verification

-- Create course_eligibility table
CREATE TABLE IF NOT EXISTS course_eligibility (
    id SERIAL PRIMARY KEY,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    mobile VARCHAR(50),
    region VARCHAR(255),
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL, -- Optional: link to user account if logged in
    eligibility_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'eligible', 'not_eligible', 'under_review'
    eligibility_data JSONB, -- Store specific eligibility information (e.g., qualifications, experience, etc.)
    notes TEXT, -- Additional notes or comments
    checked_by INTEGER REFERENCES users(id) ON DELETE SET NULL, -- Admin who reviewed the eligibility
    checked_at TIMESTAMP WITH TIME ZONE, -- When eligibility was reviewed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Prevent duplicate eligibility checks from the same email for the same course
    UNIQUE(course_id, email)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_course_eligibility_course_id ON course_eligibility(course_id);
CREATE INDEX IF NOT EXISTS idx_course_eligibility_email ON course_eligibility(email);
CREATE INDEX IF NOT EXISTS idx_course_eligibility_user_id ON course_eligibility(user_id);
CREATE INDEX IF NOT EXISTS idx_course_eligibility_status ON course_eligibility(eligibility_status);
CREATE INDEX IF NOT EXISTS idx_course_eligibility_created_at ON course_eligibility(created_at);

-- Create updated_at trigger function (if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_course_eligibility_updated_at ON course_eligibility;
CREATE TRIGGER update_course_eligibility_updated_at
    BEFORE UPDATE ON course_eligibility
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON course_eligibility TO authenticated;
GRANT USAGE ON SEQUENCE course_eligibility_id_seq TO authenticated;

-- Add RLS (Row Level Security) policies
ALTER TABLE course_eligibility ENABLE ROW LEVEL SECURITY;

-- Policy: Allow service role to do everything (for API operations)
CREATE POLICY "Service role full access course_eligibility" ON course_eligibility
    FOR ALL USING (auth.role() = 'service_role');

-- Policy: Users can view their own eligibility checks
CREATE POLICY "Users can view own eligibility" ON course_eligibility
    FOR SELECT USING (
        auth.uid()::text = user_id::text 
        OR auth.jwt() ->> 'email' = email
        OR auth.role() = 'admin'
    );

-- Policy: Anyone can insert (for public eligibility submissions)
CREATE POLICY "Anyone can submit eligibility check" ON course_eligibility
    FOR INSERT WITH CHECK (true);

-- Policy: Only admins and service role can update eligibility status
CREATE POLICY "Admins can update eligibility" ON course_eligibility
    FOR UPDATE USING (
        auth.role() = 'admin' 
        OR auth.role() = 'service_role'
    );

-- Add comments
COMMENT ON TABLE course_eligibility IS 'Tracks user eligibility checks for courses that require eligibility verification (e.g., NCLEX)';
COMMENT ON COLUMN course_eligibility.email IS 'Email address of the person checking eligibility (used for duplicate detection)';
COMMENT ON COLUMN course_eligibility.user_id IS 'Optional link to user account if the person is logged in';
COMMENT ON COLUMN course_eligibility.eligibility_status IS 'Status of eligibility: pending, eligible, not_eligible, under_review';
COMMENT ON COLUMN course_eligibility.eligibility_data IS 'JSON data storing specific eligibility information (qualifications, experience, etc.)';
COMMENT ON COLUMN course_eligibility.checked_by IS 'ID of the admin user who reviewed the eligibility';
COMMENT ON COLUMN course_eligibility.checked_at IS 'Timestamp when eligibility was reviewed by an admin';
