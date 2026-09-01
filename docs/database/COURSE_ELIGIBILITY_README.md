# Course Eligibility Table Migration

## Overview

This migration creates a `course_eligibility` table to track user eligibility checks for courses that require eligibility verification, specifically for the NCLEX (National Council Licensure Examination) course.

## Purpose

- Track which users have checked their eligibility for specific courses
- Store eligibility information (qualifications, experience, etc.)
- Allow admins to review and update eligibility status
- Prevent users from showing interest until they are eligible
- Link eligibility checks to user accounts when available

## Migration File

`create_course_eligibility_table.sql`

## How to Run

### Option 1: Using Supabase SQL Editor

1. Open Supabase Dashboard
2. Go to SQL Editor
3. Copy and paste the contents of `create_course_eligibility_table.sql`
4. Execute the script

### Option 2: Using psql

```bash
psql -U your_username -d your_database -f create_course_eligibility_table.sql
```

## Table Structure

### `course_eligibility` Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL PRIMARY KEY | Unique identifier |
| `course_id` | INTEGER | Foreign key to `courses(id)` |
| `email` | VARCHAR(255) | Email address (used for duplicate detection) |
| `name` | VARCHAR(255) | Full name |
| `mobile` | VARCHAR(50) | Mobile number |
| `region` | VARCHAR(255) | Region/location |
| `user_id` | INTEGER | Optional: Foreign key to `users(id)` if logged in |
| `eligibility_status` | VARCHAR(50) | Status: 'pending', 'eligible', 'not_eligible', 'under_review' |
| `eligibility_data` | JSONB | Store specific eligibility information (qualifications, experience, etc.) |
| `notes` | TEXT | Additional notes or comments |
| `checked_by` | INTEGER | Admin who reviewed the eligibility |
| `checked_at` | TIMESTAMP WITH TIME ZONE | When eligibility was reviewed |
| `created_at` | TIMESTAMP WITH TIME ZONE | Submission timestamp |
| `updated_at` | TIMESTAMP WITH TIME ZONE | Last update timestamp |

### Unique Constraint

- `UNIQUE(course_id, email)` - Prevents duplicate eligibility checks from the same email for the same course

### Indexes

- `idx_course_eligibility_course_id` - For filtering by course
- `idx_course_eligibility_email` - For checking duplicates
- `idx_course_eligibility_user_id` - For linking to user accounts
- `idx_course_eligibility_status` - For filtering by status
- `idx_course_eligibility_created_at` - For sorting by date

## API Endpoints

### POST `/api/course-eligibility`

Submits an eligibility check for a course.

**Request Body:**
```json
{
  "courseId": 123,
  "courseName": "NCLEX Test Preparation",
  "name": "John Doe",
  "email": "john@example.com",
  "mobile": "+1234567890",
  "region": "Australia",
  "qualifications": "Bachelor of Nursing, Registered Nurse License",
  "experience": "5 years of nursing experience",
  "additionalInfo": "Additional relevant information",
  "userId": 456 // Optional: if user is logged in
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Eligibility check submitted successfully. Thank you!"
}
```

**Response (Already Submitted):**
```json
{
  "success": true,
  "message": "You have already checked your eligibility for this course. We will review and contact you soon!",
  "alreadySubmitted": true,
  "eligibilityStatus": "pending"
}
```

### GET `/api/course-eligibility?courseId=123&email=john@example.com`

Checks if a user has already checked eligibility and returns the status.

**Response:**
```json
{
  "success": true,
  "hasCheckedEligibility": true,
  "eligibilityStatus": "eligible",
  "submittedAt": "2024-01-15T10:30:00Z"
}
```

## Eligibility Status Values

- `pending` - Eligibility check submitted, awaiting admin review
- `eligible` - User is eligible for the course (can now show interest)
- `not_eligible` - User is not eligible for the course
- `under_review` - Eligibility is currently being reviewed by admin

## Frontend Integration

### Components

1. **CheckEligibilityDialog** - Dialog component for submitting eligibility checks
2. **useCourseEligibility** - Hook for checking eligibility status

### Usage in CourseDetails

For NCLEX courses, the system:
1. Shows "Check Eligibility" button if eligibility hasn't been checked
2. Shows status message if eligibility is pending/not eligible
3. Shows "Show Interest" button only if eligibility status is "eligible"

### Example Flow

1. User visits NCLEX course page
2. User clicks "Check Eligibility" button
3. User fills out eligibility form (qualifications, experience, etc.)
4. Eligibility check is submitted and stored in database with status "pending"
5. Admin reviews eligibility and updates status to "eligible" or "not_eligible"
6. If eligible, user can now click "Show Interest" button
7. User can show interest in the course

## Row Level Security (RLS)

- **Service Role**: Full access (for API operations)
- **Users**: Can view their own eligibility checks (by user_id or email)
- **Admins**: Can view all eligibility checks and update status
- **Anyone**: Can insert (for public eligibility submissions)

## Notes

- Email addresses are normalized (lowercase, trimmed) for duplicate detection
- If a user is logged in, their `user_id` is stored for easier tracking
- The system prevents duplicate submissions based on `(course_id, email)` combination
- Emails are sent to both the user and admin when eligibility is checked
- Admins can update eligibility status through the admin panel
