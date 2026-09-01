-- Safe Deletion Script: Delete All Courses Without Foreign Key Errors
-- This script safely deletes all courses by handling foreign key relationships
-- WARNING: This will delete ALL courses and related data. Use with caution!
-- Date: 2024

-- Step 1: Check what will be affected
DO $$
DECLARE
    course_count INTEGER;
    enrollment_count INTEGER;
    cart_item_count INTEGER;
    assessment_count INTEGER;
BEGIN
    -- Count courses
    SELECT COUNT(*) INTO course_count FROM courses;
    
    -- Count related enrollments
    SELECT COUNT(*) INTO enrollment_count FROM enrollments WHERE course_id IS NOT NULL;
    
    -- Count related cart items
    SELECT COUNT(*) INTO cart_item_count FROM cart_items WHERE course_id IS NOT NULL;
    
    -- Count related assessments
    SELECT COUNT(*) INTO assessment_count FROM assessments WHERE course_id IS NOT NULL;
    
    RAISE NOTICE 'Courses to be deleted: %', course_count;
    RAISE NOTICE 'Enrollments that will be deleted (CASCADE): %', enrollment_count;
    RAISE NOTICE 'Cart items that will be deleted (CASCADE): %', cart_item_count;
    RAISE NOTICE 'Assessments that will have course_id set to NULL (SET NULL): %', assessment_count;
END $$;

-- Step 2: Disable foreign key checks temporarily (PostgreSQL doesn't support this directly)
-- Instead, we'll delete in the correct order based on foreign key constraints

-- Step 3: Delete cart_items first (they reference courses with CASCADE, but we'll be explicit)
-- Note: cart_items have ON DELETE CASCADE, so they'll be deleted automatically
-- But we'll delete them first to be safe and show progress
DO $$
DECLARE
    deleted_cart_items INTEGER;
BEGIN
    DELETE FROM cart_items WHERE course_id IN (SELECT id FROM courses);
    GET DIAGNOSTICS deleted_cart_items = ROW_COUNT;
    RAISE NOTICE 'Deleted % cart items', deleted_cart_items;
END $$;

-- Step 4: Delete enrollments (they reference courses with CASCADE)
-- Note: enrollments have ON DELETE CASCADE, so they'll be deleted automatically
-- But we'll delete them first to be safe and show progress
DO $$
DECLARE
    deleted_enrollments INTEGER;
BEGIN
    DELETE FROM enrollments WHERE course_id IN (SELECT id FROM courses);
    GET DIAGNOSTICS deleted_enrollments = ROW_COUNT;
    RAISE NOTICE 'Deleted % enrollments', deleted_enrollments;
END $$;

-- Step 5: Update assessments to set course_id to NULL (they have ON DELETE SET NULL)
-- This is done automatically by the foreign key constraint, but we'll do it explicitly
DO $$
DECLARE
    updated_assessments INTEGER;
BEGIN
    UPDATE assessments SET course_id = NULL WHERE course_id IN (SELECT id FROM courses);
    GET DIAGNOSTICS updated_assessments = ROW_COUNT;
    RAISE NOTICE 'Updated % assessments (set course_id to NULL)', updated_assessments;
END $$;

-- Step 6: Check for any other tables that might reference courses
-- This is a safety check for any tables we might have missed
DO $$
DECLARE
    ref_table RECORD;
    ref_count INTEGER;
BEGIN
    FOR ref_table IN
        SELECT 
            tc.table_name,
            kcu.column_name,
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name,
            rc.delete_rule
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
            AND ccu.table_schema = tc.table_schema
        JOIN information_schema.referential_constraints AS rc
            ON rc.constraint_name = tc.constraint_name
            AND rc.constraint_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
        AND ccu.table_name = 'courses'
        AND ccu.column_name = 'id'
        AND tc.table_name != 'courses'
    LOOP
        EXECUTE format('SELECT COUNT(*) FROM %I WHERE %I IN (SELECT id FROM courses)', 
                       ref_table.table_name, ref_table.column_name) INTO ref_count;
        
        IF ref_count > 0 THEN
            RAISE NOTICE 'Found % references in table % (column: %, delete rule: %)', 
                ref_count, ref_table.table_name, ref_table.column_name, ref_table.delete_rule;
        END IF;
    END LOOP;
END $$;

-- Step 7: Delete all courses
-- This is safe now because:
-- 1. cart_items are deleted (CASCADE)
-- 2. enrollments are deleted (CASCADE)
-- 3. assessments have course_id set to NULL (SET NULL)
DO $$
DECLARE
    deleted_courses INTEGER;
BEGIN
    DELETE FROM courses;
    GET DIAGNOSTICS deleted_courses = ROW_COUNT;
    RAISE NOTICE 'Successfully deleted % courses', deleted_courses;
END $$;

-- Step 8: Reset the sequence (optional, but recommended)
-- This ensures new course IDs start from 1
DO $$
BEGIN
    -- Get the sequence name for courses.id
    -- For BIGSERIAL, the sequence is typically courses_id_seq
    IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'courses_id_seq') THEN
        ALTER SEQUENCE courses_id_seq RESTART WITH 1;
        RAISE NOTICE 'Reset courses_id_seq sequence to start from 1';
    END IF;
END $$;

-- Step 9: Verify deletion
DO $$
DECLARE
    remaining_courses INTEGER;
    remaining_enrollments INTEGER;
    remaining_cart_items INTEGER;
    assessments_with_course_id INTEGER;
BEGIN
    SELECT COUNT(*) INTO remaining_courses FROM courses;
    SELECT COUNT(*) INTO remaining_enrollments FROM enrollments WHERE course_id IS NOT NULL;
    SELECT COUNT(*) INTO remaining_cart_items FROM cart_items WHERE course_id IS NOT NULL;
    SELECT COUNT(*) INTO assessments_with_course_id FROM assessments WHERE course_id IS NOT NULL;
    
    IF remaining_courses = 0 THEN
        RAISE NOTICE '✓ All courses deleted successfully';
    ELSE
        RAISE WARNING '⚠ % courses still remain', remaining_courses;
    END IF;
    
    IF remaining_enrollments = 0 THEN
        RAISE NOTICE '✓ All enrollments deleted successfully';
    ELSE
        RAISE WARNING '⚠ % enrollments still remain', remaining_enrollments;
    END IF;
    
    IF remaining_cart_items = 0 THEN
        RAISE NOTICE '✓ All cart items deleted successfully';
    ELSE
        RAISE WARNING '⚠ % cart items still remain', remaining_cart_items;
    END IF;
    
    IF assessments_with_course_id = 0 THEN
        RAISE NOTICE '✓ All assessments have course_id set to NULL';
    ELSE
        RAISE WARNING '⚠ % assessments still have course_id set', assessments_with_course_id;
    END IF;
END $$;

-- Final verification query (uncomment to run manually)
-- SELECT 
--     (SELECT COUNT(*) FROM courses) AS courses_remaining,
--     (SELECT COUNT(*) FROM enrollments WHERE course_id IS NOT NULL) AS enrollments_remaining,
--     (SELECT COUNT(*) FROM cart_items WHERE course_id IS NOT NULL) AS cart_items_remaining,
--     (SELECT COUNT(*) FROM assessments WHERE course_id IS NOT NULL) AS assessments_with_course_id;
