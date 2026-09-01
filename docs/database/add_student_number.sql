-- Migration: Add student_number (EDTEC-YYXNNNN) to users and students tables
-- Date: 2025
-- Format: EDTEC-YYXNNNN where YY=year, X=month letter (A=Jan..L=Dec), NNNN=sequence per cohort

-- 1. Create sequence tracking table for atomic ID generation
CREATE TABLE IF NOT EXISTS student_number_sequences (
  year INT NOT NULL,
  month INT NOT NULL CHECK (month >= 1 AND month <= 12),
  last_sequence INT NOT NULL DEFAULT 0,
  PRIMARY KEY (year, month)
);

-- 2. Add student_number column to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS student_number VARCHAR(20) UNIQUE;

-- 3. Add student_number column to students table
ALTER TABLE students
ADD COLUMN IF NOT EXISTS student_number VARCHAR(20) UNIQUE;

-- 4. Index for lookups
CREATE INDEX IF NOT EXISTS idx_users_student_number ON users(student_number);
CREATE INDEX IF NOT EXISTS idx_students_student_number ON students(student_number);

-- 5. Function to generate next EDTEC student number (atomic)
CREATE OR REPLACE FUNCTION generate_edtec_student_number(reference_date DATE DEFAULT CURRENT_DATE)
RETURNS VARCHAR(20) AS $$
DECLARE
  v_year INT;
  v_month INT;
  v_month_letter CHAR(1);
  v_next_seq INT;
  v_result VARCHAR(20);
BEGIN
  v_year := EXTRACT(YEAR FROM reference_date)::INT;
  v_month := EXTRACT(MONTH FROM reference_date)::INT;
  -- A=Jan(1), B=Feb(2), ..., L=Dec(12)
  v_month_letter := CHR(64 + v_month);

  -- Atomic upsert: get next sequence for this year+month
  INSERT INTO student_number_sequences (year, month, last_sequence)
  VALUES (v_year, v_month, 1)
  ON CONFLICT (year, month) DO UPDATE
  SET last_sequence = student_number_sequences.last_sequence + 1
  RETURNING last_sequence INTO v_next_seq;

  v_result := 'EDTEC-' ||
    LPAD((v_year % 100)::TEXT, 2, '0') ||
    v_month_letter ||
    LPAD(v_next_seq::TEXT, 4, '0');

  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

COMMENT ON COLUMN users.student_number IS 'EDTEC student ID format: EDTEC-YYXNNNN (year + month letter + sequence)';
COMMENT ON COLUMN students.student_number IS 'EDTEC student ID format: EDTEC-YYXNNNN (year + month letter + sequence)';
