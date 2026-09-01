-- Create certificates table to store generated certificates
CREATE TABLE IF NOT EXISTS certificates (
    id SERIAL PRIMARY KEY,
    enrollment_id INTEGER NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
    student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    certificate_number VARCHAR(100) UNIQUE NOT NULL, -- Unique certificate number
    certificate_url TEXT, -- URL to stored certificate (PDF/image)
    certificate_pdf_url TEXT, -- URL to PDF version
    issued_date DATE NOT NULL DEFAULT CURRENT_DATE,
    issued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    email_sent BOOLEAN DEFAULT FALSE,
    email_sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(enrollment_id) -- One certificate per enrollment
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_certificates_enrollment ON certificates(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_certificates_student ON certificates(student_id);
CREATE INDEX IF NOT EXISTS idx_certificates_course ON certificates(course_id);
CREATE INDEX IF NOT EXISTS idx_certificates_certificate_number ON certificates(certificate_number);
CREATE INDEX IF NOT EXISTS idx_certificates_issued_date ON certificates(issued_date DESC);

-- Note: RLS (Row Level Security) is not enabled by default.
-- Authentication and access control are handled at the application level via Clerk.
-- The API endpoints (/api/certificates/*) enforce proper access control.
-- 
-- If you want to enable RLS for additional security, you can uncomment the following:
-- 
-- ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;
-- 
-- CREATE POLICY "Allow all operations for service role"
--     ON certificates FOR ALL
--     USING (true)
--     WITH CHECK (true);

COMMENT ON TABLE certificates IS 'Stores generated certificates for completed courses';
COMMENT ON COLUMN certificates.certificate_number IS 'Unique certificate number (e.g., CERT-2024-001234)';
COMMENT ON COLUMN certificates.certificate_url IS 'URL to the certificate image/PDF file';
COMMENT ON COLUMN certificates.certificate_pdf_url IS 'URL to the PDF version of the certificate';
COMMENT ON COLUMN certificates.email_sent IS 'Whether the certificate email has been sent to the student';
