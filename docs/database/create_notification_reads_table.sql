-- EdTec Student Management System - Notification Reads Table Migration
-- This script creates a table to track which students have read which notifications
-- This is essential for broadcast notifications (recipient_id = null) where we need
-- to track read status per student, not globally

-- Create notification_reads table
CREATE TABLE IF NOT EXISTS notification_reads (
    id SERIAL PRIMARY KEY,
    notification_id INTEGER NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(notification_id, user_id) -- Ensure one read record per notification per user
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notification_reads_notification_id ON notification_reads(notification_id);
CREATE INDEX IF NOT EXISTS idx_notification_reads_user_id ON notification_reads(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_reads_read_at ON notification_reads(read_at);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON notification_reads TO authenticated;
GRANT USAGE ON SEQUENCE notification_reads_id_seq TO authenticated;

-- Add RLS (Row Level Security) policies
ALTER TABLE notification_reads ENABLE ROW LEVEL SECURITY;

-- Policy: Allow service role to do everything (for API operations)
CREATE POLICY "Service role full access notification_reads" ON notification_reads
    FOR ALL USING (auth.role() = 'service_role');

-- Policy: Users can view their own read records
CREATE POLICY "Users can view own reads" ON notification_reads
    FOR SELECT USING (auth.uid()::text = user_id::text OR auth.role() = 'admin');

-- Policy: Users can create their own read records (mark as read)
CREATE POLICY "Users can create own reads" ON notification_reads
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text OR auth.role() = 'admin');

-- Policy: Admins can manage all read records
CREATE POLICY "Admins can manage all reads" ON notification_reads
    FOR ALL USING (auth.role() = 'admin');
