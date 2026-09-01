# Course Storage and Display Analysis

## Current Database Structure

### Base Courses Table Schema

Based on the migration files and model definitions, the `courses` table currently has the following structure:

#### Core Fields
- `id` (BIGSERIAL PRIMARY KEY) - Unique course identifier
- `name` (VARCHAR(200) NOT NULL) - Course name
- `description` (TEXT) - Short course description
- `details` (TEXT) - Detailed course content and curriculum (max 5000 chars)
- `status` (VARCHAR(20)) - Course status: 'active', 'inactive', 'draft', 'archived'
- `created_at` (TIMESTAMP WITH TIME ZONE) - Creation timestamp
- `updated_at` (TIMESTAMP WITH TIME ZONE) - Last update timestamp

#### Business/Monetization Fields
- `price` (DECIMAL(10,2)) - Course price in currency
- `discount` (DECIMAL(5,2)) - Discount percentage (0-100)
- `students_enrolled` (INTEGER) - Number of students enrolled (default: 0)

#### Enhanced Fields (Added via migrations)
- `tags` (TEXT[]) - Array of course category tags (e.g., Programming, Business)
- `features` (TEXT[]) - Array of course features and highlights
- `curriculum` (TEXT[]) - Array of curriculum modules and topics
- `outcomes` (TEXT[]) - Array of learning outcomes and skills gained
- `requirements` (TEXT[]) - Array of prerequisites and requirements
- `image_url` (TEXT) - URL to course image/thumbnail
- `rating` (DECIMAL(3,2)) - Course rating (0-5 scale, default: 4.5)
- `level` (VARCHAR(50)) - Course difficulty level (default: 'Self-Paced')
- `duration` (VARCHAR(50)) - Course duration description (default: 'Self-Paced')

#### Course Availability Status
- `course_status` - Availability status: 'live', 'coming_soon', 'archived', 'draft'

### Database Views

#### `course_comprehensive_summary`
- Provides enriched course data with calculated fields
- Includes enrollment statistics (active, completed, cancelled)
- Includes discount information (active count, total count, best discount)
- Calculates final price after discounts
- Used by API endpoints for comprehensive course data

#### `course_enhanced_view`
- Provides enhanced course data with calculated fields
- Includes price formatting and status display

### Indexes
- `idx_courses_price` - Index on price
- `idx_courses_discount` - Index on discount
- `idx_courses_students_enrolled` - Index on students_enrolled
- `idx_courses_status` - Index on status
- `idx_courses_tags` - GIN index on tags array
- `idx_courses_rating` - Index on rating
- `idx_courses_level` - Index on level

---

## API Layer

### Backend API (Python FastAPI)

**Location:** `edtec-student-management-system-api/app/api/v1/endpoints/courses.py`

#### Endpoints:
1. **GET /courses** - Get all courses with filtering and pagination
   - Uses `course_comprehensive_summary` view
   - Supports filters: `name`, `status`
   - Supports pagination: `page`, `limit`
   - Returns: `CourseListResponse`

2. **GET /courses/{course_id}/details** - Get comprehensive course details
   - Returns all enhanced fields (tags, features, curriculum, etc.)
   - Returns: `CourseDetailResponse`

3. **POST /courses** - Create a new course
   - Validates course name uniqueness
   - Initializes `students_enrolled` to 0
   - Returns enriched course data from view

4. **PUT /courses/{course_id}** - Update course
   - Updates course fields
   - Returns updated course data

5. **PUT /courses/{course_id}/enhanced** - Update enhanced course data
   - Updates tags, features, curriculum, outcomes, requirements, etc.

6. **DELETE /courses/{course_id}** - Delete course
   - Soft delete or hard delete (depending on implementation)

### Frontend API (Next.js)

**Location:** `edtec-student-management-system/app/api/courses/route.ts`

#### Endpoints:
1. **GET /api/courses** - Get all courses
   - Direct Supabase query from `courses` table
   - Supports filters: `name`, `status`
   - Supports pagination

2. **POST /api/courses** - Create a new course
   - Inserts into `courses` table
   - Fields: `name`, `description`, `price`, `image_url`, `status`

### API Client (TypeScript)

**Location:** `edtec-student-management-system/lib/api.ts`

#### Course Interface:
```typescript
export interface Course {
  id: number
  name: string
  description?: string
  details?: string
  price?: number
  discount?: number
  students_enrolled?: number
  active_enrollments?: number
  completed_enrollments?: number
  cancelled_enrollments?: number
  average_progress?: number
  active_discount_count?: number
  total_discount_count?: number
  best_discount_amount?: number
  min_price_after_discount?: number
  discounts?: any[]
  enrollments?: any[]
  summary_stats?: any
  status?: string
  course_status?: 'live' | 'coming_soon' | 'archived' | 'draft'
  // Enhanced fields
  tags?: string[]
  features?: string[]
  curriculum?: string[]
  outcomes?: string[]
  requirements?: string[]
  image_url?: string
  rating?: number
  level?: string
  duration?: string
  created_at?: string
  updated_at?: string
}
```

#### API Methods:
- `getCourses(params)` - Fetch courses with filters
- `getCourse(id)` - Get single course
- `createCourse(data)` - Create new course
- `updateCourse(id, data)` - Update course
- `deleteCourse(id)` - Delete course

---

## Frontend Display Components

### Admin Side

#### 1. Courses Management Page
**Location:** `app/admin/courses/page.tsx`

