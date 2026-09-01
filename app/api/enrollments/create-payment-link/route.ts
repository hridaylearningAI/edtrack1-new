import { NextRequest, NextResponse } from 'next/server';
import {requireAuth, isAdminRole } from '@/lib/api/auth';
import { getSupabaseClient, formatResponse } from '@/lib/api/supabase';
import { corsHeaders } from '@/lib/api/utils';
import Stripe from 'stripe';

// Initialize Stripe
let stripe: Stripe | null = null;
if (process.env.STRIPE_SECRET_KEY) {
  try {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-11-20.acacia',
    });
  } catch (stripeError) {
    console.error('Error initializing Stripe:', stripeError);
  }
}

/**
 * POST /api/enrollments/create-payment-link
 * Create a Stripe payment link for enrollment
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json(
        formatResponse(false, null, 'Unauthorized'),
        { status: 401, headers: corsHeaders }
      );
    }

    // Only admins can create payment links for enrollments
    if (!isAdminRole(authResult.user.role)) {
      return NextResponse.json(
        formatResponse(false, null, 'Access denied. Admin only.'),
        { status: 403, headers: corsHeaders }
      );
    }

    const body = await request.json();
    const { enrollmentId, studentId, courseId, amount, studentEmail, studentName, courseName } = body;

    if (!enrollmentId || !studentId || !courseId || !amount || !studentEmail) {
      return NextResponse.json(
        formatResponse(false, null, 'Missing required fields: enrollmentId, studentId, courseId, amount, studentEmail'),
        { status: 400, headers: corsHeaders }
      );
    }

    if (!process.env.STRIPE_SECRET_KEY || !stripe) {
      return NextResponse.json(
        formatResponse(false, null, 'Stripe is not configured'),
        { status: 500, headers: corsHeaders }
      );
    }

    const supabase = getSupabaseClient();

    // Verify enrollment exists
    const { data: enrollment, error: enrollmentError } = await supabase
      .from('enrollments')
      .select('*')
      .eq('id', enrollmentId)
      .single();

    if (enrollmentError || !enrollment) {
      return NextResponse.json(
        formatResponse(false, null, 'Enrollment not found'),
        { status: 404, headers: corsHeaders }
      );
    }

    // Convert amount to cents
    const amountInCents = Math.round(amount * 100);

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: courseName || 'Course Enrollment',
              description: `Enrollment for ${studentName || 'Student'}`,
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/admin/enrolment?payment=success&enrollmentId=${enrollmentId}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/admin/enrolment?payment=cancelled&enrollmentId=${enrollmentId}`,
      customer_email: studentEmail,
      metadata: {
        enrollment_id: enrollmentId.toString(),
        student_id: studentId.toString(),
        course_id: courseId.toString(),
        type: 'enrollment',
      },
    });

    // Store payment session ID in enrollment
    await supabase
      .from('enrollments')
      .update({
        payment_session_id: session.id,
        payment_status: 'pending',
        updated_at: new Date().toISOString(),
      })
      .eq('id', enrollmentId);

    return NextResponse.json(
      formatResponse(true, {
        paymentUrl: session.url,
        sessionId: session.id,
        enrollmentId,
      }, 'Payment link created successfully'),
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Error creating payment link:', error);
    return NextResponse.json(
      formatResponse(false, null, error.message || 'Failed to create payment link'),
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}

