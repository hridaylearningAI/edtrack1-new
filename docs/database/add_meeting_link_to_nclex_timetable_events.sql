-- Add per-event live meeting link for NCLEX timetable events.
ALTER TABLE nclex_timetable_events
ADD COLUMN IF NOT EXISTS meeting_link TEXT;

