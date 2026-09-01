-- Add post-session recording URL support for timetable events
ALTER TABLE public.nclex_timetable_events
ADD COLUMN IF NOT EXISTS recording_link text;

COMMENT ON COLUMN public.nclex_timetable_events.recording_link IS
'Recorded session link uploaded by trainer/admin after class.';
