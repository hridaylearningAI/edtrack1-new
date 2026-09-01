-- Migration: Add Course Code Field
-- This script adds a unique course_code field to the courses table
-- Date: 2024
--
-- Purpose: Each course should have its own unique identifier code
-- (separate from category_code which is shared across courses in the same category)
-- Examples: ETBND-001, ETDIY-101, BSB-200, HE-300, ETP-401

-- Step 1: Add course_code field
DO $$
BEGIN
    -- Add course_code field (unique identifier for each course)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'courses' AND column_name = 'course_code'
    ) THEN
        ALTER TABLE courses 
        ADD COLUMN course_code VARCHAR(50) UNIQUE DEFAULT NULL;
        
        COMMENT ON COLUMN courses.course_code IS 'Unique course identifier code (e.g., ETBND-001, ETDIY-101, BSB-200). Each course has its own unique code, separate from category_code.';
    END IF;
END $$;

-- Step 2: Create index on course_code for faster lookups
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_courses_course_code'
    ) THEN
        CREATE INDEX idx_courses_course_code ON courses(course_code);
    END IF;
END $$;

-- Step 3: Generate course codes for existing courses (if they don't have one)
-- Format: {category_code}-{padded_id}
-- Example: ETBND-001, ETBND-002, ETDIY-001, etc.
DO $$
DECLARE
    course_record RECORD;
    generated_code VARCHAR(50);
    category_prefix VARCHAR(20);
    course_num INTEGER;
BEGIN
    FOR course_record IN 
        SELECT id, category_code, category 
        FROM courses 
        WHERE course_code IS NULL OR course_code = ''
        ORDER BY id
    LOOP
        -- Get category prefix (default to 'COURSE' if category_code is null)
        category_prefix := COALESCE(course_record.category_code, 'COURSE');
        
        -- Get the next number for this category prefix
        SELECT COALESCE(MAX(
            CAST(SUBSTRING(course_code FROM '-(.+)$') AS INTEGER)
        ), 0) + 1
        INTO course_num
        FROM courses
        WHERE course_code LIKE category_prefix || '-%'
        AND course_code ~ ('^' || category_prefix || '-\d+$');
        
        -- Generate course code: {category_prefix}-{padded_number}
        generated_code := category_prefix || '-' || LPAD(course_num::TEXT, 3, '0');
        
        -- Update the course with generated code
        UPDATE courses
        SET course_code = generated_code
        WHERE id = course_record.id;
        
        RAISE NOTICE 'Generated course_code % for course ID %', generated_code, course_record.id;
    END LOOP;
END $$;

-- Step 4: Verify the migration
DO $$
DECLARE
    total_courses INTEGER;
    courses_with_code INTEGER;
    courses_without_code INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_courses FROM courses;
    SELECT COUNT(*) INTO courses_with_code FROM courses WHERE course_code IS NOT NULL AND course_code != '';
    SELECT COUNT(*) INTO courses_without_code FROM courses WHERE course_code IS NULL OR course_code = '';
    
    RAISE NOTICE 'Migration Summary:';
    RAISE NOTICE '  Total courses: %', total_courses;
    RAISE NOTICE '  Courses with code: %', courses_with_code;
    RAISE NOTICE '  Courses without code: %', courses_without_code;
    
    IF courses_without_code > 0 THEN
        RAISE WARNING 'Some courses still do not have course_code assigned. Please review.';
    END IF;
END $$;

-- Verification query (run separately to check results)
-- SELECT id, name, category_code, course_code 
-- FROM courses 
-- ORDER BY id 
-- LIMIT 20;
