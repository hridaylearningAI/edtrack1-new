# Enrollment Wizard Testing Guide

## Prerequisites

Before testing, ensure you have:

1. ✅ **Database Migration Applied**
   - Run `docs/database/add_enrollment_payment_columns.sql`
   - Verify columns exist: `payment_status`, `payment_session_id`, `payment_completed_at`

2. ✅ **Environment Variables Set**
   ```env
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_... (optional for local testing)
   RESEND_API_KEY=re_...
   FROM_EMAIL=noreply@edtec.online
   NEXT_PUBLIC_APP_URL=http://localhost:3000 (or your domain)
   ```

3. ✅ **At Least One Course Created**
   - Go to Admin → Courses
   - Create a test course with a price

4. ✅ **Admin Account Logged In**
   - Must be logged in as admin to access enrollment wizard

## Testing Steps

### Step 1: Access Enrollment Wizard

1. Navigate to: `/admin/enrolment`
2. You should see the enrollment wizard with 5 steps

### Step 2: Student Information

1. Fill in all required fields:
   - First Name: `John`
   - Last Name: `Doe`
   - Email: `john.doe@example.com` (use a real email if testing email sending)
   - Phone: `+1234567890`
   - Date of Birth: Select a date
   - Address fields: Fill in complete address
   - Country: Select from dropdown

2. Click **"Continue to Course Selection"**

### Step 3: Course Selection

1. Select a course from the list
2. Choose a start date (must be today or future)
3. Select a schedule from dropdown
4. Click **"Continue to Payment Details"**

### Step 4: Payment Details (Key Step)

**Option A: Test with Stripe Payment Link**

1. Click **"Create Enrollment & Payment Link"**
   - This creates the enrollment in database
   - Creates a Stripe Checkout Session
   - Generates a payment URL

2. You should see:
   - Payment link created message
   - Payment URL displayed
   - Payment status: "PENDING"

3. Click **"Send Payment Link to Student"**
   - Email will be sent to the student's email address
   - Check the email inbox

4. To test payment:
   - Click the payment URL or open it in a new tab
   - Use Stripe test card: `4242 4242 4242 4242`
   - Use any future expiry date (e.g., `12/34`)
   - Use any 3-digit CVC (e.g., `123`)
   - Complete the payment

5. After payment:
   - Payment status should update to "COMPLETED"
   - Enrollment status changes to "active"
   - Moodle sync should occur (if configured)

**Option B: Skip Payment (Testing Only)**

1. Scroll to bottom
2. Click **"Skip Payment & Continue"**
   - This bypasses payment for testing
   - Sets payment status to "completed"
   - Allows you to proceed without actual payment

3. Click **"Continue to Document Upload"**

### Step 5: Document Upload

1. Click **"Choose Files"** or drag & drop files
   - Supported: PDF, DOC, DOCX, JPG, JPEG, PNG
   - Max size: 10MB per file

2. Select one or more files

3. Click **"Upload All"**
   - Files will be uploaded to server
   - You'll see upload progress
   - Files marked with green checkmark when uploaded

4. Click **"Continue to Review & Confirm"**

### Step 6: Review & Confirm

1. Review all information:
   - Student details
   - Course information
   - Payment status
   - Uploaded documents

2. Check both checkboxes:
   - ✅ Terms and Conditions
   - ✅ Privacy Policy

3. Click **"Complete Enrollment"** or **"Confirm Enrollment Setup"**

4. You should see:
   - Success message
   - Redirect to enrollment list page

## What to Check After Enrollment

### In Database

```sql
-- Check enrollment was created
SELECT id, student_id, course_id, status, payment_status, payment_session_id
FROM enrollments
ORDER BY created_at DESC
LIMIT 1;

-- Check student was created
SELECT id, name, email, status
FROM users
WHERE email = 'john.doe@example.com';
```

### In Admin Panel

1. Go to **Admin → Students**
   - Verify student appears in list

2. Go to **Admin → Enrollments**
   - Verify enrollment appears
   - Check payment status
   - Check enrollment status

3. Go to **Admin → Documents**
   - Verify uploaded documents appear
   - Check they're linked to the student

### If Payment Was Completed

1. Check enrollment status is "active"
2. Check payment_status is "completed"
3. Check Moodle sync (if Moodle is configured):
   - `moodle_synced` should be `true`
   - `moodle_user_id` and `moodle_course_id` should be set

## Troubleshooting

### Issue: "Failed to create enrollment"
- **Check**: Student email must be unique
- **Check**: Course must exist
- **Check**: Admin must be logged in

### Issue: "Stripe secret key not configured"
- **Check**: `STRIPE_SECRET_KEY` in `.env.local`
- **Check**: Restart dev server after adding env var

### Issue: "Failed to send email"
- **Check**: `RESEND_API_KEY` in `.env.local`
- **Check**: Email domain is verified in Resend
- **Check**: `FROM_EMAIL` matches verified domain

### Issue: Payment link not working
- **Check**: `NEXT_PUBLIC_APP_URL` is set correctly
- **Check**: Stripe is in test mode (for test keys)
- **Check**: Payment session was created successfully

### Issue: Payment completed but enrollment not activated
- **Check**: Stripe webhook is configured
- **Check**: Webhook endpoint is accessible
- **Check**: Webhook secret is correct
- **Note**: For local testing, use Stripe CLI to forward webhooks

### Issue: Documents not uploading
- **Check**: File size is under 10MB
- **Check**: File type is supported
- **Check**: Student ID exists (enrollment must be created first)

## Testing Payment Webhook Locally

If testing webhooks locally:

1. Install Stripe CLI:
   ```bash
   brew install stripe/stripe-cli/stripe
   ```

2. Login to Stripe:
   ```bash
   stripe login
   ```

3. Forward webhooks to local server:
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```

4. Copy the webhook signing secret and add to `.env.local`:
   ```env
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

5. Trigger test events:
   ```bash
   stripe trigger checkout.session.completed
   ```

## Expected Behavior

✅ **Successful Flow:**
1. Enrollment created with "pending" status
2. Payment link generated
3. Email sent to student
4. Student completes payment
5. Webhook updates enrollment to "completed"
6. Enrollment status changes to "active"
7. Moodle sync occurs (if configured)
8. Enrollment appears in admin panel

✅ **Bypass Flow:**
1. Enrollment created
2. Payment bypassed
3. Documents uploaded
4. Enrollment confirmed
5. Enrollment appears in admin panel (may need manual Moodle sync)

## Next Steps After Testing

1. Verify all data is correct in database
2. Test with real Stripe account (production keys)
3. Configure production webhook endpoint
4. Test email delivery
5. Verify Moodle integration works
6. Test with multiple enrollments

