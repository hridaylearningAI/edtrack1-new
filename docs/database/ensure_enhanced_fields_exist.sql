-- Ensure Enhanced Course Fields Exist
-- This script ensures curriculum, outcomes, and requirements fields exist in the courses table
-- Run this if you're not sure if the fields have been added

-- Step 1: Add curriculum column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'courses' AND column_name = 'curriculum'
    ) THEN
        ALTER TABLE courses 
        ADD COLUMN curriculum TEXT[] DEFAULT '{}';
        
        COMMENT ON COLUMN courses.curriculum IS 'Array of curriculum modules and topics';
        
        RAISE NOTICE 'Added curriculum column';
    ELSE
        RAISE NOTICE 'curriculum column already exists';
    END IF;
END $$;

-- Step 2: Add outcomes column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'courses' AND column_name = 'outcomes'
    ) THEN
        ALTER TABLE courses 
        ADD COLUMN outcomes TEXT[] DEFAULT '{}';
        
        COMMENT ON COLUMN courses.outcomes IS 'Array of learning outcomes and skills gained';
        
        RAISE NOTICE 'Added outcomes column';
    ELSE
        RAISE NOTICE 'outcomes column already exists';
    END IF;
END $$;

-- Step 3: Add requirements column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'courses' AND column_name = 'requirements'
    ) THEN
        ALTER TABLE courses 
        ADD COLUMN requirements TEXT[] DEFAULT '{}';
        
        COMMENT ON COLUMN courses.requirements IS 'Array of prerequisites and requirements';
        
        RAISE NOTICE 'Added requirements column';
    ELSE
        RAISE NOTICE 'requirements column already exists';
    END IF;
END $$;

-- Step 4: Add tags column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'courses' AND column_name = 'tags'
    ) THEN
        ALTER TABLE courses 
        ADD COLUMN tags TEXT[] DEFAULT '{}';
        
        COMMENT ON COLUMN courses.tags IS 'Array of course category tags';
        
        RAISE NOTICE 'Added tags column';
    ELSE
        RAISE NOTICE 'tags column already exists';
    END IF;
END $$;

-- Step 5: Add features column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'courses' AND column_name = 'features'
    ) THEN
        ALTER TABLE courses 
        ADD COLUMN features TEXT[] DEFAULT '{}';
        
        COMMENT ON COLUMN courses.features IS 'Array of course features and highlights';
        
        RAISE NOTICE 'Added features column';
    ELSE
        RAISE NOTICE 'features column already exists';
    END IF;
END $$;

-- Step 6: Ensure NULL values are converted to empty arrays
UPDATE courses 
SET 
    curriculum = COALESCE(curriculum, '{}'),
    outcomes = COALESCE(outcomes, '{}'),
    requirements = COALESCE(requirements, '{}'),
    tags = COALESCE(tags, '{}'),
    features = COALESCE(features, '{}')
WHERE 
    curriculum IS NULL 
    OR outcomes IS NULL 
    OR requirements IS NULL 
    OR tags IS NULL 
    OR features IS NULL;

-- Step 7: Verify columns exist and show sample data
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'courses'
AND column_name IN ('curriculum', 'outcomes', 'requirements', 'tags', 'features')
ORDER BY column_name;

-- Step 8: Show current data status
SELECT 
    id,
    name,
    array_length(curriculum, 1) as curriculum_items,
    array_length(outcomes, 1) as outcomes_items,
    array_length(requirements, 1) as requirements_items,
    array_length(tags, 1) as tags_count,
    array_length(features, 1) as features_count
FROM courses
ORDER BY id
LIMIT 10;
