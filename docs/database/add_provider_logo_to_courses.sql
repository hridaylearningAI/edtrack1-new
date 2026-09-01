-- Migration: Add provider logo and name to courses table
-- For Accredited VET Provider courses (category 7), admins can upload provider/university logos
-- Run this migration after adding the course form fields

-- Add provider_logo_url column (URL to the uploaded provider logo image)
ALTER TABLE courses
ADD COLUMN IF NOT EXISTS provider_logo_url TEXT;

-- Add provider_name column (display name of the provider/university)
ALTER TABLE courses
ADD COLUMN IF NOT EXISTS provider_name TEXT;

-- Add comments for documentation
COMMENT ON COLUMN courses.provider_logo_url IS 'URL to provider/university logo (for Accredited VET Provider courses - category 7)';
COMMENT ON COLUMN courses.provider_name IS 'Display name of the provider/university (for Accredited VET Provider courses - category 7)';
