# Increase Course Name Length Migration

## Overview

This migration increases the maximum length of the `name` field in the `courses` table from `VARCHAR(200)` to `VARCHAR(500)` to accommodate longer course names.

## Problem

When creating or updating courses with long names (over 200 characters), users encountered database errors: "input name too long" or similar constraint violations.

## Solution

1. **Database Migration**: Increase the field length to `VARCHAR(500)`
2. **Frontend Validation**: Added character counter and maxLength attribute (500 chars)
3. **API Validation**: Added validation in both POST and PUT routes to return helpful error messages

## Files

1. **`increase_course_name_length.sql`** - Database migration script
2. **`components/admin/course-form.tsx`** - Frontend form with validation
3. **`app/api/courses/route.ts`** - API route with validation (POST)
4. **`app/api/courses/[id]/route.ts`** - API route with validation (PUT)

## Migration Steps

### Step 1: Run the Migration

Run the migration script in your Supabase SQL Editor:

```bash
# Or in Supabase Dashboard:
# 1. Open Supabase Dashboard
# 2. Go to SQL Editor
# 3. Copy and paste the contents of increase_course_name_length.sql
# 4. Execute the script
```

Or via command line:

```bash
psql -U your_username -d your_database -f increase_course_name_length.sql
```

### Step 2: Verify the Change

After running the migration, verify the change:

```sql
SELECT column_name, data_type, character_maximum_length
FROM information_schema.columns
WHERE table_name = 'courses' 
AND column_name = 'name';
```

Expected result:
- `data_type`: `character varying`
- `character_maximum_length`: `500`

## Frontend Changes

The course form now includes:
- `maxLength={500}` attribute on the name input
- Character counter showing `{current}/500 characters`
- Warning message when approaching the limit (200+ chars)
- Error message when exceeding the limit (500+ chars)

## API Changes

Both POST and PUT routes now validate:
- Course name must be 500 characters or less
- Returns a clear error message: "Course name must be 500 characters or less"

## Rollback (If Needed)

If you need to rollback to the original 200 character limit:

```sql
ALTER TABLE courses 
ALTER COLUMN name TYPE VARCHAR(200);
```

**Note**: This will fail if any existing course names exceed 200 characters. You would need to truncate them first:

```sql
-- Truncate existing long names (if needed)
UPDATE courses 
SET name = LEFT(name, 200)
WHERE LENGTH(name) > 200;

-- Then alter the column
ALTER TABLE courses 
ALTER COLUMN name TYPE VARCHAR(200);
```

## Testing

1. Try creating a course with a name exactly 500 characters - should succeed
2. Try creating a course with a name 501 characters - should show frontend error
3. Try creating a course with a name 250 characters - should succeed with warning
4. Verify the character counter updates in real-time

