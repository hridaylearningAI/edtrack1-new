# Course Interests Table Migration

## Overview

This migration creates a `course_interests` table to track user interest submissions for courses, particularly for Competitive Test Preparation courses (category 5).

## Purpose

- Track which users have shown interest in specific courses
- Prevent duplicate interest submissions from the same email for the same course
- Link interest submissions to user accounts when available
- Store contact information (name, email, mobile, region) for follow-up

## Migration File

`create_course_interests_table.sql`

## How to Run

### Option 1: Using Supabase SQL Editor

1. Open Supabase Dashboard
2. Go to SQL Editor
3. Copy and paste the contents of `create_course_interests_table.sql`
4. Execute the script

### Option 2: Using psql

```bash
psql -U your_username -d your_database -f create_course_interests_table.sql
```

## Table Structure

### `course_interests` Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL PRIMARY KEY | Unique identifier |
| `course_id` | INTEGER | Foreign key to `courses(id)` |
| `email` | VARCHAR(255) | Email address (used for duplicate detection) |
| `name` | VARCHAR(255) | Full name |
| `mobile` | VARCHAR(50) | Mobile number |
| `region` | VARCHAR(255) | Region/location |
| `user_id` | INTEGER | Optional: Foreign key to `users(id)` if logged in |
| `created_at` | TIMESTAMP WITH TIME ZONE | Submission timestamp |
| `updated_at` | TIMESTAMP WITH TIME ZONE | Last update timestamp |

### Unique Constraint

- `UNIQUE(course_id, email)` - Prevents duplicate submissions from the same email for the same course

### Indexes

- `idx_course_interests_course_id` - For filtering by course
- `idx_course_interests_email` - For checking duplicates
- `idx_course_interests_user_id` - For linking to user accounts
- `idx_course_interests_created_at` - For sorting by date

## API Endpoints

### POST `/api/course-interest`

Submits interest for a course.

**Request Body:**
```json
{
  "courseId": 123,
  "courseName": "Course Name",
  "name": "John Doe",
  "email": "john@example.com",
  "mobile": "+1234567890",
  "region": "Australia",
  "userId": 456 // Optional: if user is logged in
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Interest submitted successfully. Thank you!",
  "alreadySubmitted": false
}
```

**Response (Already Submitted):**
```json
{
  "success": true,
  "message": "You have already shown interest in this course. We will contact you soon!",
  "alreadySubmitted": true
}
```

### GET `/api/course-interest?courseId=123&email=john@example.com`

Checks if a user has already shown interest.

**Response:**
```json
{
  "success": true,
  "hasShownInterest": true,
  "submittedAt": "2024-01-15T10:30:00Z"
}
```

## Row Level Security (RLS)

- **Service Role**: Full access (for API operations)
- **Users**: Can view their own interests (by user_id or email)
- **Admins**: Can view all interests
- **Anyone**: Can insert (for public interest submissions)

## Notes

- Email addresses are normalized (lowercase, trimmed) for duplicate detection
- If a user is logged in, their `user_id` is stored for easier tracking
- The system prevents duplicate submissions based on `(course_id, email)` combination
- Emails are still sent even if a duplicate is detected (to acknowledge the submission)

