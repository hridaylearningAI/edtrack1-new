-- EdTec Student Management System - Trainers & Assessments Tables Migration
-- This script creates the trainers and assessments tables

-- Create trainers table
CREATE TABLE IF NOT EXISTS trainers (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    specialization VARCHAR(255),
    experience VARCHAR(100), -- e.g., "8 years"
    rating DECIMAL(3, 2) DEFAULT 0.0 CHECK (rating >= 0 AND rating <= 5),
    students_assigned INTEGER DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'On Leave', 'Inactive')),
    join_date DATE,
    avatar VARCHAR(500),
    qualifications TEXT[], -- Array of qualifications
    courses_teaching INTEGER[], -- Array of course IDs
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL
);

-- Create assessments table
-- Note: Foreign key to courses is optional - if courses table doesn't exist, this will still work
CREATE TABLE IF NOT EXISTS assessments (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    course_id INTEGER, -- Will add foreign key constraint separately if courses table exists
    course_name VARCHAR(255), -- Denormalized for quick display
    trainer_id INTEGER, -- Will add foreign key constraint separately if trainers table exists
    trainer_name VARCHAR(255), -- Denormalized for quick display
    type VARCHAR(50) NOT NULL CHECK (type IN ('Quiz', 'Project', 'Assignment', 'Exam', 'Other')),
    duration VARCHAR(100), -- e.g., "30 minutes", "1 week"
    total_questions INTEGER DEFAULT 0,
    passing_score INTEGER DEFAULT 0 CHECK (passing_score >= 0 AND passing_score <= 100),
    students_attempted INTEGER DEFAULT 0,
    average_score DECIMAL(5, 2) DEFAULT 0.0 CHECK (average_score >= 0 AND average_score <= 100),
    status VARCHAR(50) NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Active', 'Completed', 'Archived')),
    description TEXT,
    instructions TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL
);

-- Add missing columns to assessments table if they don't exist (for existing tables)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'assessments') THEN
        -- Add all columns that might be missing from an existing table
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assessments' AND column_name = 'title') THEN
            ALTER TABLE assessments ADD COLUMN title VARCHAR(255) NOT NULL DEFAULT '';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assessments' AND column_name = 'course_id') THEN
            ALTER TABLE assessments ADD COLUMN course_id INTEGER;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assessments' AND column_name = 'course_name') THEN
            ALTER TABLE assessments ADD COLUMN course_name VARCHAR(255);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assessments' AND column_name = 'trainer_id') THEN
            ALTER TABLE assessments ADD COLUMN trainer_id INTEGER;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assessments' AND column_name = 'trainer_name') THEN
            ALTER TABLE assessments ADD COLUMN trainer_name VARCHAR(255);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assessments' AND column_name = 'type') THEN
            ALTER TABLE assessments ADD COLUMN type VARCHAR(50) NOT NULL DEFAULT 'Quiz' CHECK (type IN ('Quiz', 'Project', 'Assignment', 'Exam', 'Other'));
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assessments' AND column_name = 'duration') THEN
            ALTER TABLE assessments ADD COLUMN duration VARCHAR(100);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assessments' AND column_name = 'total_questions') THEN
            ALTER TABLE assessments ADD COLUMN total_questions INTEGER DEFAULT 0;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assessments' AND column_name = 'passing_score') THEN
            ALTER TABLE assessments ADD COLUMN passing_score INTEGER DEFAULT 0 CHECK (passing_score >= 0 AND passing_score <= 100);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assessments' AND column_name = 'students_attempted') THEN
            ALTER TABLE assessments ADD COLUMN students_attempted INTEGER DEFAULT 0;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assessments' AND column_name = 'average_score') THEN
            ALTER TABLE assessments ADD COLUMN average_score DECIMAL(5, 2) DEFAULT 0.0 CHECK (average_score >= 0 AND average_score <= 100);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assessments' AND column_name = 'status') THEN
            ALTER TABLE assessments ADD COLUMN status VARCHAR(50) NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Active', 'Completed', 'Archived'));
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assessments' AND column_name = 'description') THEN
            ALTER TABLE assessments ADD COLUMN description TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assessments' AND column_name = 'instructions') THEN
            ALTER TABLE assessments ADD COLUMN instructions TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assessments' AND column_name = 'created_at') THEN
            ALTER TABLE assessments ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assessments' AND column_name = 'updated_at') THEN
            ALTER TABLE assessments ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assessments' AND column_name = 'created_by') THEN
            ALTER TABLE assessments ADD COLUMN created_by INTEGER REFERENCES users(id) ON DELETE SET NULL;
        END IF;
    END IF;
