import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient, formatResponse, formatAuthError } from '@/lib/api/supabase';
import { requireAuth } from '@/lib/api/auth';
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
 * POST /api/payments/confirm
 * Confirm payment and create purchase records
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (!authResult.authenticated) {
      return NextResponse.json(
        formatAuthError(authResult.error || 'Unauthorized', authResult.error_code || 'UNAUTHORIZED'),
        { status: 401, headers: corsHeaders }
      );
    }

    const body = await request.json();
    const { payment_intent_id, amount, currency, status, enrollment_id } = body;

    if (!payment_intent_id || !status) {
      return NextResponse.json(
        formatResponse(false, null, 'Payment intent ID and status are required'),
        { status: 400, headers: corsHeaders }
      );
    }

    if (!process.env.STRIPE_SECRET_KEY || !stripe) {
      return NextResponse.json(
        formatResponse(false, null, 'Stripe is not configured'),
        { status: 500, headers: corsHeaders }
      );
    }

    // Verify payment intent with Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id);

    if (paymentIntent.status !== 'succeeded') {
      return NextResponse.json(
        formatResponse(false, null, 'Payment not completed'),
        { status: 400, headers: corsHeaders }
      );
    }

    const supabase = getSupabaseClient();
    const userId = authResult.user.id;

    // Handle certificate upgrade payment
    const enrollmentId = enrollment_id ?? paymentIntent.metadata?.enrollment_id;
    if (enrollmentId) {
      const { data: enrollment, error: enrollmentError } = await supabase
        .from('enrollments')
        .select('*, courses(id, name)')
        .eq('id', parseInt(String(enrollmentId)))
        .eq('student_id', userId)
        .single();

      if (!enrollmentError && enrollment) {
        if (enrollment.with_certificate === true || enrollment.with_certificate === 'true') {
          return NextResponse.json(
            formatResponse(
              true,
              {
                payment_intent_id,
                enrollment_id: enrollment.id,
                course_id: enrollment.course_id,
                certificate_upgraded: true,
                already_had_certificate: true,
              },
              'Certificate already included in enrollment'
            ),
            { headers: corsHeaders }
          );
        }

        const { error: updateError } = await supabase
          .from('enrollments')
          .update({
            with_certificate: true,
            updated_at: new Date().toISOString(),
            notes: `${enrollment.notes || ''}\nCertificate upgraded via payment - Payment Intent: ${payment_intent_id}`.trim(),
          })
          .eq('id', enrollment.id)
          .eq('with_certificate', false);

        if (updateError) {
          const { data: currentEnrollment } = await supabase
            .from('enrollments')
            .select('with_certificate')
            .eq('id', enrollment.id)
            .single();

          if (currentEnrollment?.with_certificate === true) {
            return NextResponse.json(
              formatResponse(
                true,
                {
                  payment_intent_id,
                  enrollment_id: enrollment.id,
                  course_id: enrollment.course_id,
                  certificate_upgraded: true,
                  already_had_certificate: true,
                },
                'Certificate already included in enrollment'
              ),
              { headers: corsHeaders }
            );
          }
          console.error('Error updating enrollment for certificate upgrade:', updateError);
          return NextResponse.json(
            formatResponse(false, null, 'Failed to upgrade certificate'),
            { status: 500, headers: corsHeaders }
          );
        }

        const course = enrollment.courses as any;
        const amountValue = amount ?? paymentIntent.amount;
        const amountDecimal = typeof amountValue === 'number' ? amountValue / 100 : parseFloat(amountValue) / 100;

        const { data: purchase, error: purchaseError } = await supabase
          .from('purchases')
          .insert({
            user_id: userId,
            total_amount: amountDecimal,
            payment_method: 'stripe',
            payment_status: 'completed',
            payment_intent_id,
            transaction_id: payment_intent_id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select('id')
          .single();

        if (!purchaseError && purchase) {
          await supabase.from('purchase_items').insert({
            purchase_id: purchase.id,
            course_id: enrollment.course_id,
            course_name: course?.name || 'Unknown Course',
            quantity: 1,
            unit_price: amountDecimal,
            total_price: amountDecimal,
            with_certificate: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        }

        return NextResponse.json(
          formatResponse(
            true,
            {
              payment_intent_id,
              enrollment_id: enrollment.id,
              course_id: enrollment.course_id,
              certificate_upgraded: true,
            },
            'Certificate upgrade completed successfully'
          ),
          { headers: corsHeaders }
        );
      }
    }

    // Default: Create generic purchase record
    const { data: purchase, error: purchaseError } = await supabase
      .from('purchases')
      .insert({
        user_id: userId,
        payment_intent_id,
        amount: amount || paymentIntent.amount,
        currency: currency || paymentIntent.currency,
        status: 'completed',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (purchaseError || !purchase) {
      console.error('Error creating purchase:', purchaseError);
      return NextResponse.json(
        formatResponse(false, null, 'Failed to create purchase record'),
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      formatResponse(
        true,
        {
          purchase,
          payment_intent_id,
        },
        'Payment confirmed successfully'
      ),
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Confirm payment error:', error);
    return NextResponse.json(
      formatResponse(false, null, error.message || 'Failed to confirm payment'),
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