**Features:**
- Table view of all courses
- Columns: Name, Price, Students, Progress, Discounts, Status, Availability, Created, Actions
- Search functionality (by name)
- Status filters (active, inactive, draft, archived)
- Course status filters (live, coming_soon, archived, draft)
- Create/Edit/Delete course actions
- View course details panel

**Data Source:** Uses `useCourses` hook which calls `/api/courses`

#### 2. Course Form Component
**Location:** `components/admin/course-form.tsx`

**Fields:**
- Course Name (required)
- Description (textarea)
- Course Details & Curriculum (textarea)
- Price (number input)
- Discount (number input, 0-100)
- Status (select: active, inactive, draft, archived)
- Course Availability (select: live, coming_soon, archived, draft)

**Note:** Enhanced fields (tags, features, curriculum, outcomes, requirements, image_url, rating, level, duration) are NOT currently in the form

#### 3. Course Dialog
**Location:** `components/admin/course-dialog.tsx`

- Wraps CourseForm in a dialog
- Handles create/edit modes
- Manages loading states

#### 4. Course Details Panel
**Location:** `components/admin/course-details-panel.tsx`

- Displays comprehensive course information
- Shows enrollment statistics
- Shows discount information

### Student Side

#### 1. Course Card Component
**Location:** `components/ui/course-card.tsx`

**Displays:**
- Course name and description
- Course image (if available)
- Course status badge
- Students enrolled count
- Duration
- Rating (stars display)
- Price (with discount if applicable)
- Tags (first 3, with "+X more" if more exist)
- Course level
- Action buttons: "View Details", "Add to Cart" / "Coming Soon" / etc.

**Features:**
- Handles different course statuses (live, coming_soon, archived, draft)
- Shows discounted price if available
- Displays rating with stars

#### 2. Course Grid Component
**Location:** `components/ui/course-card.tsx` (same file)

- Renders multiple CourseCard components in a grid layout
- Responsive: 1 column (mobile), 2 columns (tablet), 3 columns (desktop)

#### 3. Student Courses Page
**Location:** `app/student/courses/page.tsx`

- Displays available courses for students
- Uses CourseGrid component
- Filtering and search capabilities

### Shared Components

#### 1. Course Status Badge
**Location:** `components/ui/course-status-badge.tsx`

- Visual badge for course availability status
- Colors: Live (green), Coming Soon (yellow), Archived (gray), Draft (gray)

#### 2. Course Status Filter
**Location:** `components/ui/course-status-filter.tsx`

- Filter component for course status
- Used in admin courses page

---

## Data Flow

### Creating a Course

1. **Admin fills form** → `CourseForm` component
2. **Form submission** → `CourseDialog` → `onSubmit` callback
3. **API call** → `createCourse()` from `useCourses` hook
4. **Hook calls** → `apiClient.createCourse(data)`
5. **API route** → `POST /api/courses` (Next.js) or `POST /api/v1/courses` (FastAPI)
6. **Database insert** → Supabase `courses` table
7. **Response** → Enriched course data from view
8. **UI update** → Course list refreshes

### Fetching Courses

1. **Component mounts** → `useCourses` hook
2. **Hook calls** → `apiClient.getCourses(params)`
3. **API route** → `GET /api/courses` or `GET /api/v1/courses`
4. **Database query** → `course_comprehensive_summary` view (FastAPI) or `courses` table (Next.js)
5. **Response** → Array of course objects
6. **State update** → Courses stored in hook state
7. **UI render** → Table/Grid displays courses

### Displaying Course Details

1. **User clicks** → "View Details" button
2. **Component** → Opens CourseDetailsPanel or navigates to details page
3. **Data fetch** → `getCourse(id)` API call
4. **API route** → `GET /api/courses/{id}/details` (FastAPI) or `GET /api/courses/{id}` (Next.js)
5. **Database query** → Single course with all fields
6. **UI render** → Displays comprehensive course information

---

## Current Limitations & Observations

### Missing Enhanced Fields in Forms
- The `CourseForm` component does NOT include fields for:
  - `tags` (array)
  - `features` (array)
  - `curriculum` (array) - Note: There's a `details` field that might be used for this
  - `outcomes` (array)
  - `requirements` (array)
  - `image_url`
  - `rating`
  - `level`
  - `duration`

### Inconsistent Data Sources
- FastAPI backend uses `course_comprehensive_summary` view (enriched data)
- Next.js API routes query `courses` table directly (basic data)
- This can lead to inconsistent data between admin and student views

### Status Field Confusion
- Two status fields exist:
  - `status`: 'active', 'inactive', 'draft', 'archived' (internal status)
  - `course_status`: 'live', 'coming_soon', 'archived', 'draft' (availability status)
- Both are used in different contexts, which can be confusing

### Array Fields Storage
- Arrays (tags, features, curriculum, etc.) are stored as PostgreSQL TEXT[] arrays
- Frontend handles them as JavaScript arrays
- No validation on array length in frontend forms (backend has validators)

---

## Summary

**Current Storage:**
- Single `courses` table with all course data
- Enhanced fields added via migrations
- Database views for enriched data
- Arrays stored as PostgreSQL TEXT[] types

**Current Display:**
- Admin: Table view with basic fields, form with limited fields
- Student: Card/Grid view with enhanced fields (tags, rating, image, etc.)
- Enhanced fields are displayed but not editable in admin form

**Key Points:**
1. Courses are stored in a single table with all fields
2. Enhanced fields exist but are not fully integrated into admin forms
3. Two different API implementations (FastAPI and Next.js) may cause inconsistencies
4. Course data includes both business (price, discount) and educational (curriculum, outcomes) fields
5. Status management uses two separate fields for different purposes
