-- Seed "NCLEX Test Preparation" as a separate exam-only product (ETP-NCLEX-TP).
-- Safe to re-run: upserts on unique course_code; replaces topic sections for that course.
--
-- Does NOT modify full NCLEX course id 45 (ETP-NCLEX).
-- Shares NCLEX CDN content_folder; topics 1–9 only (Practice Q + topic quizzes + main/mock in SMS UI).
--
-- Apply in Supabase SQL editor (staging + production) after course_content_sections exists.

INSERT INTO courses (
  name,
  description,
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
  image_url,
  tags,
  rating,
  content_folder,
  created_at,
  updated_at
)
VALUES (
  'NCLEX Test Preparation',
  $desc$
Prepare for the NCLEX with a comprehensive, AI-powered learning experience designed to help you build confidence, strengthen your clinical knowledge, and improve your exam readiness. Our preparation tools combine structured learning, targeted practice, and intelligent feedback to support you throughout your journey.

Practice Questions

Reinforce your understanding with a comprehensive collection of NCLEX-style practice questions covering all major nursing concepts. Each question is designed to help you apply critical thinking and clinical judgment while preparing for the exam.

What's Included
• Topic-wise NCLEX practice questions
• Detailed answer explanations
• Unlimited practice attempts
• Progressive difficulty levels
• Performance tracking across topics

Presentation Slides with Audio Explanations

Study each concept using professionally designed presentation slides accompanied by audio explanations. Learn at your own pace while gaining a deeper understanding of key nursing concepts and clinical scenarios.

Features
• Structured PowerPoint presentations
• Audio-guided explanations
• Self-paced learning
• Easy revision of important concepts

Topic Quizzes (GNP Series)

Evaluate your knowledge after completing each GNP module through dedicated quizzes. These assessments help reinforce learning and identify areas requiring additional focus before progressing.

Features
• Quiz available for every GNP series module
• Instant scoring and feedback
• Unlimited attempts
• Review correct and incorrect responses
• Track improvement over time

NCLEX Mock Tests

Experience exam conditions through full-length NCLEX-style mock tests designed to simulate the format and difficulty of the actual examination.

Important: These are practice mock tests only and are not the official NCLEX examination conducted by Pearson.

Features
• NCLEX-style exam simulation
• Realistic question formats
• Timed practice sessions
• Detailed performance reports
• Unlimited attempts to improve your score

AI-Powered Learning with EdBot

Take your preparation to the next level with EdBot, your intelligent AI learning assistant.

After every quiz or mock test, EdBot analyses your performance and provides personalised guidance to help you improve more effectively.

EdBot Can Help You
• Explain why the correct answer is right
• Clarify why other options are incorrect
• Simplify difficult nursing concepts
• Answer follow-up questions instantly
• Recommend the modules and topics that need additional study
• Identify your strengths and weaknesses using your assessment results
• Generate a personalised improvement plan based on your performance
• Provide dynamic learning recommendations after every attempt

Learn Without Limits

There are no restrictions on practice. Reattempt quizzes, revisit mock tests, and continue improving until you feel fully prepared for your NCLEX examination.

With unlimited practice, intelligent AI support, and personalised learning recommendations, you'll always know what to study next and where to focus your efforts for maximum success.
$desc$,
  'ETP-NCLEX-TP',
  5,
  'ETP',
  'Test Preparation',
  199,
  199,
  'active',
  'live',
  true,
  false,
  'Self-paced',
  'Exam preparation',
  'https://edtec.online/images/gnps/NCLEX-test-preparation.jpeg',
  ARRAY['NCLEX', 'Test Preparation', 'Practice Questions', 'Mock Test'],
  4.5,
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (course_code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  category_code = EXCLUDED.category_code,
  category_name = EXCLUDED.category_name,
  price_without_certificate = EXCLUDED.price_without_certificate,
  price_with_certificate = EXCLUDED.price_with_certificate,
  status = EXCLUDED.status,
  course_status = EXCLUDED.course_status,
  listed_on_portfolio = EXCLUDED.listed_on_portfolio,
  duration = EXCLUDED.duration,
  level = EXCLUDED.level,
  image_url = EXCLUDED.image_url,
  tags = EXCLUDED.tags,
  rating = EXCLUDED.rating,
  updated_at = NOW();

-- Point at shared NCLEX CDN + clone topics 1–9 from course 45.
DO $$
DECLARE
  nclex_id INTEGER;
  nclex_folder TEXT;
  prep_id INTEGER;
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

  SELECT id INTO prep_id
  FROM courses
  WHERE course_code = 'ETP-NCLEX-TP'
  LIMIT 1;

  IF prep_id IS NULL THEN
    RAISE EXCEPTION 'ETP-NCLEX-TP course not found after upsert';
  END IF;

  UPDATE courses
  SET
    content_folder = nclex_folder,
    updated_at = NOW()
  WHERE id = prep_id;

  DELETE FROM course_content_sections
  WHERE course_id = prep_id;

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
    prep_id,
    m.sort_order,
    'topic',
    m.topic_slug,
    s.folder,
    s.label,
    COALESCE(s.practice_q_source_topic_num, m.fallback_source),
    COALESCE(s.quiz_source_topic_num, m.fallback_source),
    COALESCE(s.ngn_source_topic_num, m.fallback_source),
    NOW(),
    NOW()
  FROM (
    VALUES
      (0, 'topic-1', 1),
      (1, 'topic-2', 8),
      (2, 'topic-3', 7),
      (3, 'topic-4', 2),
      (4, 'topic-5', 3),
      (5, 'topic-6', 4),
      (6, 'topic-7', 5),
      (7, 'topic-8', 6),
      (8, 'topic-9', 9)
  ) AS m(sort_order, topic_slug, fallback_source)
  JOIN course_content_sections s
    ON s.course_id = nclex_id
   AND s.section_kind = 'topic'
   AND s.topic_slug = m.topic_slug;
END $$;

DO $$
DECLARE
  topic_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO topic_count
  FROM course_content_sections s
  JOIN courses c ON c.id = s.course_id
  WHERE c.course_code = 'ETP-NCLEX-TP'
    AND s.section_kind = 'topic';

  IF topic_count <> 9 THEN
    RAISE EXCEPTION 'ETP-NCLEX-TP content seed incomplete; expected 9 topics, got %', topic_count;
  END IF;
END $$;

-- Verify
-- SELECT c.id, c.course_code, c.name, c.image_url, c.content_folder, c.price_with_certificate,
--        s.sort_order, s.topic_slug, s.folder, s.label
-- FROM courses c
-- JOIN course_content_sections s ON s.course_id = c.id
-- WHERE c.course_code = 'ETP-NCLEX-TP'
-- ORDER BY s.sort_order;

-- Quick banner-only fix (if course already seeded with NULL image_url):
-- UPDATE courses
-- SET image_url = 'https://edtec.online/images/gnps/NCLEX-test-preparation.jpeg',
--     updated_at = NOW()
-- WHERE course_code = 'ETP-NCLEX-TP';
