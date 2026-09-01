# Course Code Field - Update Summary

## Overview

Each course now has its own unique `course_code` field, separate from `category_code`. This allows for unique identification of individual courses (e.g., ETBND-001, ETDIY-101, BSB-200).

## What Changed

### Database Changes

1. **New Field Added:**
   - `course_code` (VARCHAR(50) UNIQUE) - Unique identifier for each course
   - Migration script: `docs/database/add_course_code_field.sql`

2. **Auto-Generation:**
   - The migration script automatically generates course codes for existing courses
   - Format: `{category_code}-{padded_number}` (e.g., ETBND-001, ETDIY-101)

### Code Changes

#### 1. TypeScript Interfaces (`lib/api.ts`)
- ✅ Added `course_code?: string` to `Course` interface
- ✅ Added `course_code?: string` to `CourseCreate` interface
- ✅ Added `course_code?: string` to `CourseUpdate` interface

#### 2. Admin Course Form (`components/admin/course-form.tsx`)
- ✅ Added `course_code` input field (next to Course Name)
- ✅ Added `course_code` to form state
- ✅ Added `course_code` to form submission

#### 3. API Routes
- ✅ `app/api/courses/route.ts` - Added `course_code` to POST handler
- ✅ `app/api/courses/[id]/route.ts` - Added `course_code` to PUT handler

#### 4. Admin Courses Page (`app/admin/courses/page.tsx`)
- ✅ Added "Course Code" column to courses table
- ✅ Displays course code as a badge (or "—" if not set)

## Usage

### For Admins

1. **Creating a Course:**
   - Enter a unique course code (e.g., `ETBND-001`, `ETDIY-101`)
   - Format is flexible, but recommended: `{category_code}-{number}`
   - If left empty, the system can auto-generate one

2. **Editing a Course:**
   - Course code can be updated if needed
   - Must remain unique across all courses

### For Developers

1. **Database Migration:**
   ```sql
   -- Run the migration script
   -- File: docs/database/add_course_code_field.sql
   ```

2. **API Usage:**
   ```typescript
   // Create course with code
   const course = await apiClient.createCourse({
     name: "Advanced Web Development",
     course_code: "ETBND-001",
     category: 1,
     // ... other fields
   });
   
   // Update course code
   await apiClient.updateCourse(courseId, {
     course_code: "ETBND-002"
   });
   ```

## Portfolio App Updates Needed

The portfolio app also needs to be updated to:
1. ✅ Display `course_code` in course listings
2. ✅ Show `course_code` on course detail pages
3. ✅ Include `course_code` in API calls

See `docs/PORTFOLIO_APP_UPDATES_NEEDED.md` for details.

## Examples

### Course Codes by Category

**Category 1 (ETBND):**
- `ETBND-001` - Professional Development Course 1
- `ETBND-002` - Professional Development Course 2
- `ETBND-101` - Advanced Leadership Program

**Category 2 (ETDIY):**
- `ETDIY-001` - DIY Toolkit Learning Pack 1
- `ETDIY-101` - Self-Learning Project Pack

**Category 3 (BSB/ICT):**
- `BSB-200` - Business Services Qualification
- `ICT-201` - ICT Trade Qualification

**Category 4 (HE):**
- `HE-300` - Higher Education Degree Program
- `HE-301` - University Partnership Course

**Category 5 (ETP):**
- `ETP-401` - Test Preparation Program 1
- `ETP-402` - Mock Exam Simulation Course

## Notes

- `course_code` is **unique** per course (UNIQUE constraint)
- `category_code` is **shared** across courses in the same category
- Course codes can be manually set or auto-generated
- Format is flexible, but recommended: `{category_code}-{number}`

## Migration Steps

1. Run the migration script in Supabase SQL Editor:
   ```sql
   -- Copy contents of docs/database/add_course_code_field.sql
   -- Execute in Supabase SQL Editor
   ```

2. Verify migration:
   ```sql
   SELECT id, name, category_code, course_code 
   FROM courses 
   ORDER BY id 
   LIMIT 20;
   ```

3. Update any existing courses manually if needed

## Related Files

- `docs/database/add_course_code_field.sql` - Database migration
- `lib/api.ts` - TypeScript interfaces
- `components/admin/course-form.tsx` - Admin form
- `app/api/courses/route.ts` - API routes
- `app/admin/courses/page.tsx` - Admin courses page
- `docs/PORTFOLIO_APP_UPDATES_NEEDED.md` - Portfolio app updates
