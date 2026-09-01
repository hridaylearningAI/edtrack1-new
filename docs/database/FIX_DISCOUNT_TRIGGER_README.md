# Fix Discount Trigger Function

## Problem
When creating or updating discounts, the database throws an error:
```
function update_course_comprehensive_summary(integer) does not exist
```

This happens because there's a trigger on the `discounts` table that calls `update_course_comprehensive_summary(course_id)` when discounts are created or updated, but the function doesn't exist.

## Solution
Run the SQL migration file `fix_discount_trigger_function.sql` to create the missing function.

## How to Apply

### Option 1: Using Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `fix_discount_trigger_function.sql`
4. Click "Run" to execute the migration

### Option 2: Using psql Command Line
```bash
psql -h your-db-host -U your-username -d your-database -f fix_discount_trigger_function.sql
```

### Option 3: Using Supabase CLI
```bash
supabase db execute -f docs/database/fix_discount_trigger_function.sql
```

## What the Migration Does
1. Creates the `update_course_comprehensive_summary(INTEGER)` function
2. The function is currently a no-op (does nothing) since `course_comprehensive_summary` is a view that automatically updates
3. If you later convert `course_comprehensive_summary` to a materialized view, you can update the function to refresh it

## Verification
After running the migration, try creating a discount again. The error should be resolved.

## Notes
- The function accepts an integer parameter (course_id)
- Views in PostgreSQL are automatically updated when underlying data changes
- If you need to refresh a materialized view instead, uncomment the `REFRESH MATERIALIZED VIEW` line in the function
