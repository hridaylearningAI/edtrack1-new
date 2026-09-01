-- Migration: Add Stripe Product and Price IDs to courses table
-- This enables syncing courses with Stripe products for coupon management
-- Date: 2024

-- Add Stripe product and price ID columns to courses table
DO $$
BEGIN
    -- Add stripe_product_id column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'courses' AND column_name = 'stripe_product_id'
    ) THEN
        ALTER TABLE courses 
        ADD COLUMN stripe_product_id VARCHAR(255);
        
        COMMENT ON COLUMN courses.stripe_product_id IS 'Stripe Product ID for this course';
        
        -- Create index for faster lookups
        CREATE INDEX IF NOT EXISTS idx_courses_stripe_product_id ON courses(stripe_product_id);
    END IF;

    -- Add stripe_price_id_without_certificate column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'courses' AND column_name = 'stripe_price_id_without_certificate'
    ) THEN
        ALTER TABLE courses 
        ADD COLUMN stripe_price_id_without_certificate VARCHAR(255);
        
        COMMENT ON COLUMN courses.stripe_price_id_without_certificate IS 'Stripe Price ID for course without certificate';
        
        CREATE INDEX IF NOT EXISTS idx_courses_stripe_price_id_without_cert ON courses(stripe_price_id_without_certificate);
    END IF;

    -- Add stripe_price_id_with_certificate column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'courses' AND column_name = 'stripe_price_id_with_certificate'
    ) THEN
        ALTER TABLE courses 
        ADD COLUMN stripe_price_id_with_certificate VARCHAR(255);
        
        COMMENT ON COLUMN courses.stripe_price_id_with_certificate IS 'Stripe Price ID for course with certificate';
        
        CREATE INDEX IF NOT EXISTS idx_courses_stripe_price_id_with_cert ON courses(stripe_price_id_with_certificate);
    END IF;

    -- Add stripe_synced_at timestamp
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'courses' AND column_name = 'stripe_synced_at'
    ) THEN
        ALTER TABLE courses 
        ADD COLUMN stripe_synced_at TIMESTAMP WITH TIME ZONE;
        
        COMMENT ON COLUMN courses.stripe_synced_at IS 'Timestamp when course was last synced with Stripe';
    END IF;
END $$;

-- Verify changes
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'courses' AND column_name = 'stripe_product_id'
    ) THEN
        RAISE NOTICE 'Stripe product fields added to courses table successfully';
    ELSE
        RAISE EXCEPTION 'Failed to add Stripe product fields to courses table';
    END IF;
END $$;
