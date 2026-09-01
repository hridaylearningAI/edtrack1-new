-- EdTec Student Management System - Notifications Table Migration
-- This script creates the notifications table for system notifications

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'General' CHECK (type IN ('Payment', 'Achievement', 'Reminder', 'Welcome', 'Course', 'System', 'General')),
    priority VARCHAR(50) NOT NULL DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High')),
    recipient_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    recipient_name VARCHAR(255), -- Denormalized for quick display
    recipient_email VARCHAR(255), -- Denormalized for quick display
    status VARCHAR(50) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Sent', 'Delivered', 'Failed')),
    delivery_method VARCHAR(50) NOT NULL DEFAULT 'Email' CHECK (delivery_method IN ('Email', 'Push', 'SMS', 'In-App')),
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL, -- Admin who created the notification
    metadata JSONB -- Store additional data like course_id, invoice_id, etc.
);

-- Create notification_settings table for user preferences
CREATE TABLE IF NOT EXISTS notification_settings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category VARCHAR(100) NOT NULL, -- e.g., 'Course Updates', 'Payment Reminders'
    email_enabled BOOLEAN DEFAULT true,
    push_enabled BOOLEAN DEFAULT true,
    sms_enabled BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, category)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_id ON notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_sent_at ON notifications(sent_at);
CREATE INDEX IF NOT EXISTS idx_notification_settings_user_id ON notification_settings(user_id);

-- Create updated_at trigger function (if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
DROP TRIGGER IF EXISTS update_notifications_updated_at ON notifications;
CREATE TRIGGER update_notifications_updated_at
    BEFORE UPDATE ON notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_notification_settings_updated_at ON notification_settings;
CREATE TRIGGER update_notification_settings_updated_at
    BEFORE UPDATE ON notification_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON notification_settings TO authenticated;
GRANT USAGE ON SEQUENCE notifications_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE notification_settings_id_seq TO authenticated;

-- Add RLS (Row Level Security) policies
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Allow service role to do everything (for API operations)
CREATE POLICY "Service role full access notifications" ON notifications
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access settings" ON notification_settings
    FOR ALL USING (auth.role() = 'service_role');

-- Policy: Users can view their own notifications
CREATE POLICY "Users can view own notifications" ON notifications
    FOR SELECT USING (auth.uid()::text = recipient_id::text OR auth.role() = 'admin');

-- Policy: Admins can manage all notifications
CREATE POLICY "Admins can manage all notifications" ON notifications
    FOR ALL USING (auth.role() = 'admin');

-- Policy: Users can manage their own notification settings
CREATE POLICY "Users can manage own settings" ON notification_settings
    FOR ALL USING (auth.uid()::text = user_id::text OR auth.role() = 'admin');

