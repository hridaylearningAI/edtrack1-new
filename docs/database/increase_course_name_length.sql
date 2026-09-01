-- Migration: Increase Course Name Field Length
-- This script increases the maximum length of the course name field from VARCHAR(200) to VARCHAR(500)
-- Date: 2024
--
-- Purpose: Allow longer course names without hitting database constraints
-- The frontend and API now validate for 500 characters maximum
--
-- NOTE: This migration handles views that depend on the 'name' column by temporarily dropping
--       and recreating them.

-- Step 1: Store view definitions that depend on the courses table
DO $$
DECLARE
    v_oid OID;
    v_name TEXT;
    v_def TEXT;
BEGIN
    -- Create temporary table to store view definitions
    CREATE TEMP TABLE IF NOT EXISTS temp_view_definitions (
        view_name TEXT PRIMARY KEY,
        view_definition TEXT
    );
    
    -- Method 1: Find views that directly reference courses table using pg_depend
    FOR v_oid, v_name IN 
        SELECT DISTINCT v.oid, v.relname
        FROM pg_class v
        JOIN pg_namespace n ON n.oid = v.relnamespace
        WHERE v.relkind = 'v'
        AND n.nspname = 'public'
        AND EXISTS (
            -- Check if this view depends on the courses table
            SELECT 1
            FROM pg_depend d
            JOIN pg_rewrite r ON r.oid = d.objid
            JOIN pg_depend d2 ON d2.objid = r.oid
            JOIN pg_class t ON t.oid = d2.refobjid
            WHERE d.objid = v.oid
            AND t.relname = 'courses'
        )
    LOOP
        -- Get the view definition
        BEGIN
            SELECT pg_get_viewdef(v_oid, true) INTO v_def;
            
            -- Store the view name and definition
            INSERT INTO temp_view_definitions (view_name, view_definition)
            VALUES (v_name, v_def)
            ON CONFLICT (view_name) DO UPDATE SET view_definition = EXCLUDED.view_definition;
            
            RAISE NOTICE 'Found dependent view: %', v_name;
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Could not get definition for view %: %', v_name, SQLERRM;
        END;
    END LOOP;
    
    -- Method 2: Also explicitly check for known views (fallback)
    FOR v_name IN SELECT unnest(ARRAY['course_enhanced_view', 'enrollments_with_course_names', 'course_comprehensive_summary']) AS view_name
    LOOP
        IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = v_name) THEN
            BEGIN
                SELECT pg_get_viewdef(v_name::regclass, true) INTO v_def;
                INSERT INTO temp_view_definitions (view_name, view_definition)
                VALUES (v_name, v_def)
                ON CONFLICT (view_name) DO UPDATE SET view_definition = EXCLUDED.view_definition;
                RAISE NOTICE 'Found % via explicit check', v_name;
            EXCEPTION WHEN OTHERS THEN
                RAISE WARNING 'Could not get definition for %: %', v_name, SQLERRM;
            END;
        END IF;
    END LOOP;
    
    -- Method 3: Find ALL views in public schema and check if they reference courses
    FOR v_name IN
        SELECT viewname
        FROM pg_views
        WHERE schemaname = 'public'
        AND viewname NOT IN (SELECT view_name FROM temp_view_definitions)
    LOOP
        BEGIN
            -- Try to get the definition - if it references courses, we'll catch it
            SELECT pg_get_viewdef(v_name::regclass, true) INTO v_def;
            
            -- Check if the definition contains references to courses.name
            IF v_def ILIKE '%courses%' THEN
                INSERT INTO temp_view_definitions (view_name, view_definition)
                VALUES (v_name, v_def)
                ON CONFLICT (view_name) DO UPDATE SET view_definition = EXCLUDED.view_definition;
                RAISE NOTICE 'Found view % that references courses table', v_name;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            -- Skip views we can't read
            NULL;
        END;
    END LOOP;
END $$;

-- Step 2: Drop dependent views
DO $$
DECLARE
    v_name TEXT;
BEGIN
    -- Drop all views we found
    FOR v_name IN 
        SELECT t.view_name FROM temp_view_definitions t
    LOOP
        BEGIN
            EXECUTE format('DROP VIEW IF EXISTS %I CASCADE', v_name);
            RAISE NOTICE 'Dropped view: %', v_name;
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Could not drop view %: %', v_name, SQLERRM;
        END;
    END LOOP;
    
    -- Also explicitly try to drop known views if they still exist
    FOR v_name IN SELECT unnest(ARRAY['course_enhanced_view', 'enrollments_with_course_names', 'course_comprehensive_summary']) AS view_name
    LOOP
        IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = v_name) THEN
            BEGIN
                EXECUTE format('DROP VIEW IF EXISTS %I CASCADE', v_name);
                RAISE NOTICE 'Dropped % via explicit drop', v_name;
            EXCEPTION WHEN OTHERS THEN
                RAISE WARNING 'Could not drop %: %', v_name, SQLERRM;
            END;
        END IF;
    END LOOP;
