-- Migration: Update Professional Program to Professional Development Programs
-- This script updates the category name from "Professional Program" to "Professional Development Programs"
-- Date: 2025-01-12

-- Step 1: Update category name in course_categories table
UPDATE course_categories
SET name = 'Professional Development Programs'
WHERE id = 1 AND name = 'Professional Program';

-- Step 2: Update category_name in courses table for all courses with category 1
UPDATE courses
SET category_name = 'Professional Development Programs'
WHERE category = 1 AND category_name = 'Professional Program';

-- Verify the updates
SELECT id, name, code_prefix 
FROM course_categories 
WHERE id = 1;

-- Show count of courses updated
SELECT 
    category,
    category_name,
    COUNT(*) as course_count
FROM courses
WHERE category = 1
GROUP BY category, category_name;
