-- EdTec Student Management System - NCLEX Timetable Events Table
-- This table powers the dynamic schedule calendar (MonthlyCalendar) instead of XLSX-only parsing.

-- Create nclex timetable events table
CREATE TABLE IF NOT EXISTS nclex_timetable_events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  date DATE NOT NULL,
  time TEXT NOT NULL,
  type TEXT NOT NULL CHECK (
    type IN ('lecture', 'workshop', 'assessment', 'exam', 'lab', 'due_soon', 'in_progress')
  ),
  course TEXT,
  sheet TEXT,
  meeting_link TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for faster filtering
CREATE INDEX IF NOT EXISTS idx_nclex_timetable_events_date ON nclex_timetable_events(date);
CREATE INDEX IF NOT EXISTS idx_nclex_timetable_events_type ON nclex_timetable_events(type);

-- updated_at trigger helper (shared name used elsewhere in repo migrations)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS trg_nclex_timetable_events_updated_at ON nclex_timetable_events;
CREATE TRIGGER trg_nclex_timetable_events_updated_at
  BEFORE UPDATE ON nclex_timetable_events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

