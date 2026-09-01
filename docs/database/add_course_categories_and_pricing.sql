-- Migration: Add Course Categories and Certificate Pricing
-- This script adds category fields and certificate pricing to the courses table
-- Date: 2024

-- Step 1: Add category fields
DO $$
BEGIN
    -- Add category field (1-5 for the 5 course types)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'courses' AND column_name = 'category'
    ) THEN
        ALTER TABLE courses 
        ADD COLUMN category INTEGER DEFAULT 1 CHECK (category IN (1, 2, 3, 4, 5));
        
        COMMENT ON COLUMN courses.category IS 'Course category: 1=Skills/Professional Dev, 2=DIY Toolkit, 3=Trade Qualifications (VET), 4=Higher Education (HE), 5=Test Preparation';
    END IF;

    -- Add category_code field (e.g., ETBND, ETDIY, BSB, ICT, ETP)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'courses' AND column_name = 'category_code'
    ) THEN
        ALTER TABLE courses 
        ADD COLUMN category_code VARCHAR(20) DEFAULT NULL;
        
        COMMENT ON COLUMN courses.category_code IS 'Category code identifier (e.g., ETBND, ETDIY, BSB, ICT, ETP)';
    END IF;

    -- Add category_name field for display
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'courses' AND column_name = 'category_name'
    ) THEN
        ALTER TABLE courses 
        ADD COLUMN category_name VARCHAR(100) DEFAULT NULL;
        
        COMMENT ON COLUMN courses.category_name IS 'Display name for course category';
    END IF;
END $$;

-- Step 2: Add certificate pricing fields
DO $$
BEGIN
    -- Add price_without_certificate field
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'courses' AND column_name = 'price_without_certificate'
    ) THEN
        ALTER TABLE courses 
        ADD COLUMN price_without_certificate DECIMAL(10,2) DEFAULT NULL;
        
        COMMENT ON COLUMN courses.price_without_certificate IS 'Course price without certificate';
    END IF;

    -- Add price_with_certificate field
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'courses' AND column_name = 'price_with_certificate'
    ) THEN
        ALTER TABLE courses 
        ADD COLUMN price_with_certificate DECIMAL(10,2) DEFAULT NULL;
        
        COMMENT ON COLUMN courses.price_with_certificate IS 'Course price with certificate included';
    END IF;
END $$;

-- Step 3: Add deadline_months field for Category 2 courses
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'courses' AND column_name = 'deadline_months'
    ) THEN
        ALTER TABLE courses 
        ADD COLUMN deadline_months INTEGER DEFAULT NULL CHECK (deadline_months > 0);
        
        COMMENT ON COLUMN courses.deadline_months IS 'Deadline in months (e.g., 3 for Category 2 Self-Paced courses)';
    END IF;
END $$;

-- Step 4: Migrate existing price data to price_without_certificate
-- This preserves existing data while adding new structure
DO $$
BEGIN
    -- Only migrate if price_without_certificate is NULL and price exists
    UPDATE courses 
    SET price_without_certificate = price 
    WHERE price_without_certificate IS NULL 
    AND price IS NOT NULL;
    
    -- Also set price_with_certificate to same value initially
    -- Admin can update this later if certificate pricing differs
    UPDATE courses 
    SET price_with_certificate = price 
    WHERE price_with_certificate IS NULL 
    AND price IS NOT NULL;
END $$;

