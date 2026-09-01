-- Seed BSBCRT511 — Develop critical thinking in others (nationally recognised VET unit)
-- Source: training.gov.au / BSB50120 Diploma of Business (Core)
-- Safe to re-run: upserts on unique course_code, rebuilds content sections, enrolls demo students.
--
-- Apply:
--   Supabase SQL editor, or:
--   psql "$DATABASE_URL" -f docs/database/seed_bsbcrt511.sql

-- Ensure VET / BSB category row exists (id 3 in SMS category reference)
INSERT INTO course_categories (id, name, code_prefix, description, redirects_to_sms)
VALUES (
  3,
  'Trade Qualifications in VET Sector',
  'BSB',
  'Accredited programs for Skilled trade and VET pathways. Trade qualifications are offered by partnering Registered Training Organisations (RTOs) and Vocational Training Institutions.',
  false
)
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  code_prefix = EXCLUDED.code_prefix,
  description = EXCLUDED.description;

-- Course catalog row
INSERT INTO courses (
  name,
  description,
  details,
  course_code,
  category,
  category_code,
  category_name,
  price_without_certificate,
  price_with_certificate,
  status,
  course_status,
  listed_on_portfolio,
  partner_api_enabled,
  duration,
  level,
  deadline_months,
  content_folder,
  tags,
  features,
  curriculum,
  outcomes,
  requirements,
  rating,
  created_at,
  updated_at
)
VALUES (
  'Develop critical thinking in others',
  'BSBCRT511 — skills and knowledge required to develop critical and creative thinking skills in others within a workplace context. Core unit of BSB50120 Diploma of Business.',
  $details$
Unit sector: Critical Thinking & Problem Solving – Critical Thinking
Release: 1 (19 Oct 2020) · Current · Supersedes BSBCRT502 (equivalent)

Application
This unit describes the skills and knowledge required to develop critical and creative thinking skills in others within a workplace context. It applies to individuals who are developing and coaching others, and who are typically responsible for leading teams.

Elements
1. Assess individual and team critical and creative thinking skills
2. Establish an environment that encourages the application of critical and creative thinking
3. Monitor and improve thinking practices

Assessment snapshot
• Develop an environment that supports critical and creative thinking methods
• Facilitate learning opportunities and questioning
• Monitor skill development and recommend future learning arrangements
$details$,
  'BSBCRT511',
  3,
  'BSB',
  'Trade Qualifications in VET Sector',
  450,
  450,
  'active',
  'live',
  false,
  false,
  '4 weeks · ~50–80 hours',
  'Diploma / AQF 5',
  NULL,
  -- EdTec Institute Australia LMS pack (CloudFront /lms/BSBCRT511), not the old SMS H5P /test pack
  'BSBCRT511',
  ARRAY['BSBCRT511', 'BSB50120', 'VET', 'Critical Thinking', 'Diploma of Business', 'Core'],
  ARRAY[
    'Program overview + topic introduction',
    'Three learning topics mapped to training.gov.au elements',
    'Practice questions, quizzes, and workplace activities',
    'Aligned to BSB50120 Diploma of Business (Core)'
  ],
  ARRAY[
    'Program overview',
    'Topic introduction',
    'Topic 1 — Assess individual and team critical and creative thinking skills',
    'Topic 2 — Establish an environment that encourages critical and creative thinking',
    'Topic 3 — Monitor and improve thinking practices'
  ],
  ARRAY[
    'Assess individual and team critical and creative thinking skills by researching models, identifying gaps and facilitating learning opportunities.',
    'Establish an environment that encourages critical and creative thinking by addressing barriers, creating safe processes, facilitating application and providing feedback.',
    'Monitor and improve thinking practices by collecting feedback, identifying support needs and recommending improvements aligned to legislation and organisational policies.'
  ],
  ARRAY[
    'Access to organisational policies and procedures typical of a workplace',
    'Suitable for learners leading or coaching teams'
  ],
  4.8,
  NOW(),
  NOW()
)
ON CONFLICT (course_code) DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  details = EXCLUDED.details,
  category = EXCLUDED.category,
  category_code = EXCLUDED.category_code,
  category_name = EXCLUDED.category_name,
  price_without_certificate = EXCLUDED.price_without_certificate,
  price_with_certificate = EXCLUDED.price_with_certificate,
  status = EXCLUDED.status,
  course_status = EXCLUDED.course_status,
  duration = EXCLUDED.duration,
  level = EXCLUDED.level,
  content_folder = EXCLUDED.content_folder,
  tags = EXCLUDED.tags,
  features = EXCLUDED.features,
  curriculum = EXCLUDED.curriculum,
  outcomes = EXCLUDED.outcomes,
  requirements = EXCLUDED.requirements,
  updated_at = NOW();

