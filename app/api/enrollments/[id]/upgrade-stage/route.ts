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

function extractStage(planKey: string | null | undefined): number | null {
  if (!planKey) return null;
  const m = planKey.match(/_(?:stage|part|partial)[_-]?(\d+)$/i);
  if (!m) return null;
  const n = parseInt(m[1] || '', 10);
  return Number.isFinite(n) ? n : null;
}

function rootPlanKey(planKey: string | null | undefined): string | null {
  if (!planKey) return null;
  return planKey.replace(/_(?:stage|part|partial)[_-]?\d+$/i, '');
}

/**
 * POST /api/enrollments/[id]/upgrade-stage
 * Create Stripe Checkout Session for next partial-payment stage.
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
    const enrollmentId = parseInt(id, 10);
    if (Number.isNaN(enrollmentId)) {
      return NextResponse.json(
        formatResponse(false, null, 'Invalid enrollment ID'),
        { status: 400, headers: corsHeaders }
      );
    }

    const body = await request.json().catch(() => ({}));
    const returnPath = body.return_path || '/student/current-units';
    const sessionIdToConfirm = typeof body.session_id === 'string' ? body.session_id : null;
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const { data: enrollment, error: enrollmentError } = await supabase
      .from('enrollments')
      .select('id, student_id, course_id, plan_id, courses(id, name)')
      .eq('id', enrollmentId)
      .eq('student_id', authResult.user.id)
      .single();

    if (enrollmentError || !enrollment) {
      return NextResponse.json(
        formatResponse(false, null, 'Enrollment not found'),
        { status: 404, headers: corsHeaders }
      );
    }

    const { data: partialRow } = await supabase
      .from('enrollment_partial_payments')
      .select('max_stage_paid, root_plan_key')
      .eq('enrollment_id', enrollmentId)
      .maybeSingle();

    // Confirmation mode (used on return from Stripe in dev/local or if webhook is delayed).
    if (sessionIdToConfirm) {
      const session = await stripe.checkout.sessions.retrieve(sessionIdToConfirm);
      if (session.payment_status !== 'paid') {
        return NextResponse.json(
          formatResponse(true, { confirmed: false, payment_status: session.payment_status }, 'Payment not completed yet'),
          { headers: corsHeaders }
        );
      }
      const metaPlanId = session.metadata?.plan_id ? parseInt(String(session.metadata.plan_id), 10) : null;
      const metaPlanKey = session.metadata?.plan_key ? String(session.metadata.plan_key) : null;
      let resolvedPlanId: number | null = metaPlanId != null && Number.isFinite(metaPlanId) ? metaPlanId : null;
      let resolvedPlanKey: string | null = metaPlanKey;
      if (resolvedPlanId == null && resolvedPlanKey) {
        const { data: planByKey } = await supabase
          .from('course_plans')
          .select('id, plan_key')
          .eq('course_id', (enrollment as { course_id: number }).course_id)
          .eq('plan_key', resolvedPlanKey)
          .maybeSingle();
        resolvedPlanId = planByKey?.id ?? null;
        resolvedPlanKey = planByKey?.plan_key ?? resolvedPlanKey;
      } else if (resolvedPlanId != null && !resolvedPlanKey) {
        const { data: planById } = await supabase
          .from('course_plans')
          .select('plan_key')
          .eq('id', resolvedPlanId)
          .maybeSingle();
        resolvedPlanKey = planById?.plan_key ?? null;
      }
      if (resolvedPlanId == null || !resolvedPlanKey) {
        return NextResponse.json(
          formatResponse(false, null, 'Unable to resolve purchased stage plan from checkout session'),
          { status: 400, headers: corsHeaders }
        );
      }
      const stageNum = extractStage(resolvedPlanKey) ?? 1;
      const maxTopicIdx = (() => {
        switch (resolvedPlanKey) {
          case 'guided_nclex_stage1':
            return 0;
          case 'guided_nclex_stage2':
            return 6;
          case 'guided_nclex_stage3':
            return 8;
          default:
            return null;
        }
      })();

      await supabase
        .from('enrollments')
        .update({
          plan_id: resolvedPlanId,
          payment_status: 'completed',
          payment_completed_at: new Date().toISOString(),
          status: 'active',
          updated_at: new Date().toISOString(),
        })
        .eq('id', enrollmentId);

      await supabase.rpc('upsert_enrollment_partial_payment', {
        p_enrollment_id: enrollmentId,
        p_stage_plan_id: resolvedPlanId,
        p_stage_number: stageNum,
        p_is_fully_paid: stageNum >= 3,
        p_max_topic_idx_unlocked: maxTopicIdx,
        p_notes: `Confirmed from checkout return ${sessionIdToConfirm}`,
        p_metadata: { source: 'upgrade-stage-confirm', stripe_session_id: sessionIdToConfirm },
      });

      return NextResponse.json(
        formatResponse(true, { confirmed: true, stage: stageNum, plan_id: resolvedPlanId, plan_key: resolvedPlanKey }, 'Stage upgraded successfully'),
        { headers: corsHeaders }
      );
    }

    const currentPlanId = (enrollment as { plan_id?: number | null }).plan_id ?? null;
    const { data: currentPlan } = currentPlanId != null
      ? await supabase
          .from('course_plans')
          .select('id, course_id, plan_key')
          .eq('id', currentPlanId)
          .maybeSingle()
      : { data: null as { id: number; course_id: number; plan_key: string } | null };

    const currentStage =
      partialRow?.max_stage_paid ??
      extractStage(currentPlan?.plan_key) ??
      1;
    if (currentStage >= 3) {
      return NextResponse.json(
        formatResponse(false, null, 'You already have full stage access'),
        { status: 400, headers: corsHeaders }
      );
    }

    const rootKey =
      partialRow?.root_plan_key ??
      rootPlanKey(currentPlan?.plan_key) ??
      currentPlan?.plan_key ??
      'guided_nclex';
    const nextStage = currentStage + 1;
    const candidates = [
      `${rootKey}_stage${nextStage}`,
      `${rootKey}_part${nextStage}`,
      `${rootKey}_partial${nextStage}`,
    ];
    const { data: nextPlan } = await supabase
      .from('course_plans')
      .select('id, plan_key, name, price')
      .eq('course_id', (enrollment as { course_id: number }).course_id)
      .in('plan_key', candidates)
      .order('sort_order', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!nextPlan) {
      return NextResponse.json(
        formatResponse(false, null, 'Next stage plan is not configured'),
        { status: 400, headers: corsHeaders }
      );
    }

    let userEmail = (authResult.user as { email?: string })?.email;
    if (!userEmail) {
      const { data: student } = await supabase
        .from('students')
        .select('email')
        .eq('id', authResult.user.id)
        .maybeSingle();
      userEmail = student?.email;
    }

    const amountInCents = Math.round((Number(nextPlan.price) || 0) * 100);
    const courseName = ((enrollment as { courses?: { name?: string } }).courses?.name) || 'NCLEX Program';
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      ...(userEmail ? { customer_email: userEmail } : {}),
      line_items: [
        {
          price_data: {
            currency: 'aud',
            product_data: {
              name: `${courseName} - ${nextPlan.name}`,
              description: `Stage upgrade (${nextPlan.plan_key})`,
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}${returnPath}?stage_upgrade_success=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}${returnPath}`,
      allow_promotion_codes: true,
      metadata: {
        type: 'enrollment',
        enrollment_id: String(enrollmentId),
        student_id: String((enrollment as { student_id: number }).student_id),
        course_id: String((enrollment as { course_id: number }).course_id),
        plan_id: String(nextPlan.id),
        plan_key: String(nextPlan.plan_key),
      },
    });

    return NextResponse.json(
      formatResponse(true, { url: session.url, session_id: session.id }, 'Stage upgrade checkout created'),
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Create stage upgrade checkout error:', error);
    return NextResponse.json(
      formatResponse(false, null, error.message || 'Failed to create stage upgrade checkout'),
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

