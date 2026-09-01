# Course Banner Image Upload Setup Guide

## Overview

This guide explains how to set up Supabase Storage for course banner images, allowing admins to upload images directly from the admin dashboard.

## Prerequisites

- Supabase project with Storage enabled
- Admin access to Supabase Dashboard
- Service role key configured in environment variables

## Step 1: Create Storage Bucket

### Via Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **Storage** in the left sidebar
3. Click **"Create a new bucket"**
4. Configure the bucket:
   - **Name**: `course-images`
   - **Public bucket**: ✅ **Checked** (required for public image URLs)
   - **File size limit**: `5MB` (or your preferred limit)
   - **Allowed MIME types**: 
     - `image/jpeg`
     - `image/jpg`
     - `image/png`
     - `image/webp`
     - `image/gif`
5. Click **"Create bucket"**

### Via Supabase CLI (Alternative)

```bash
supabase storage create course-images --public
```

## Step 2: Set Up Storage Policies

Run the SQL script to create storage policies:

```sql
-- Run: docs/database/setup_course_images_storage.sql
```

Or manually create policies in Supabase Dashboard:

1. Go to **Storage** → **Policies** → **course-images**
2. Add the following policies:

### Policy 1: Admins can upload
- **Policy name**: "Admins can upload course images"
- **Allowed operation**: INSERT
- **Target roles**: authenticated
- **Policy definition**:
  ```sql
  bucket_id = 'course-images' AND auth.role() = 'authenticated'
  ```

### Policy 2: Public can view
- **Policy name**: "Public can view course images"
- **Allowed operation**: SELECT
- **Target roles**: public
- **Policy definition**:
  ```sql
  bucket_id = 'course-images'
  ```

### Policy 3: Admins can update
- **Policy name**: "Admins can update course images"
- **Allowed operation**: UPDATE
- **Target roles**: authenticated
- **Policy definition**:
  ```sql
  bucket_id = 'course-images' AND auth.role() = 'authenticated'
  ```

### Policy 4: Admins can delete
- **Policy name**: "Admins can delete course images"
- **Allowed operation**: DELETE
- **Target roles**: authenticated
- **Policy definition**:
  ```sql
  bucket_id = 'course-images' AND auth.role() = 'authenticated'
  ```

## Step 3: Verify Environment Variables

Ensure these are set in your `.env.local`:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-service-role-key
```

**Important**: Use the **service role key** (not the anon key) for server-side uploads.

## Step 4: Test the Upload

1. Go to Admin Dashboard → Courses
2. Click "Add Course" or edit an existing course
3. In the "Banner Image" section:
   - Click "Upload Banner Image"
   - Select an image file (JPEG, PNG, WebP, or GIF, max 5MB)
   - The image should upload and display a preview
   - The image URL should be automatically filled in

## API Endpoint

The upload endpoint is available at:
- **POST** `/api/courses/upload-image`

**Request:**
- Method: POST
- Content-Type: multipart/form-data
- Body: FormData with `file` field

**Response:**
```json
{
  "success": true,
  "data": {
    "url": "https://[project].supabase.co/storage/v1/object/public/course-images/course-banners/filename.jpg",
    "path": "course-banners/filename.jpg",
    "filename": "filename.jpg"
  },
  "message": "Image uploaded successfully"
}
```

## File Structure

Images are stored in the following structure:
```
course-images/
└── course-banners/
    ├── course-1234567890-abc123.jpg
    ├── course-1234567891-def456.png
    └── ...
```

## Security Considerations

1. **File Type Validation**: Only image types (JPEG, PNG, WebP, GIF) are allowed
2. **File Size Limit**: Maximum 5MB per image
3. **Authentication**: Only authenticated users (admins) can upload
4. **Public Access**: Images are publicly accessible (required for display)
5. **Unique Filenames**: Each upload gets a unique filename to prevent conflicts

## Troubleshooting

### Error: "Bucket not found"
- Ensure the bucket `course-images` exists in Supabase Storage
- Check that the bucket name matches exactly (case-sensitive)

### Error: "Permission denied"
- Verify storage policies are set up correctly
- Ensure you're using the service role key (not anon key)
- Check that RLS is properly configured

### Error: "File too large"
- Reduce image size or increase bucket file size limit
- Current limit: 5MB

### Error: "Invalid file type"
- Only image files are allowed: JPEG, PNG, WebP, GIF
- Check file extension and MIME type

### Image not displaying
- Verify bucket is set to **public**
- Check that the image URL is correct
- Ensure CORS is configured if accessing from different domain

## Manual Upload (Alternative)

If automatic upload fails, you can:
1. Upload images manually to Supabase Storage
2. Copy the public URL
3. Paste it into the "Banner Image URL" field in the course form

## Next Steps

After setting up storage:
1. Test image upload from admin dashboard
2. Verify images display correctly in course cards
3. Test image deletion when removing course images
4. Monitor storage usage in Supabase Dashboard
