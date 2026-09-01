-- Attach NCLEX in-app content slices to GNPS courses (ETHTL115–ETHTL124).
-- LEGACY for the student learn UI: ETHTL115–124 now use dedicated three-level JSON packs
-- (notes, video, flashcards, quiz, case studies, decision practice) in lib/gnps/ethtl115.ts.
-- Re-running this seed still maps NCLEX topic folders onto GNPS course rows, but the trial
-- pathway no longer reads those cloned topics for ETHTL115–124.
-- Safe to re-run: resets content_folder + replaces course_content_sections per GNPS course_code.
--
-- Strategy:
--   1) Share the NCLEX CDN root (courses.content_folder = 'NCLEX').
--   2) Give each GNPS course a single topic section cloned from the matching NCLEX module
--      (folder + practice/quiz/NGN source remaps), so learners see that unit only.
--
-- NCLEX course_id 45 topic → GNPS mapping (live course_content_sections):
--   topic-1  Fundamentals              → ETHTL115
--   topic-2  Safety / Infection        → ETHTL116
--   topic-3  Pharmacology              → ETHTL117
--   topic-4  Adult Med–Surg I          → ETHTL118
--   topic-5  Adult Med–Surg II         → ETHTL119
--   topic-6  Maternal / Newborn        → ETHTL120
--   topic-7  Paediatric                → ETHTL121
--   topic-8  Mental Health             → ETHTL122
--   topic-9  Professional Practice     → ETHTL123
--   topic-11 Core Clinical Skills      → ETHTL124
--
-- Prerequisites: seed_gnps_modules.sql already applied; course_content_sections table exists.

DO $$
DECLARE
  nclex_id INTEGER;
  nclex_folder TEXT;
BEGIN
  SELECT id, NULLIF(trim(content_folder), '')
  INTO nclex_id, nclex_folder
  FROM courses
  WHERE id = 45
  LIMIT 1;

  IF nclex_id IS NULL THEN
    RAISE EXCEPTION 'NCLEX course id 45 not found';
  END IF;

  IF nclex_folder IS NULL THEN
    RAISE EXCEPTION 'NCLEX course 45 has no content_folder set';
  END IF;

  -- Point all GNPS courses at the shared NCLEX CDN folder.
  UPDATE courses
  SET
    content_folder = nclex_folder,
    updated_at = NOW()
  WHERE course_code IN (
    'ETHTL115', 'ETHTL116', 'ETHTL117', 'ETHTL118', 'ETHTL119',
    'ETHTL120', 'ETHTL121', 'ETHTL122', 'ETHTL123', 'ETHTL124'
  );

  -- Replace any prior GNPS section rows.
  DELETE FROM course_content_sections
  WHERE course_id IN (
    SELECT id FROM courses
    WHERE course_code IN (
      'ETHTL115', 'ETHTL116', 'ETHTL117', 'ETHTL118', 'ETHTL119',
      'ETHTL120', 'ETHTL121', 'ETHTL122', 'ETHTL123', 'ETHTL124'
    )
  );

  -- One topic per GNPS course. topic_slug is always topic-1 (sole unit in that course).
  -- Source remaps must stay explicit: as the only topic, default idx+1 would be 1.
  INSERT INTO course_content_sections (
    course_id,
    sort_order,
    section_kind,
    topic_slug,
    folder,
    label,
    practice_q_source_topic_num,
    quiz_source_topic_num,
    ngn_source_topic_num,
    created_at,
    updated_at
  )
  SELECT
    g.id,
    0,
    'topic',
    'topic-1',
    s.folder,
    s.label,
    COALESCE(s.practice_q_source_topic_num, m.fallback_source),
    COALESCE(s.quiz_source_topic_num, m.fallback_source),
    COALESCE(s.ngn_source_topic_num, m.fallback_source),
    NOW(),
    NOW()
  FROM (
    VALUES
      ('ETHTL115', 'topic-1', 1),
      ('ETHTL116', 'topic-2', 8),
      ('ETHTL117', 'topic-3', 7),
      ('ETHTL118', 'topic-4', 2),
      ('ETHTL119', 'topic-5', 3),
      ('ETHTL120', 'topic-6', 4),
      ('ETHTL121', 'topic-7', 5),
      ('ETHTL122', 'topic-8', 6),
      ('ETHTL123', 'topic-9', 9),
      -- OSCE clinical skills: no NCLEX quiz/NGN bank entry; use 10 so defaults do not steal topic 1.
      ('ETHTL124', 'topic-11', 10)
  ) AS m(course_code, nclex_topic_slug, fallback_source)
  JOIN courses g ON g.course_code = m.course_code
  JOIN course_content_sections s
    ON s.course_id = nclex_id
   AND s.section_kind = 'topic'
   AND s.topic_slug = m.nclex_topic_slug;
END $$;

-- Fail loudly if any GNPS course is missing a section (bad NCLEX slug / missing course).
DO $$
DECLARE
  missing TEXT;
BEGIN
  SELECT string_agg(c.course_code, ', ' ORDER BY c.course_code)
  INTO missing
  FROM courses c
  WHERE c.course_code IN (
    'ETHTL115', 'ETHTL116', 'ETHTL117', 'ETHTL118', 'ETHTL119',
    'ETHTL120', 'ETHTL121', 'ETHTL122', 'ETHTL123', 'ETHTL124'
  )
  AND NOT EXISTS (
    SELECT 1 FROM course_content_sections s
    WHERE s.course_id = c.id AND s.section_kind = 'topic'
  );

  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'GNPS content seed incomplete; missing sections for: %', missing;
  END IF;
END $$;

-- Verify
-- SELECT c.course_code, c.content_folder, s.folder, s.label,
--        s.practice_q_source_topic_num, s.quiz_source_topic_num, s.ngn_source_topic_num
-- FROM courses c
-- JOIN course_content_sections s ON s.course_id = c.id
-- WHERE c.course_code LIKE 'ETHTL%'
-- ORDER BY c.course_code;
