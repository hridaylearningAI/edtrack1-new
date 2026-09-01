-- Verify Enhanced Course Fields Exist
-- This script checks if curriculum, outcomes, and requirements fields exist in the courses table

-- Step 1: Check if columns exist
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'courses'
AND column_name IN ('curriculum', 'outcomes', 'requirements', 'tags', 'features')
ORDER BY column_name;

-- Step 2: Check current data for a specific course
SELECT 
    id,
    name,
    curriculum,
    outcomes,
    requirements,
    tags,
    features,
    array_length(curriculum, 1) as curriculum_count,
    array_length(outcomes, 1) as outcomes_count,
    array_length(requirements, 1) as requirements_count
FROM courses
WHERE id = 1;  -- Replace with your course ID

-- Step 3: Check all courses with empty arrays
SELECT 
    id,
    name,
    CASE 
        WHEN curriculum IS NULL OR array_length(curriculum, 1) IS NULL THEN 'NULL or empty'
        ELSE 'Has data'
    END as curriculum_status,
    CASE 
        WHEN outcomes IS NULL OR array_length(outcomes, 1) IS NULL THEN 'NULL or empty'
        ELSE 'Has data'
    END as outcomes_status,
    CASE 
        WHEN requirements IS NULL OR array_length(requirements, 1) IS NULL THEN 'NULL or empty'
        ELSE 'Has data'
    END as requirements_status
FROM courses
ORDER BY id;

-- Step 4: If columns don't exist, create them
DO $$
BEGIN
    -- Add curriculum column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'courses' AND column_name = 'curriculum'
    ) THEN
        ALTER TABLE courses 
        ADD COLUMN curriculum TEXT[] DEFAULT '{}';
        
        COMMENT ON COLUMN courses.curriculum IS 'Array of curriculum modules and topics';
    END IF;

    -- Add outcomes column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'courses' AND column_name = 'outcomes'
    ) THEN
        ALTER TABLE courses 
        ADD COLUMN outcomes TEXT[] DEFAULT '{}';
        
        COMMENT ON COLUMN courses.outcomes IS 'Array of learning outcomes and skills gained';
    END IF;

    -- Add requirements column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'courses' AND column_name = 'requirements'
    ) THEN
        ALTER TABLE courses 
        ADD COLUMN requirements TEXT[] DEFAULT '{}';
        
        COMMENT ON COLUMN courses.requirements IS 'Array of prerequisites and requirements';
    END IF;

    -- Add tags column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'courses' AND column_name = 'tags'
    ) THEN
        ALTER TABLE courses 
        ADD COLUMN tags TEXT[] DEFAULT '{}';
        
        COMMENT ON COLUMN courses.tags IS 'Array of course category tags';
    END IF;

    -- Add features column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'courses' AND column_name = 'features'
    ) THEN
        ALTER TABLE courses 
        ADD COLUMN features TEXT[] DEFAULT '{}';
        
        COMMENT ON COLUMN courses.features IS 'Array of course features and highlights';
    END IF;
END $$;

-- Step 5: Verify columns were created/updated
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'courses'
AND column_name IN ('curriculum', 'outcomes', 'requirements', 'tags', 'features')
ORDER BY column_name;
