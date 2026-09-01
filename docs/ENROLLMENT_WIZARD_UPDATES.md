# Enrollment Wizard Updates

## Overview

The enrollment wizard has been updated to support a complete enrollment flow with Stripe payment integration, document upload, and automatic Moodle synchronization.

## Changes Made

### 1. API Endpoints Created

#### `/api/enrollments/create-payment-link`
- Creates a Stripe Checkout Session for enrollment payment
- Stores payment session ID in enrollment record
- Sets payment status to 'pending'

#### `/api/enrollments/send-payment-email`
- Sends email to student with payment link
- Uses Resend email service
- Includes course details and payment amount

#### `/api/stripe/webhook`
- Handles Stripe webhook events
- Updates enrollment payment status on payment completion
- Automatically syncs enrollment to Moodle after successful payment
- Activates enrollment when payment is completed

### 2. Component Updates

#### Payment Step (`payment-step.tsx`)
- Creates enrollment record when payment link is requested
- Generates Stripe payment link
- Sends payment email to student
- Shows payment status (pending/completed/failed)
- Allows checking payment status manually
- Supports payment bypass for testing

#### Document Upload Step (`document-upload-step.tsx`)
- Actually uploads documents to server using API
- Shows upload progress and status
- Validates file types and sizes
- Marks documents as uploaded

#### Review Step (`review-step.tsx`)
- Shows payment status
- Syncs to Moodle if payment is completed
- Finalizes enrollment process
- Handles both pending and completed payment states

### 3. Enrollment Data Interface

Added new fields to `EnrollmentData`:
- `paymentStatus`: 'pending' | 'completed' | 'failed'
- `paymentSessionId`: Stripe session ID
- `paymentUrl`: Stripe payment link
- `uploadedDocumentIds`: Array of uploaded document IDs
- `enrollmentId`: Created enrollment ID
- `studentId`: Created student ID

## Enrollment Flow

1. **Student Information** → Admin enters student details
2. **Course Selection** → Admin selects course and schedule
3. **Payment** → 
   - Creates enrollment (status: 'pending')
   - Creates Stripe payment link
   - Sends payment email to student
   - Shows payment status
4. **Document Upload** → Admin uploads required documents
5. **Review & Confirm** → 
   - Finalizes enrollment
   - Syncs to Moodle (if payment completed)
   - Completes enrollment process

## Payment Flow

1. Admin clicks "Create Enrollment & Payment Link"
2. System creates enrollment with 'pending' status
3. System creates Stripe Checkout Session
4. Admin can send payment link to student via email
5. Student receives email and clicks payment link
6. Student completes payment on Stripe
7. Stripe webhook notifies system
8. System updates enrollment:
   - Sets payment_status to 'completed'
   - Sets enrollment status to 'active'
   - Syncs to Moodle
   - Enrollment is now active

## Database Schema Requirements

The `enrollments` table needs the following columns (if not already present).

**Migration File:** `docs/database/add_enrollment_payment_columns.sql`

Run the migration:
```bash
psql -U your_username -d your_database -f docs/database/add_enrollment_payment_columns.sql
```

Or execute the SQL directly:
```sql
-- Add payment_status column
ALTER TABLE enrollments 
ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT NULL;

-- Add payment_session_id column
ALTER TABLE enrollments 
ADD COLUMN IF NOT EXISTS payment_session_id VARCHAR(255) DEFAULT NULL;

-- Add payment_completed_at column
ALTER TABLE enrollments 
ADD COLUMN IF NOT EXISTS payment_completed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_enrollments_payment_status 
ON enrollments(payment_status);

CREATE INDEX IF NOT EXISTS idx_enrollments_payment_session_id 
ON enrollments(payment_session_id);
```

## Environment Variables Required

```env
# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email (Resend)
RESEND_API_KEY=re_...
FROM_EMAIL=noreply@edtec.online

# App URL (for webhook callbacks)
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

## Stripe Webhook Setup

1. Go to Stripe Dashboard → Webhooks
2. Add endpoint: `https://your-domain.com/api/stripe/webhook`
3. Select events:
   - `checkout.session.completed`
   - `checkout.session.async_payment_succeeded`
   - `checkout.session.async_payment_failed`
4. Copy webhook signing secret to `STRIPE_WEBHOOK_SECRET`

## Testing

### Test Payment Flow
1. Complete enrollment wizard steps
2. Create payment link
3. Use Stripe test card: `4242 4242 4242 4242`
4. Complete payment
5. Verify enrollment status updates
6. Verify Moodle sync occurs

### Test Payment Bypass
1. Complete enrollment wizard steps
2. Click "Skip Payment & Continue" in payment step
3. Verify enrollment is created with bypass status
4. Complete remaining steps

## Features

✅ Document upload to server
✅ Stripe payment integration
✅ Email notifications with payment links
✅ Payment status tracking
✅ Automatic Moodle sync after payment
✅ Payment status polling
✅ Webhook handling for payment events
✅ Enrollment activation on payment completion

## Notes

- Enrollment is created in "pending" status until payment is completed
- Moodle sync only occurs after successful payment
- Documents are uploaded immediately when selected
- Payment link is valid for 24 hours (Stripe default)
- Admin can manually check payment status
- Payment can be bypassed for testing purposes

