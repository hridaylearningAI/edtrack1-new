# Provider Logo for Accredited VET Provider Courses

This migration adds `provider_logo_url` and `provider_name` to the courses table, allowing admins to upload and display university/RTO logos on course detail pages for Accredited VET Provider courses (category 7).

## Migration

Run the migration:

```bash
psql -U your_user -d your_database -f docs/database/add_provider_logo_to_courses.sql
```

Or via Supabase SQL Editor: paste and run the contents of `add_provider_logo_to_courses.sql`.

## Storage

Provider logos are uploaded to the same `course-images` Supabase storage bucket, in the `provider-logos/` subfolder. The existing storage policies apply.

## Usage

1. In Admin → Courses, add or edit a course
2. Select **Accredited VET Provider Courses** as the category
3. The "Provider / University Logo" section appears
4. Enter the provider name (e.g., "EdTec Institute Australia")
5. Upload a logo (JPEG, PNG, WebP, or SVG, max 2MB) or enter a URL manually
6. Save the course

The logo will appear on the course detail page in the portfolio app (Coursera-style layout).

## Backend Integration

Ensure your portfolio API returns `provider_logo_url` and `provider_name` when fetching course details. The portfolio's CourseDetails component uses these fields when available.
