-- Migration: Update Category Names
-- This script updates category names in the course_categories table and courses table
-- Date: 2024

-- Step 1: Update category names in course_categories table
UPDATE course_categories
SET name = 'Professional Program'
WHERE id = 1 AND name = 'Skills and Professional Development Programs';

UPDATE course_categories
SET name = 'Skill Development Program'
WHERE id = 2 AND name = 'Do-It-Yourself (DIY) Toolkit Learning';

-- Step 2: Update category_name in courses table for all courses with these categories
UPDATE courses
SET category_name = 'Professional Program'
WHERE category = 1 AND (category_name = 'Skills and Professional Development Programs' OR category_name IS NULL);

UPDATE courses
SET category_name = 'Skill Development Program'
WHERE category = 2 AND (category_name = 'Do-It-Yourself (DIY) Toolkit Learning' OR category_name IS NULL);

-- Verify the updates
SELECT id, name, code_prefix 
FROM course_categories 
ORDER BY id;

-- Show count of courses updated
SELECT 
    category,
    category_name,
    COUNT(*) as course_count
FROM courses
WHERE category IN (1, 2)
GROUP BY category, category_name
ORDER BY category;

