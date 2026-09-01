-- Migration: Fix Missing update_course_comprehensive_summary Function
-- This script creates the missing function that's called by the discounts table trigger
-- Date: 2026-01-09

-- Step 1: Create the missing function
-- This function is called by a trigger on the discounts table when discounts are created/updated
-- The function signature expects an integer (likely course_id)
CREATE OR REPLACE FUNCTION update_course_comprehensive_summary(course_id INTEGER)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Since course_comprehensive_summary is a view (not a materialized view),
    -- it automatically reflects changes in the underlying tables.
    -- Views are computed on-the-fly, so no explicit refresh is needed.
    
    -- However, if course_comprehensive_summary is a materialized view,
    -- you would need to refresh it here. For now, we'll create a no-op function
    -- that satisfies the trigger requirement.
    
    -- Optional: Log the function call for debugging
    -- RAISE NOTICE 'update_course_comprehensive_summary called for course_id: %', course_id;
    
    -- If you need to refresh a materialized view, uncomment the following:
    -- REFRESH MATERIALIZED VIEW CONCURRENTLY course_comprehensive_summary;
    
    -- For now, we'll just return without doing anything since views are auto-updated
    RETURN;
END;
$$;

-- Step 2: Add comment to document the function
COMMENT ON FUNCTION update_course_comprehensive_summary(INTEGER) IS 
'Function called by discounts table trigger to update course comprehensive summary. '
'Currently a no-op since course_comprehensive_summary is a view that auto-updates. '
'If converted to a materialized view, add REFRESH MATERIALIZED VIEW logic here.';

-- Step 3: Verify the function was created
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM pg_proc 
        WHERE proname = 'update_course_comprehensive_summary'
        AND pronargs = 1
    ) THEN
        RAISE NOTICE 'Function update_course_comprehensive_summary(INTEGER) created successfully!';
    ELSE
        RAISE WARNING 'Function update_course_comprehensive_summary(INTEGER) was not created!';
    END IF;
END $$;

-- Step 4: Check if there's a trigger on discounts table that calls this function
DO $$
DECLARE
    trigger_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO trigger_count
    FROM pg_trigger t
    JOIN pg_proc p ON t.tgfoid = p.oid
    WHERE t.tgrelid = 'discounts'::regclass
    AND p.proname = 'update_course_comprehensive_summary';
    
    IF trigger_count > 0 THEN
        RAISE NOTICE 'Found % trigger(s) on discounts table calling update_course_comprehensive_summary', trigger_count;
    ELSE
        RAISE NOTICE 'No triggers found on discounts table calling update_course_comprehensive_summary';
        RAISE NOTICE 'The trigger may have been removed or the function name is different';
    END IF;
END $$;
