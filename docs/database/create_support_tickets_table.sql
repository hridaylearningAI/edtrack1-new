-- EdTec Student Management System - Support Tickets Table Migration
-- Creates support_tickets and support_ticket_replies tables for ticket tracking

-- 1. Sequence table for atomic ticket reference generation (SR-YYYY-NNNN)
CREATE TABLE IF NOT EXISTS support_ticket_sequences (
  year INT NOT NULL PRIMARY KEY,
  last_sequence INT NOT NULL DEFAULT 0
);

-- 2. Support tickets table
CREATE TABLE IF NOT EXISTS support_tickets (
  id SERIAL PRIMARY KEY,
  ticket_reference VARCHAR(20) NOT NULL UNIQUE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_name VARCHAR(255),
  user_email VARCHAR(255),
  title VARCHAR(500) NOT NULL,
  category VARCHAR(100) NOT NULL,
  priority VARCHAR(50) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  description TEXT NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Support ticket replies table
CREATE TABLE IF NOT EXISTS support_ticket_replies (
  id SERIAL PRIMARY KEY,
  ticket_id INTEGER NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  message TEXT NOT NULL,
  is_staff BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Function to generate next ticket reference (SR-YYYY-NNNN)
CREATE OR REPLACE FUNCTION generate_support_ticket_reference()
RETURNS VARCHAR(20) AS $$
DECLARE
  v_year INT;
  v_next_seq INT;
  v_result VARCHAR(20);
BEGIN
  v_year := EXTRACT(YEAR FROM CURRENT_DATE)::INT;

  INSERT INTO support_ticket_sequences (year, last_sequence)
  VALUES (v_year, 1)
  ON CONFLICT (year) DO UPDATE
  SET last_sequence = support_ticket_sequences.last_sequence + 1
  RETURNING last_sequence INTO v_next_seq;

  v_result := 'SR-' || v_year || '-' || LPAD(v_next_seq::TEXT, 4, '0');
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_ticket_reference ON support_tickets(ticket_reference);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON support_tickets(created_at);
CREATE INDEX IF NOT EXISTS idx_support_ticket_replies_ticket_id ON support_ticket_replies(ticket_id);

-- 6. Updated_at trigger (function may already exist from notifications migration)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_support_tickets_updated_at ON support_tickets;
CREATE TRIGGER update_support_tickets_updated_at
  BEFORE UPDATE ON support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 7. Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON support_tickets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON support_ticket_replies TO authenticated;
GRANT USAGE ON SEQUENCE support_tickets_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE support_ticket_replies_id_seq TO authenticated;
