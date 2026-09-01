# Course Category Migration Guide

## Overview

This migration adds course category system and certificate pricing to the courses table.

## Files

1. **`add_course_categories_and_pricing.sql`** - Migration script to add new fields
2. **`safe_delete_all_courses.sql`** - Safe deletion script for all courses

## Migration Steps

### Step 1: Add New Fields (Migration)

Run the migration script to add new fields:

```bash
psql -U your_username -d your_database -f add_course_categories_and_pricing.sql
```

Or in Supabase SQL Editor:
1. Open Supabase Dashboard
2. Go to SQL Editor
3. Copy and paste the contents of `add_course_categories_and_pricing.sql`
4. Execute the script

**What it does:**
- Adds `category` field (1-5)
- Adds `category_code` field (e.g., ETBND, ETDIY)
- Adds `category_name` field
- Adds `price_without_certificate` field
- Adds `price_with_certificate` field
- Adds `deadline_months` field
- Migrates existing `price` data to `price_without_certificate`
- Sets default category (1) for existing courses
- Creates indexes for performance

### Step 2: Delete Existing Courses (Optional)

⚠️ **WARNING: This will delete ALL courses and related data!**

If you need to delete all existing courses:

```bash
psql -U your_username -d your_database -f safe_delete_all_courses.sql
```

Or in Supabase SQL Editor:
1. Open Supabase Dashboard
2. Go to SQL Editor
3. Copy and paste the contents of `safe_delete_all_courses.sql`
4. Review the warnings
5. Execute the script

**What it does:**
- Shows count of affected records
- Deletes cart_items (CASCADE)
- Deletes enrollments (CASCADE)
- Sets assessments.course_id to NULL (SET NULL)
- Deletes all courses
- Resets the sequence
- Verifies deletion

## Course Categories

| Category | Code | Name | Redirects to SMS? |
|----------|------|------|-------------------|
| 1 | ETBND | Skills and Professional Development Programs | Yes |
| 2 | ETDIY | Do-It-Yourself (DIY) Toolkit Learning | Yes |
| 3 | BSB/ICT | Trade Qualifications in VET Sector | No |
| 4 | HE | Higher Education Qualifications in HE Sector | No |
| 5 | ETP | Competitive Test Preparation | Yes |

## New Fields

### Category Fields
- `category` (INTEGER): 1-5
- `category_code` (VARCHAR): Short code (ETBND, ETDIY, etc.)
- `category_name` (VARCHAR): Display name

### Pricing Fields
- `price_without_certificate` (DECIMAL): Price without certificate
- `price_with_certificate` (DECIMAL): Price with certificate

### Duration Fields
- `deadline_months` (INTEGER): Deadline in months (e.g., 3 for Category 2)

## Foreign Key Relationships

The courses table has relationships with:

1. **enrollments** - `ON DELETE CASCADE`
   - Deleting a course will delete all enrollments

2. **cart_items** - `ON DELETE CASCADE`
   - Deleting a course will delete all cart items

3. **assessments** - `ON DELETE SET NULL`
   - Deleting a course will set `course_id` to NULL in assessments

## Rollback (If Needed)

If you need to rollback the migration:

```sql
-- Remove new columns
ALTER TABLE courses DROP COLUMN IF EXISTS category;
ALTER TABLE courses DROP COLUMN IF EXISTS category_code;
ALTER TABLE courses DROP COLUMN IF EXISTS category_name;
ALTER TABLE courses DROP COLUMN IF EXISTS price_without_certificate;
ALTER TABLE courses DROP COLUMN IF EXISTS price_with_certificate;
ALTER TABLE courses DROP COLUMN IF EXISTS deadline_months;

-- Drop indexes
DROP INDEX IF EXISTS idx_courses_category;
DROP INDEX IF EXISTS idx_courses_category_code;
DROP INDEX IF EXISTS idx_courses_price_without_cert;
DROP INDEX IF EXISTS idx_courses_price_with_cert;
DROP INDEX IF EXISTS idx_courses_deadline_months;
```

## Verification

After running the migration, verify the changes:

```sql
-- Check new columns exist
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'courses'
AND column_name IN ('category', 'category_code', 'category_name', 
                    'price_without_certificate', 'price_with_certificate', 
                    'deadline_months')
ORDER BY column_name;

-- Check indexes
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'courses'
AND indexname LIKE '%category%' OR indexname LIKE '%price%' OR indexname LIKE '%deadline%';

-- Check existing courses have default category
SELECT id, name, category, category_code, category_name, 
       price_without_certificate, price_with_certificate
FROM courses
LIMIT 10;
```

## Next Steps

After running the migration:

1. Update backend models (Python/TypeScript)
2. Update API endpoints
3. Update admin forms
4. Update frontend components
5. Test category-based redirect logic
