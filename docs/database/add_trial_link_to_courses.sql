-- Migration: Add trial_link field to courses table
-- This allows each course to have a custom trial content URL
-- Date: 2025

-- Add trial_link field to courses table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'courses' AND column_name = 'trial_link'
    ) THEN
        ALTER TABLE courses 
        ADD COLUMN trial_link TEXT;
        
        COMMENT ON COLUMN courses.trial_link IS 'URL to the trial course content (e.g., H5P content hosted on S3 or other platforms)';
        
        -- Create index for better query performance (optional, for future filtering)
        CREATE INDEX IF NOT EXISTS idx_courses_trial_link ON courses(trial_link) WHERE trial_link IS NOT NULL;
    END IF;
END $$;
