-- Backfill: Assign EDTEC student numbers to existing users and students
-- Run AFTER add_student_number.sql migration
-- Uses enrollment_date/created_at for cohort (YYX) determination

DO $$
DECLARE
  r RECORD;
  sn VARCHAR(20);
  ref_date DATE;
BEGIN
  -- 1. Users with role=student who lack student_number (one row per user)
  --    Use earliest linked student date or user created_at for cohort
  FOR r IN (
    SELECT DISTINCT ON (u.id) u.id AS user_id,
           u.email,
           COALESCE(s.enrollment_date::date, s.created_at::date, u.created_at::date) AS ref_date
    FROM users u
    LEFT JOIN students s ON (s.id = u.id OR s.email = u.email)
    WHERE u.role = 'student' AND u.student_number IS NULL
    ORDER BY u.id, COALESCE(s.enrollment_date, s.created_at, u.created_at)
  ) LOOP
    ref_date := r.ref_date;
    sn := generate_edtec_student_number(ref_date);
    UPDATE users SET student_number = sn, updated_at = NOW() WHERE id = r.user_id;
    -- Update only ONE student per user (student_number is unique) - prefer id match, else first by email
    UPDATE students SET student_number = sn, updated_at = NOW()
    WHERE id = (
      SELECT id FROM students
      WHERE (id = r.user_id OR email = r.email) AND student_number IS NULL
      ORDER BY CASE WHEN id = r.user_id THEN 0 ELSE 1 END, id
      LIMIT 1
    );
  END LOOP;

  -- 2. Students without student_number (e.g. created from portfolio, no matching user)
  FOR r IN (
    SELECT s.id,
           COALESCE(s.enrollment_date::date, s.created_at::date) AS ref_date
    FROM students s
    WHERE s.student_number IS NULL
    ORDER BY COALESCE(s.enrollment_date, s.created_at)
  ) LOOP
    sn := generate_edtec_student_number(r.ref_date);
    UPDATE students SET student_number = sn, updated_at = NOW() WHERE id = r.id;
    -- Also update ONE user if linked by id or email (student_number is unique on users too)
    UPDATE users SET student_number = sn, updated_at = NOW()
    WHERE id = (
      SELECT id FROM users
      WHERE (id = r.id OR email = (SELECT email FROM students WHERE id = r.id))
        AND student_number IS NULL
        AND role = 'student'
      ORDER BY CASE WHEN id = r.id THEN 0 ELSE 1 END, id
      LIMIT 1
    );
  END LOOP;
END $$;
