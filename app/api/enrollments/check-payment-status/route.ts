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
 * POST /api/enrollments/check-payment-status
 * Check Stripe session status and update enrollment if payment is completed
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

    // Only admins can check payment status
    if (!isAdminRole(authResult.user.role)) {
      return NextResponse.json(
        formatResponse(false, null, 'Access denied. Admin only.'),
        { status: 403, headers: corsHeaders }
      );
    }

    const body = await request.json();
    const { enrollmentId, paymentSessionId } = body;

    if (!enrollmentId) {
      return NextResponse.json(
        formatResponse(false, null, 'Enrollment ID is required'),
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

    // Get enrollment to find payment_session_id if not provided
    const { data: enrollment, error: enrollmentError } = await supabase
      .from('enrollments')
      .select('payment_session_id, payment_status')
      .eq('id', enrollmentId)
      .single();

    if (enrollmentError || !enrollment) {
      return NextResponse.json(
        formatResponse(false, null, 'Enrollment not found'),
        { status: 404, headers: corsHeaders }
      );
    }

    const sessionId = paymentSessionId || enrollment.payment_session_id;

    if (!sessionId) {
      return NextResponse.json(
        formatResponse(false, null, 'Payment session ID not found'),
        { status: 400, headers: corsHeaders }
      );
    }

    // Check Stripe session status
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId);

      // If payment is completed, update enrollment
      if (session.payment_status === 'paid' && enrollment.payment_status !== 'completed') {
        const { error: updateError } = await supabase
          .from('enrollments')
          .update({
            payment_status: 'completed',
            payment_completed_at: new Date().toISOString(),
            status: 'active',
            updated_at: new Date().toISOString(),
          })
          .eq('id', enrollmentId);

        if (updateError) {
          console.error('Error updating enrollment:', updateError);
          return NextResponse.json(
            formatResponse(false, null, 'Failed to update enrollment status'),
            { status: 500, headers: corsHeaders }
          );
        }

        // Fetch updated enrollment
        const { data: updatedEnrollment } = await supabase
          .from('enrollments')
          .select('*')
          .eq('id', enrollmentId)
          .single();

        return NextResponse.json(
          formatResponse(true, {
            paymentStatus: 'completed',
            enrollment: updatedEnrollment,
          }, 'Payment completed and enrollment updated'),
          { headers: corsHeaders }
        );
      }

      // Return current status
      return NextResponse.json(
        formatResponse(true, {
          paymentStatus: session.payment_status === 'paid' ? 'completed' : 'pending',
          stripeStatus: session.payment_status,
          enrollment: enrollment,
        }, 'Payment status checked'),
        { headers: corsHeaders }
      );
    } catch (stripeError: any) {
      console.error('Error retrieving Stripe session:', stripeError);
      return NextResponse.json(
        formatResponse(false, null, `Stripe error: ${stripeError.message}`),
        { status: 500, headers: corsHeaders }
      );
    }
  } catch (error: any) {
    console.error('Error checking payment status:', error);
    return NextResponse.json(
      formatResponse(false, null, error.message || 'Failed to check payment status'),
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

