# Update Category Names Migration

## Overview

This migration updates the category names in the database to match the new naming convention:
- **Category 1**: "Skills and Professional Development Programs" → "Professional Program"
- **Category 2**: "Do-It-Yourself (DIY) Toolkit Learning" → "Skill Development Program"

## Files

1. **`update_category_names.sql`** - Migration script to update existing category names in the database

## Migration Steps

### Step 1: Run the Migration Script

Run the migration script to update category names:

```bash
psql -U your_username -d your_database -f update_category_names.sql
```

Or in Supabase SQL Editor:
1. Open Supabase Dashboard
2. Go to SQL Editor
3. Copy and paste the contents of `update_category_names.sql`
4. Execute the script

**What it does:**
- Updates `course_categories` table with new category names
- Updates `category_name` field in `courses` table for all existing courses
- Verifies the updates with SELECT queries

### Step 2: Verify Updates

After running the migration, verify that:
1. Category names in `course_categories` table are updated
2. All courses with category 1 or 2 have the updated `category_name`

You can run these queries to verify:

```sql
-- Check course_categories table
SELECT id, name, code_prefix 
FROM course_categories 
ORDER BY id;

-- Check courses table
SELECT 
    category,
    category_name,
    COUNT(*) as course_count
FROM courses
WHERE category IN (1, 2)
GROUP BY category, category_name
ORDER BY category;
```

## Code Changes

The code has been updated to:
- Prefer `category_name` from the database over hardcoded mappings
- Keep fallback mappings only for backward compatibility
- Use database values as the source of truth

## Notes

- The original migration file (`add_course_categories_and_pricing.sql`) has also been updated so future installations will have the correct names from the start
- Existing courses will automatically use the new category names from the database
- The frontend will display the category names directly from the database

