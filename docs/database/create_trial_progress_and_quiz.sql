-- Trial course progress: which sections (page IDs) the student has completed
CREATE TABLE IF NOT EXISTS course_trial_progress (
    id SERIAL PRIMARY KEY,
    enrollment_id INTEGER NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    section_id VARCHAR(255) NOT NULL, -- e.g. program-overview, topic-1-slides, topic-1-quiz, student-learning-note-0
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(enrollment_id, section_id)
);

CREATE INDEX IF NOT EXISTS idx_trial_progress_enrollment ON course_trial_progress(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_trial_progress_course ON course_trial_progress(course_id);

-- Quiz attempts: store each quiz attempt (score, pass/fail, optional answers)
CREATE TABLE IF NOT EXISTS course_quiz_attempts (
    id SERIAL PRIMARY KEY,
    enrollment_id INTEGER NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    quiz_identifier VARCHAR(255) NOT NULL, -- e.g. topic-1-quiz, topic-2-quiz
    score_percent INTEGER NOT NULL,
    passed BOOLEAN NOT NULL,
    total_questions INTEGER NOT NULL,
    correct_count INTEGER NOT NULL,
    answers_snapshot JSONB, -- optional: [{ questionNumber, selectedLetter, correctLetter }]
    attempted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_enrollment ON course_quiz_attempts(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_course ON course_quiz_attempts(course_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_student ON course_quiz_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_attempted_at ON course_quiz_attempts(attempted_at DESC);