-- Full-unit plan
INSERT INTO course_plans (course_id, plan_key, name, description, price, sort_order)
SELECT
  c.id,
  'full',
  'Full unit',
  'Complete BSBCRT511 pathway · certificate eligible',
  450,
  1
FROM courses c
WHERE c.course_code = 'BSBCRT511'
ON CONFLICT (course_id, plan_key) DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  sort_order = EXCLUDED.sort_order;

-- Rebuild learn-page sections for this course
DELETE FROM course_content_sections
WHERE course_id = (SELECT id FROM courses WHERE course_code = 'BSBCRT511');

INSERT INTO course_content_sections (
  course_id, sort_order, section_kind, topic_slug, folder, label,
  practice_q_source_topic_num, quiz_source_topic_num
)
SELECT
  c.id,
  v.sort_order,
  v.section_kind,
  v.topic_slug,
  v.folder,
  v.label,
  v.practice_q_source_topic_num,
  v.quiz_source_topic_num
FROM courses c
CROSS JOIN (
  VALUES
    (0, 'program_overview'::text, NULL::text, 'Topic overview/Slides'::text, 'Program overview'::text, NULL::int, NULL::int),
    (1, 'topic', 'topic-introduction', 'Topic introduction', 'Topic introduction', NULL, NULL),
    (2, 'topic', 'topic-1', 'Topic 1/Slides/Slides', 'Topic 1 — Assess critical and creative thinking skills', 1, 1),
    (3, 'topic', 'topic-2', 'Topic 2/Slides/BSBCRT511 - Topic 2 - Establish environment for Critical Thinking', 'Topic 2 — Establish an environment for thinking', 2, 2),
    (4, 'topic', 'topic-3', 'Topic 3/Slides/BSBCRT511 - Topic 3 - Monitor and Improve thinking process', 'Topic 3 — Monitor and improve thinking practices', 3, 3)
) AS v(sort_order, section_kind, topic_slug, folder, label, practice_q_source_topic_num, quiz_source_topic_num)
WHERE c.course_code = 'BSBCRT511';

-- Slides + Practice Q manifests: see seed_bsbcrt511_etia_overrides.sql
-- (large JSON; apply after this seed or via scripts/apply-bsbcrt511-etia-content.py)

-- Enroll active / demo student accounts onto BSBCRT511 (idempotent)
INSERT INTO enrollments (
  student_id,
  course_id,
  status,
  progress,
  with_certificate,
  plan_id,
  payment_status,
  payment_completed_at,
  notes
)
SELECT
  s.id,
  c.id,
  'active',
  0,
  true,
  p.id,
  'paid',
  NOW(),
  'Seeded BSBCRT511 unit access'
FROM students s
CROSS JOIN courses c
LEFT JOIN course_plans p
  ON p.course_id = c.id AND p.plan_key = 'full'
WHERE c.course_code = 'BSBCRT511'
  AND s.status IN ('active', 'dummy')
  AND (
    s.email ILIKE '%edtec%'
    OR s.email ILIKE '%hriday%'
    OR s.email IN ('emily.davis@email.com', 'test3@gmail.com')
  )
ON CONFLICT (student_id, course_id) DO UPDATE
SET
  status = 'active',
  with_certificate = true,
  plan_id = COALESCE(EXCLUDED.plan_id, enrollments.plan_id),
  payment_status = COALESCE(enrollments.payment_status, 'paid'),
  notes = COALESCE(enrollments.notes, EXCLUDED.notes),
  updated_at = NOW();