-- Step 5: Create a reference table for course categories
-- This helps maintain consistency and provides a lookup table
CREATE TABLE IF NOT EXISTS course_categories (
    id INTEGER PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code_prefix VARCHAR(20) NOT NULL,
    description TEXT,
    redirects_to_sms BOOLEAN DEFAULT true,
    default_duration VARCHAR(50),
    default_deadline_months INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert the 5 main categories with all their details
INSERT INTO course_categories (id, name, code_prefix, description, redirects_to_sms, default_duration, default_deadline_months)
VALUES
    (1, 'Professional Development Programs', 'ETBND', 'Workforce-focused skill development programs in leadership, digital capability and workplace communication. Industry-endorsed micro-courses offering rapid upskilling, certification and pathway-stackable credentials.', true, 'Self-Paced', NULL),
    (2, 'Skill Development Program', 'ETDIY', 'Affordable self-learning packs with videos, templates and hands-on projects — no trainer required.', true, 'Self-Paced', 3),
    (3, 'Trade Qualifications in VET Sector', 'BSB', 'Accredited programs for Skilled trade and VET pathways. Trade qualifications are offered by partnering Registered Training Organisations (RTOs) and Vocational Training Institutions.', false, 'Varies', NULL),
    (4, 'Higher Education Qualifications in HE Sector', 'HE', 'Higher Education Degree are offered by partnering Institutes of Higher Education (IHEs) and Universities.', false, 'Varies', NULL),
    (5, 'Competitive Test Preparation', 'ETP', 'Data-driven test preparation platform with adaptive practice, analytics and mock exam simulations.', true, 'Self-Paced', NULL)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    code_prefix = EXCLUDED.code_prefix,
    description = EXCLUDED.description,
    redirects_to_sms = EXCLUDED.redirects_to_sms,
    default_duration = EXCLUDED.default_duration,
    default_deadline_months = EXCLUDED.default_deadline_months;

-- Add comment
COMMENT ON TABLE course_categories IS 'Reference table for course categories with their properties and redirect rules';

-- Step 5b: Set default category values for existing courses
-- Assign Category 1 (Skills and Professional Development) as default
DO $$
BEGIN
    UPDATE courses 
    SET 
        category = 1,
        category_name = 'Professional Development Programs',
        category_code = 'ETBND'
    WHERE category IS NULL OR category = 1;
END $$;

-- Step 5b: Create a reference table for course categories (optional but recommended)
-- This helps maintain consistency and provides a lookup table
CREATE TABLE IF NOT EXISTS course_categories (
    id INTEGER PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code_prefix VARCHAR(20) NOT NULL,
    description TEXT,
    redirects_to_sms BOOLEAN DEFAULT true,
    default_duration VARCHAR(50),
    default_deadline_months INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert the 5 main categories
INSERT INTO course_categories (id, name, code_prefix, description, redirects_to_sms, default_duration, default_deadline_months)
VALUES
    (1, 'Professional Development Programs', 'ETBND', 'Workforce-focused skill development programs in leadership, digital capability and workplace communication. Industry-endorsed micro-courses offering rapid upskilling, certification and pathway-stackable credentials.', true, 'Self-Paced', NULL),
    (2, 'Skill Development Program', 'ETDIY', 'Affordable self-learning packs with videos, templates and hands-on projects — no trainer required.', true, 'Self-Paced', 3),
    (3, 'Trade Qualifications in VET Sector', 'BSB', 'Accredited programs for Skilled trade and VET pathways. Trade qualifications are offered by partnering Registered Training Organisations (RTOs) and Vocational Training Institutions.', false, 'Varies', NULL),
    (4, 'Higher Education Qualifications in HE Sector', 'HE', 'Higher Education Degree are offered by partnering Institutes of Higher Education (IHEs) and Universities.', false, 'Varies', NULL),
    (5, 'Competitive Test Preparation', 'ETP', 'Data-driven test preparation platform with adaptive practice, analytics and mock exam simulations.', true, 'Self-Paced', NULL)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    code_prefix = EXCLUDED.code_prefix,
    description = EXCLUDED.description,
    redirects_to_sms = EXCLUDED.redirects_to_sms,
    default_duration = EXCLUDED.default_duration,
    default_deadline_months = EXCLUDED.default_deadline_months;

-- Add comment
COMMENT ON TABLE course_categories IS 'Reference table for course categories with their properties';

-- Step 6: Set default duration and deadline for Category 2 courses
-- Category 2 (DIY Toolkit) should be "Self-Paced" with 3 months deadline
DO $$
BEGIN
    UPDATE courses 
    SET 
        duration = 'Self-Paced',
        deadline_months = 3
    WHERE category = 2 
    AND (duration IS NULL OR duration = '');
END $$;

-- Step 7: Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_courses_category ON courses(category);
CREATE INDEX IF NOT EXISTS idx_courses_category_code ON courses(category_code);
CREATE INDEX IF NOT EXISTS idx_courses_price_without_cert ON courses(price_without_certificate);
CREATE INDEX IF NOT EXISTS idx_courses_price_with_cert ON courses(price_with_certificate);
CREATE INDEX IF NOT EXISTS idx_courses_deadline_months ON courses(deadline_months);
CREATE INDEX IF NOT EXISTS idx_course_categories_id ON course_categories(id);
CREATE INDEX IF NOT EXISTS idx_course_categories_code_prefix ON course_categories(code_prefix);

-- Step 8: Add helpful comments
COMMENT ON TABLE courses IS 'Courses table with category system and certificate pricing support';

-- Verification: Check that all columns were added successfully
DO $$
DECLARE
    missing_columns TEXT[];
BEGIN
    SELECT ARRAY_AGG(column_name) INTO missing_columns
    FROM (
        SELECT 'category' AS column_name
        UNION SELECT 'category_code'
        UNION SELECT 'category_name'
        UNION SELECT 'price_without_certificate'
        UNION SELECT 'price_with_certificate'
        UNION SELECT 'deadline_months'
    ) AS required_columns
    WHERE column_name NOT IN (
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'courses'
    );
    
    IF array_length(missing_columns, 1) > 0 THEN
        RAISE WARNING 'Some columns were not added: %', array_to_string(missing_columns, ', ');
    ELSE
        RAISE NOTICE 'All new columns added successfully!';
    END IF;
END $$;
