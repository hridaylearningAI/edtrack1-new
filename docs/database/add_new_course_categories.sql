-- Migration: Add New Course Categories (6 and 7)
-- This script adds two new course categories to the system
-- Date: 2024

-- Step 1: Update the CHECK constraint on courses.category to allow categories 1-7
DO $$
BEGIN
    -- Drop the old constraint if it exists
    ALTER TABLE courses DROP CONSTRAINT IF EXISTS courses_category_check;
    
    -- Add new constraint allowing categories 1-7
    ALTER TABLE courses 
    ADD CONSTRAINT courses_category_check CHECK (category IN (1, 2, 3, 4, 5, 6, 7));
    
    -- Update the comment
    COMMENT ON COLUMN courses.category IS 'Course category: 1=Professional Development, 2=Skill Development, 3=Trade Qualifications (VET), 4=Higher Education (HE), 5=Test Preparation, 6=Accredited Higher Education (HE) Courses, 7=Accredited VET Provider Courses';
END $$;

-- Step 2: Insert the new categories into course_categories table
INSERT INTO course_categories (id, name, code_prefix, description, redirects_to_sms, default_duration, default_deadline_months)
VALUES
    (6, 'Accredited Higher Education (HE) Courses', 'HE-ACC', 'Accredited Higher Education courses offered by registered Higher Education providers. These courses lead to recognized qualifications in the Higher Education sector.', false, 'Varies', NULL),
    (7, 'Accredited VET Provider Courses', 'VET-ACC', 'Accredited Vocational Education and Training courses offered by registered VET providers. These courses lead to recognized VET qualifications.', false, 'Varies', NULL)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    code_prefix = EXCLUDED.code_prefix,
    description = EXCLUDED.description,
    redirects_to_sms = EXCLUDED.redirects_to_sms,
    default_duration = EXCLUDED.default_duration,
    default_deadline_months = EXCLUDED.default_deadline_months;

-- Verification: Check that new categories were added successfully
DO $$
DECLARE
    category_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO category_count
    FROM course_categories
    WHERE id IN (6, 7);
    
    IF category_count = 2 THEN
        RAISE NOTICE 'New categories (6 and 7) added successfully!';
    ELSE
        RAISE WARNING 'Expected 2 new categories, but found %', category_count;
    END IF;
END $$;