END $$;

-- Add foreign key constraints if the referenced tables exist
-- This uses DO block to conditionally add constraints
DO $$
BEGIN
    -- Add foreign key to courses if courses table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'courses') THEN
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'assessments' AND column_name = 'course_id'
        ) THEN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.table_constraints 
                WHERE constraint_name = 'assessments_course_id_fkey' 
                AND table_name = 'assessments'
            ) THEN
                ALTER TABLE assessments 
                ADD CONSTRAINT assessments_course_id_fkey 
                FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE SET NULL;
            END IF;
        END IF;
    END IF;

    -- Add foreign key to trainers if trainers table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'trainers') THEN
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'assessments' AND column_name = 'trainer_id'
        ) THEN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.table_constraints 
                WHERE constraint_name = 'assessments_trainer_id_fkey' 
                AND table_name = 'assessments'
            ) THEN
                ALTER TABLE assessments 
                ADD CONSTRAINT assessments_trainer_id_fkey 
                FOREIGN KEY (trainer_id) REFERENCES trainers(id) ON DELETE SET NULL;
            END IF;
        END IF;
    END IF;
END $$;

-- Create indexes for better performance
-- Use DO blocks to conditionally create indexes only if columns exist
DO $$
BEGIN
    -- Trainers table indexes
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'trainers') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trainers' AND column_name = 'user_id') THEN
            CREATE INDEX IF NOT EXISTS idx_trainers_user_id ON trainers(user_id);
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trainers' AND column_name = 'status') THEN
            CREATE INDEX IF NOT EXISTS idx_trainers_status ON trainers(status);
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trainers' AND column_name = 'email') THEN
            CREATE INDEX IF NOT EXISTS idx_trainers_email ON trainers(email);
        END IF;
    END IF;

    -- Assessments table indexes
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'assessments') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assessments' AND column_name = 'course_id') THEN
            CREATE INDEX IF NOT EXISTS idx_assessments_course_id ON assessments(course_id);
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assessments' AND column_name = 'trainer_id') THEN
            CREATE INDEX IF NOT EXISTS idx_assessments_trainer_id ON assessments(trainer_id);
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assessments' AND column_name = 'status') THEN
            CREATE INDEX IF NOT EXISTS idx_assessments_status ON assessments(status);
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assessments' AND column_name = 'type') THEN
            CREATE INDEX IF NOT EXISTS idx_assessments_type ON assessments(type);
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assessments' AND column_name = 'created_at') THEN
            CREATE INDEX IF NOT EXISTS idx_assessments_created_at ON assessments(created_at);
        END IF;
    END IF;
END $$;

-- Create updated_at trigger function (if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
DROP TRIGGER IF EXISTS update_trainers_updated_at ON trainers;
CREATE TRIGGER update_trainers_updated_at
    BEFORE UPDATE ON trainers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_assessments_updated_at ON assessments;
CREATE TRIGGER update_assessments_updated_at
    BEFORE UPDATE ON assessments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON trainers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON assessments TO authenticated;
GRANT USAGE ON SEQUENCE trainers_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE assessments_id_seq TO authenticated;

-- Add RLS (Row Level Security) policies
ALTER TABLE trainers ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;

-- Policy: Allow service role to do everything (for API operations)
CREATE POLICY "Service role full access trainers" ON trainers
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access assessments" ON assessments
    FOR ALL USING (auth.role() = 'service_role');

-- Policy: Admins can manage all trainers and assessments
CREATE POLICY "Admins can manage all trainers" ON trainers
    FOR ALL USING (auth.role() = 'admin');

CREATE POLICY "Admins can manage all assessments" ON assessments
    FOR ALL USING (auth.role() = 'admin');

-- Note: Trainer-specific RLS policy removed because:
-- 1. auth.uid() returns UUID (text) but user_id is INTEGER
-- 2. Authentication is handled via API routes with requireAuth middleware
-- 3. Service role and admin policies provide sufficient access control

