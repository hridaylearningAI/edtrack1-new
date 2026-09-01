-- Setup Supabase Storage for Course Banner Images
-- This script creates the storage bucket and sets up policies for course images

-- Step 1: Create storage bucket for course images
-- Note: This needs to be done via Supabase Dashboard or Supabase CLI
-- The bucket name should be: 'course-images'
-- 
-- To create via Dashboard:
-- 1. Go to Supabase Dashboard → Storage
-- 2. Click "Create a new bucket"
-- 3. Name: course-images
-- 4. Public bucket: ✅ Checked (so images can be accessed via public URL)
-- 5. File size limit: 5MB (or your preferred limit)
-- 6. Allowed MIME types: image/jpeg, image/jpg, image/png, image/webp, image/gif

-- Step 2: Enable RLS on storage.objects (if not already enabled)
-- This is usually enabled by default, but we'll ensure it's enabled
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects'
    ) THEN
        -- RLS is managed by Supabase, but we can verify it's enabled
        RAISE NOTICE 'RLS should be enabled on storage.objects by default in Supabase';
    END IF;
END $$;

-- Step 3: Create storage policies for course-images bucket
-- Note: PostgreSQL doesn't support IF NOT EXISTS for CREATE POLICY
-- We'll use DO blocks to conditionally create policies

-- Policy 1: Allow authenticated users (admins) to upload images
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects'
        AND policyname = 'Admins can upload course images'
    ) THEN
        CREATE POLICY "Admins can upload course images"
        ON storage.objects
        FOR INSERT
        TO authenticated
        WITH CHECK (
            bucket_id = 'course-images' AND
            auth.role() = 'authenticated'
        );
    END IF;
END $$;

-- Policy 2: Allow public read access to course images (since bucket is public)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects'
        AND policyname = 'Public can view course images'
    ) THEN
        CREATE POLICY "Public can view course images"
        ON storage.objects
        FOR SELECT
        TO public
        USING (
            bucket_id = 'course-images'
        );
    END IF;
END $$;

-- Policy 3: Allow authenticated users (admins) to update course images
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects'
        AND policyname = 'Admins can update course images'
    ) THEN
        CREATE POLICY "Admins can update course images"
        ON storage.objects
        FOR UPDATE
        TO authenticated
        USING (
            bucket_id = 'course-images' AND
            auth.role() = 'authenticated'
        );
    END IF;
END $$;

-- Policy 4: Allow authenticated users (admins) to delete course images
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects'
        AND policyname = 'Admins can delete course images'
    ) THEN
        CREATE POLICY "Admins can delete course images"
        ON storage.objects
        FOR DELETE
        TO authenticated
        USING (
            bucket_id = 'course-images' AND
            auth.role() = 'authenticated'
        );
    END IF;
END $$;

-- Step 4: Create a function to get public URL for course images
-- This is handled automatically by Supabase, but we can create a helper if needed
CREATE OR REPLACE FUNCTION get_course_image_url(image_path TEXT)
RETURNS TEXT AS $$
BEGIN
    -- Supabase automatically provides public URLs for public buckets
    -- Format: https://[project-ref].supabase.co/storage/v1/object/public/course-images/[path]
    RETURN CONCAT(
        current_setting('app.settings.supabase_url', true),
        '/storage/v1/object/public/course-images/',
        image_path
    );
END;
$$ LANGUAGE plpgsql;

-- Step 5: Add comment
COMMENT ON FUNCTION get_course_image_url IS 'Helper function to generate public URL for course images stored in Supabase storage';

-- Verification: Check that policies were created
DO $$
DECLARE
    policy_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname LIKE '%course images%';
    
    IF policy_count >= 4 THEN
        RAISE NOTICE '✓ Course image storage policies created successfully';
    ELSE
        RAISE WARNING '⚠ Only % course image policies found (expected 4)', policy_count;
    END IF;
END $$;
