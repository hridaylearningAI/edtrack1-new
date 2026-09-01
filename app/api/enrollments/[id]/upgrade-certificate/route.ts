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
 * GET /api/enrollments/[id]/upgrade-certificate
 * Get certificate upgrade details for an enrollment
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth(request);
    if (!authResult.authenticated) {
      return NextResponse.json(
        formatAuthError(authResult.error || 'Unauthorized', authResult.error_code || 'UNAUTHORIZED'),
        { status: 401, headers: corsHeaders }
      );
    }

    const supabase = getSupabaseClient();
    const { id } = await params;
    const enrollmentId = parseInt(id);

    if (isNaN(enrollmentId)) {
      return NextResponse.json(
        formatResponse(false, null, 'Invalid enrollment ID'),
        { status: 400, headers: corsHeaders }
      );
    }

    const authenticatedUserId = authResult.user.id;

    const { data: enrollment, error: enrollmentError } = await supabase
      .from('enrollments')
      .select('*, courses(id, name, price_without_certificate, price_with_certificate, discount)')
      .eq('id', enrollmentId)
      .eq('student_id', authenticatedUserId)
      .single();

    if (enrollmentError || !enrollment) {
      return NextResponse.json(
        formatResponse(false, null, 'Enrollment not found'),
        { status: 404, headers: corsHeaders }
      );
    }

    if (enrollment.with_certificate === true || enrollment.with_certificate === 'true') {
      return NextResponse.json(
        formatResponse(false, null, 'Enrollment already includes certificate'),
        { status: 400, headers: corsHeaders }
      );
    }

    const course = enrollment.courses as any;
    if (!course) {
      return NextResponse.json(
        formatResponse(false, null, 'Course not found'),
        { status: 404, headers: corsHeaders }
      );
    }

    const priceWithoutCert = course.price_without_certificate ?? course.price ?? 0;
    const priceWithCert = course.price_with_certificate ?? course.price_without_certificate ?? course.price ?? 0;

    if (priceWithCert <= priceWithoutCert) {
      return NextResponse.json(
        formatResponse(false, null, 'Certificate upgrade not available for this course'),
        { status: 400, headers: corsHeaders }
      );
    }

    let upgradePrice = priceWithCert - priceWithoutCert;
    if (course.discount && course.discount > 0) {
      upgradePrice = upgradePrice * (1 - course.discount / 100);
    }

    return NextResponse.json(
      formatResponse(true, {
        enrollment_id: enrollment.id,
        course_id: course.id,
        course_name: course.name,
        upgrade_price: Math.round(upgradePrice * 100) / 100,
        original_upgrade_price: priceWithCert - priceWithoutCert,
        discount_applied: course.discount || 0,
      }, 'Certificate upgrade details retrieved'),
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Upgrade certificate details error:', error);
    return NextResponse.json(
      formatResponse(false, null, error.message || 'Failed to get upgrade details'),
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * POST /api/enrollments/[id]/upgrade-certificate
 * Create a Stripe Checkout Session for certificate upgrade (redirects to Stripe)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const supabase = getSupabaseClient();
    const { id } = await params;
    const enrollmentId = parseInt(id);

    if (isNaN(enrollmentId)) {
      return NextResponse.json(
        formatResponse(false, null, 'Invalid enrollment ID'),
        { status: 400, headers: corsHeaders }
      );
    }

    const body = await request.json().catch(() => ({}));
    const returnPath = body.return_path || '/student/current-units';
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const { data: enrollment, error: enrollmentError } = await supabase
      .from('enrollments')
      .select('*, courses(id, name, price_without_certificate, price_with_certificate, discount)')
      .eq('id', enrollmentId)
      .eq('student_id', authResult.user.id)
      .single();

    if (enrollmentError || !enrollment) {
      return NextResponse.json(
        formatResponse(false, null, 'Enrollment not found'),
        { status: 404, headers: corsHeaders }
      );
    }

    if (enrollment.with_certificate === true || enrollment.with_certificate === 'true') {
      return NextResponse.json(
        formatResponse(false, null, 'Enrollment already includes certificate'),
        { status: 400, headers: corsHeaders }
      );
    }

    const course = enrollment.courses as any;
    if (!course) {
      return NextResponse.json(
        formatResponse(false, null, 'Course not found'),
        { status: 404, headers: corsHeaders }
      );
    }

    const priceWithoutCert = course.price_without_certificate ?? course.price ?? 0;
    const priceWithCert = course.price_with_certificate ?? course.price_without_certificate ?? course.price ?? 0;

    if (priceWithCert <= priceWithoutCert) {
      return NextResponse.json(
        formatResponse(false, null, 'Certificate upgrade not available for this course'),
        { status: 400, headers: corsHeaders }
      );
    }

    let upgradePrice = priceWithCert - priceWithoutCert;
    if (course.discount && course.discount > 0) {
      upgradePrice = upgradePrice * (1 - course.discount / 100);
    }
    const amountInCents = Math.round(upgradePrice * 100);

    let userEmail = (authResult.user as { email?: string })?.email;
    if (!userEmail) {
      const { data: student } = await supabase
        .from('students')
        .select('email')
        .eq('id', authResult.user.id)
        .maybeSingle();
      userEmail = student?.email;
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      ...(userEmail && { customer_email: userEmail }),
      line_items: [
        {
          price_data: {
            currency: 'aud',
            product_data: {
              name: `Certificate Upgrade: ${course.name}`,
              description: `Add a verified certificate to your enrollment for ${course.name}`,
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}${returnPath}?upgrade_success=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}${returnPath}`,
      allow_promotion_codes: true,
      metadata: {
        type: 'certificate_upgrade',
        enrollment_id: enrollmentId.toString(),
        course_id: course.id.toString(),
        user_id: authResult.user.id.toString(),
      },
    });

    return NextResponse.json(
      formatResponse(true, { url: session.url, session_id: session.id }, 'Checkout session created'),
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Create upgrade checkout error:', error);
    return NextResponse.json(
      formatResponse(false, null, error.message || 'Failed to create checkout session'),
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}
