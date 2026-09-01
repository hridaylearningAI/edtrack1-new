-- Course forums: general (course-wide) and personal (per-enrollment journal).
-- One general forum per course; one personal forum per enrollment.

CREATE TABLE IF NOT EXISTS course_forums (
    id SERIAL PRIMARY KEY,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('general', 'personal')),
    enrollment_id INTEGER REFERENCES enrollments(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(course_id, type, enrollment_id)
);

CREATE INDEX IF NOT EXISTS idx_course_forums_course ON course_forums(course_id);
CREATE INDEX IF NOT EXISTS idx_course_forums_enrollment ON course_forums(enrollment_id);
COMMENT ON TABLE course_forums IS 'general: one per course (enrollment_id NULL). personal: one per enrollment.';

-- Threads: discussion topics (general) or journal entries (personal).
CREATE TABLE IF NOT EXISTS course_forum_threads (
    id SERIAL PRIMARY KEY,
    forum_id INTEGER NOT NULL REFERENCES course_forums(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_forum_threads_forum ON course_forum_threads(forum_id);
CREATE INDEX IF NOT EXISTS idx_forum_threads_created ON course_forum_threads(created_at DESC);

-- Posts: first post = thread body; further posts = replies (general) or follow-ups (personal).
CREATE TABLE IF NOT EXISTS course_forum_posts (
    id SERIAL PRIMARY KEY,
    thread_id INTEGER NOT NULL REFERENCES course_forum_threads(id) ON DELETE CASCADE,
    author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_forum_posts_thread ON course_forum_posts(thread_id);
CREATE INDEX IF NOT EXISTS idx_forum_posts_created ON course_forum_posts(created_at ASC);
