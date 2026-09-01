-- Migration: Add payment-related columns to enrollments table
-- Date: 2024
-- Description: Adds columns for Stripe payment integration in enrollment wizard

-- Add payment_status column
-- Values: 'pending', 'completed', 'failed', NULL
ALTER TABLE enrollments 
ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT NULL;

-- Add payment_session_id column
-- Stores Stripe Checkout Session ID
ALTER TABLE enrollments 
ADD COLUMN IF NOT EXISTS payment_session_id VARCHAR(255) DEFAULT NULL;

-- Add payment_completed_at column
-- Timestamp when payment was completed
ALTER TABLE enrollments 
ADD COLUMN IF NOT EXISTS payment_completed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add index on payment_status for faster queries
CREATE INDEX IF NOT EXISTS idx_enrollments_payment_status 
ON enrollments(payment_status);

-- Add index on payment_session_id for webhook lookups
CREATE INDEX IF NOT EXISTS idx_enrollments_payment_session_id 
ON enrollments(payment_session_id);

-- Add comment to columns for documentation
COMMENT ON COLUMN enrollments.payment_status IS 'Payment status: pending, completed, or failed';
COMMENT ON COLUMN enrollments.payment_session_id IS 'Stripe Checkout Session ID';
COMMENT ON COLUMN enrollments.payment_completed_at IS 'Timestamp when payment was completed';

-- Verify the columns were added
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'enrollments' 
    AND column_name IN ('payment_status', 'payment_session_id', 'payment_completed_at')
ORDER BY column_name;

