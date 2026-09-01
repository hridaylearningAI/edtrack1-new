# Certificate Generation System

## Overview

The certificate system automatically generates and sends certificates to students when they complete a course. Certificates are generated as PDFs and can be viewed, downloaded, and shared.

## Features

1. **Automatic Generation**: Certificates are automatically generated when a course is marked as completed
2. **Email Delivery**: Certificates are automatically emailed to students with a PDF attachment
3. **View & Download**: Students can view and download their certificates from the student dashboard
4. **Unique Certificate Numbers**: Each certificate has a unique identifier for verification

## Database Setup

Run the SQL migration to create the certificates table:

```sql
-- Run this file:
docs/database/create_certificates_table.sql
```

## How It Works

### 1. Course Completion Detection

When a course is synced from Moodle and marked as `completed`:
- The system checks if `with_certificate` is `true` for that enrollment
- If yes, it automatically generates a certificate

### 2. Certificate Generation

The certificate generation process:
1. Creates a unique certificate number (format: `CERT-YYYY-XXXXXX-XXXX`)
2. Generates a PDF certificate with:
   - Student name
   - Course name
   - Completion date
   - Certificate number
   - Grade (if available)
3. Saves certificate to database
4. Sends email with PDF attachment

### 3. Email Template

The email includes:
- Congratulations message
- Course details
- Certificate number
- Download link
- PDF attachment

### 4. Student Access

Students can:
- View all certificates at `/student/certificates`
- Download certificates as PDFs
- Access certificates from completed courses in "Current Units"

## API Endpoints

### Generate Certificate
```
POST /api/certificates/generate
Body: { enrollmentId: number }
```

### View Certificate
```
GET /api/certificates/view/[enrollmentId]
Returns: PDF file
```

### List Certificates
```
GET /api/certificates
Returns: Array of certificates for the authenticated user
```

## UI Components

### Certificates Page
- Location: `/student/certificates`
- Shows all certificates for the student
- Allows download and viewing

### Current Units Page
- Shows "View Certificate" button for completed courses with certificates
- Only visible when `status === 'completed'` and `with_certificate === true`

### Dashboard
- Added "My Certificates" quick action link

## Configuration

### Environment Variables

Ensure these are set:
- `RESEND_API_KEY`: For sending emails
- `FROM_EMAIL`: Email address to send from (default: `noreply@edtec.online`)

### Certificate Eligibility

Certificates are only generated for enrollments where:
- `status === 'completed'`
- `with_certificate === true`

## Certificate Design

The certificate PDF includes:
- Professional design with gradient background
- Student name (prominently displayed)
- Course name
- Completion date
- Unique certificate number
- Signature lines
- EdTec Online branding

## Future Enhancements

Potential improvements:
1. Upload certificates to cloud storage (S3/Cloudinary) instead of generating on-demand
2. Add certificate verification page (public URL to verify certificate numbers)
3. Add certificate templates customization
4. Add digital signatures
5. Add QR codes for verification

## Troubleshooting

### Certificates Not Generating

1. Check that `with_certificate` is set to `true` for the enrollment
2. Verify course is marked as `completed` in Moodle
3. Check server logs for errors
4. Ensure Resend API key is configured

### Email Not Sending

1. Verify `RESEND_API_KEY` is set
2. Check student email is valid
3. Check Resend dashboard for delivery status
4. Certificate is still saved even if email fails

### Certificate PDF Issues

1. Ensure `jspdf` package is installed
2. Check browser console for errors
3. Verify enrollment ID is correct