END $$;

-- Step 3: Ensure all dependent views are dropped before altering
DO $$
DECLARE
    remaining_view TEXT;
BEGIN
    -- Drop all known views that might depend on courses.name
    FOR remaining_view IN SELECT unnest(ARRAY['course_enhanced_view', 'enrollments_with_course_names', 'course_comprehensive_summary']) AS view_name
    LOOP
        IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = remaining_view) THEN
            BEGIN
                EXECUTE format('DROP VIEW IF EXISTS %I CASCADE', remaining_view);
                RAISE NOTICE 'Dropped % (final check)', remaining_view;
            EXCEPTION WHEN OTHERS THEN
                RAISE WARNING 'Could not drop %: %', remaining_view, SQLERRM;
            END;
        END IF;
    END LOOP;
    
    -- Nuclear option: Drop ALL views in public schema that reference courses
    -- This is a safety net in case the dependency detection missed something
    FOR remaining_view IN
        SELECT v.viewname
        FROM pg_views v
        WHERE v.schemaname = 'public'
        AND v.viewname NOT LIKE 'pg_%'
    LOOP
        BEGIN
            -- Check if view definition contains courses table reference
            DECLARE
                v_def TEXT;
            BEGIN
                SELECT pg_get_viewdef(remaining_view::regclass, true) INTO v_def;
                IF v_def ILIKE '%courses%' AND v_def ILIKE '%name%' THEN
                    EXECUTE format('DROP VIEW IF EXISTS %I CASCADE', remaining_view);
                    RAISE NOTICE 'Dropped view % that references courses.name', remaining_view;
                END IF;
            EXCEPTION WHEN OTHERS THEN
                -- Skip views we can't check
                NULL;
            END;
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;
    END LOOP;
END $$;

-- Step 4: Check current column definition and alter if needed
DO $$
BEGIN
    -- Check if the column exists and has the old length
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'courses' 
        AND column_name = 'name'
        AND character_maximum_length = 200
    ) THEN
        -- Alter the column to increase the length
        ALTER TABLE courses 
        ALTER COLUMN name TYPE VARCHAR(500);
        
        RAISE NOTICE 'Course name field length increased from VARCHAR(200) to VARCHAR(500)';
    ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'courses' 
        AND column_name = 'name'
        AND character_maximum_length >= 500
    ) THEN
        RAISE NOTICE 'Course name field already has length >= 500, no changes needed';
    ELSE
        RAISE NOTICE 'Course name column not found or has unexpected type';
    END IF;
END $$;

-- Step 5: Recreate dropped views
DO $$
DECLARE
    view_rec RECORD;
    create_stmt TEXT;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'pg_temp' AND table_name = 'temp_view_definitions') THEN
        FOR view_rec IN 
            SELECT t.view_name, t.view_definition 
            FROM temp_view_definitions t
            ORDER BY t.view_name
        LOOP
            BEGIN
                -- Recreate the view - pg_get_viewdef returns just the SELECT, so we need to wrap it
                create_stmt := format('CREATE OR REPLACE VIEW %I AS %s', view_rec.view_name, view_rec.view_definition);
                EXECUTE create_stmt;
                RAISE NOTICE 'Recreated view: %', view_rec.view_name;
            EXCEPTION WHEN OTHERS THEN
                RAISE WARNING 'Failed to recreate view %: %', view_rec.view_name, SQLERRM;
                RAISE WARNING 'Attempted statement: %', create_stmt;
            END;
        END LOOP;
        
        -- Clean up temp table
        DROP TABLE IF EXISTS temp_view_definitions;
    END IF;
END $$;

-- Step 6: Verify the change
DO $$
DECLARE
    current_length INTEGER;
BEGIN
    SELECT character_maximum_length INTO current_length
    FROM information_schema.columns
    WHERE table_name = 'courses' 
    AND column_name = 'name';
    
    IF current_length >= 500 THEN
        RAISE NOTICE 'Verification successful: Course name field length is now %', current_length;
    ELSE
        RAISE WARNING 'Verification failed: Course name field length is still %', current_length;
    END IF;
END $$;

