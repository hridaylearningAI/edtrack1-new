import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient, formatResponse, formatAuthError } from '@/lib/api/supabase';
import { requireAuth } from '@/lib/api/auth';
import { corsHeaders } from '@/lib/api/utils';
import Stripe from 'stripe';

let stripe: Stripe | null = null;
if (process.env.STRIPE_SECRET_KEY) {
  try {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-11-20.acacia',
    });
  } catch (e) {
    console.error('Error initializing Stripe:', e);
  }
}

/**
 * POST /api/payments/fulfill-certificate-upgrade
 * Fulfill certificate upgrade after Stripe Checkout success
 * Called when user returns from Stripe with session_id
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

    if (!stripe || !process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        formatResponse(false, null, 'Stripe is not configured'),
        { status: 500, headers: corsHeaders }
      );
    }

    const body = await request.json();
    const { session_id } = body;

    if (!session_id) {
      return NextResponse.json(
        formatResponse(false, null, 'session_id is required'),
        { status: 400, headers: corsHeaders }
      );
    }

    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (session.metadata?.type !== 'certificate_upgrade' || !session.metadata?.enrollment_id) {
      return NextResponse.json(
        formatResponse(false, null, 'Invalid checkout session'),
        { status: 400, headers: corsHeaders }
      );
    }

    if (session.payment_status !== 'paid') {
      return NextResponse.json(
        formatResponse(false, null, 'Payment not completed'),
        { status: 400, headers: corsHeaders }
      );
    }

    const enrollmentId = parseInt(session.metadata.enrollment_id);
    const userId = authResult.user.id;

    const supabase = getSupabaseClient();

    const { data: enrollment, error: fetchError } = await supabase
      .from('enrollments')
      .select('id, with_certificate, notes')
      .eq('id', enrollmentId)
      .eq('student_id', userId)
      .single();

    if (fetchError || !enrollment) {
      return NextResponse.json(
        formatResponse(false, null, 'Enrollment not found'),
        { status: 404, headers: corsHeaders }
      );
    }

    if (enrollment.with_certificate === true || enrollment.with_certificate === 'true') {
      return NextResponse.json(
        formatResponse(true, { enrollment_id: enrollmentId, already_upgraded: true }, 'Certificate already included'),
        { headers: corsHeaders }
      );
    }

    const existingNotes = (enrollment as { notes?: string }).notes || '';
    const newNotes = `${existingNotes}\nCertificate upgraded via Stripe Checkout - Session: ${session_id}`.trim();

    const { error: updateError } = await supabase
      .from('enrollments')
      .update({
        with_certificate: true,
        updated_at: new Date().toISOString(),
        notes: newNotes,
      })
      .eq('id', enrollmentId)
      .eq('student_id', userId);

    if (updateError) {
      console.error('Error fulfilling certificate upgrade:', updateError);
      return NextResponse.json(
        formatResponse(false, null, 'Failed to upgrade certificate'),
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      formatResponse(true, { enrollment_id: enrollmentId, certificate_upgraded: true }, 'Certificate upgrade completed'),
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Fulfill certificate upgrade error:', error);
    return NextResponse.json(
      formatResponse(false, null, error.message || 'Failed to fulfill upgrade'),
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}
