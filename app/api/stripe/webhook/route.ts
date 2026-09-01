import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/api/supabase';
import Stripe from 'stripe';
import { corsHeaders } from '@/lib/api/utils';

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

function extractStageNumberFromPlanKey(planKey: string | null | undefined): number | null {
  if (!planKey) return null;
  const m = planKey.match(/_(?:stage|part|partial)[_-]?(\d+)$/i);
  if (!m) return null;
  const n = parseInt(m[1] || "", 10);
  return Number.isFinite(n) ? n : null;
}

function getNclexMaxTopicIdxForStagePlan(planKey: string | null | undefined): number | null {
  if (!planKey) return null;
  switch (planKey) {
    case "guided_nclex_stage1":
      return 0;
    case "guided_nclex_stage2":
      return 6;
    case "guided_nclex_stage3":
      return 8;
    default:
      return null;
  }
}

/**
 * POST /api/stripe/webhook
 * Handle Stripe webhook events
 */
export async function POST(request: NextRequest) {
  if (!stripe) {
    return NextResponse.json(
      { error: 'Stripe not configured' },
      { status: 500, headers: corsHeaders }
    );
  }

  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'No signature provided' },
      { status: 400, headers: corsHeaders }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET || ''
    );
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json(
      { error: `Webhook Error: ${err.message}` },
      { status: 400, headers: corsHeaders }
    );
  }

  const supabase = getSupabaseClient();

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;

      // Check if this is an enrollment payment (either by metadata type or by checking payment_session_id)
      let enrollmentId: number | null = null;

      if (session.metadata?.type === 'enrollment' && session.metadata?.enrollment_id) {
        enrollmentId = parseInt(session.metadata.enrollment_id);
      } else {
        // Fallback: find enrollment by payment_session_id
        const { data: enrollment } = await supabase
          .from('enrollments')
          .select('id')
          .eq('payment_session_id', session.id)
          .single();
        
        if (enrollment) {
          enrollmentId = enrollment.id;
        }
      }

      if (enrollmentId) {
        // If the checkout session includes plan metadata, persist it to enrollment.
        // This enables partial-payment stage unlock logic (via `course_plans.plan_key`).
        const planIdMeta = session.metadata?.plan_id ? parseInt(session.metadata.plan_id, 10) : null;
        const planKeyMeta = session.metadata?.plan_key ? String(session.metadata.plan_key) : null;
        const courseIdMeta = session.metadata?.course_id ? parseInt(String(session.metadata.course_id), 10) : null;

        if ((planIdMeta != null && Number.isFinite(planIdMeta)) || planKeyMeta) {
          try {
            let resolvedPlanId: number | null = null;
            let resolvedPlanKey: string | null = null;
            if (planIdMeta != null && Number.isFinite(planIdMeta)) {
              resolvedPlanId = planIdMeta;
            } else if (planKeyMeta && courseIdMeta != null && Number.isFinite(courseIdMeta)) {
              const { data: planRow } = await supabase
                .from('course_plans')
                .select('id, plan_key')
                .eq('course_id', courseIdMeta)
                .eq('plan_key', planKeyMeta)
                .maybeSingle();
              resolvedPlanId = planRow?.id ?? null;
              resolvedPlanKey = planRow?.plan_key ?? null;
            }

            if (resolvedPlanId != null) {
              await supabase
                .from('enrollments')
                .update({ plan_id: resolvedPlanId, updated_at: new Date().toISOString() })
                .eq('id', enrollmentId);

              if (!resolvedPlanKey) {
                const { data: planFromId } = await supabase
                  .from('course_plans')
                  .select('plan_key')
                  .eq('id', resolvedPlanId)
                  .maybeSingle();
                resolvedPlanKey = planFromId?.plan_key ?? null;
              }
            }

            const stageNumber = extractStageNumberFromPlanKey(resolvedPlanKey ?? planKeyMeta ?? null);
            if (resolvedPlanId != null && stageNumber != null) {
              await supabase.rpc('upsert_enrollment_partial_payment', {
                p_enrollment_id: enrollmentId,
                p_stage_plan_id: resolvedPlanId,
                p_stage_number: stageNumber,
                p_is_fully_paid: stageNumber >= 3,
                p_max_topic_idx_unlocked: getNclexMaxTopicIdxForStagePlan(resolvedPlanKey ?? planKeyMeta ?? null),
                p_notes: `Stripe webhook payment ${session.id}`,
                p_metadata: {
                  source: 'stripe_webhook_checkout_completed',
                  stripe_session_id: session.id,
                },
              });
            }
          } catch (planErr) {
            console.error('Stripe webhook: failed to persist plan_id', planErr);
          }
        }

        // Handle certificate upgrade - update with_certificate instead of payment status
        if (session.metadata?.type === 'certificate_upgrade') {
          const { error: certUpdateError } = await supabase
            .from('enrollments')
            .update({
              with_certificate: true,
              updated_at: new Date().toISOString(),
            })
            .eq('id', enrollmentId);

          if (certUpdateError) {
            console.error('Error updating certificate upgrade:', certUpdateError);
          }
          break;
        }

        // Update enrollment payment status (for regular enrollment payments)
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
        } else {
        }

        // Send welcome email with credentials
        try {
          if (session.metadata?.student_id && session.metadata?.course_id) {
            // Get student and course details
            const { data: student } = await supabase
              .from('users')
              .select('email, name')
              .eq('id', parseInt(session.metadata.student_id))
              .single();

            const { data: course } = await supabase
              .from('courses')
              .select('name')
              .eq('id', parseInt(session.metadata.course_id))
              .single();

            if (student && course) {
              const welcomeEmailResponse = await fetch(
                `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/enrollments/send-welcome-email`,
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    enrollmentId,
                    studentId: parseInt(session.metadata.student_id),
                    courseId: parseInt(session.metadata.course_id),
                    studentEmail: student.email || session.customer_email,
                    studentName: student.name || 'Student',
                    courseName: course.name || 'Course',
                  }),
                }
              );

              if (!welcomeEmailResponse.ok) {
                console.error('Failed to send welcome email:', await welcomeEmailResponse.text());
              } else {
              }
            }
          }
        } catch (emailError) {
          console.error('Error sending welcome email:', emailError);
          // Don't fail the webhook if email fails
        }
      } else {
        console.warn('No enrollment found for checkout session:', session.id);
      }
      break;
    }

    case 'checkout.session.async_payment_succeeded': {
      const session = event.data.object as Stripe.Checkout.Session;
      
      if (session.metadata?.type === 'enrollment' && session.metadata?.enrollment_id) {
        const enrollmentId = parseInt(session.metadata.enrollment_id);

        // Persist plan_id if metadata provides it (same logic as checkout.session.completed).
        const planIdMeta = session.metadata?.plan_id ? parseInt(session.metadata.plan_id, 10) : null;
        const planKeyMeta = session.metadata?.plan_key ? String(session.metadata.plan_key) : null;
        const courseIdMeta = session.metadata?.course_id ? parseInt(String(session.metadata.course_id), 10) : null;
        if ((planIdMeta != null && Number.isFinite(planIdMeta)) || planKeyMeta) {
          try {
            let resolvedPlanId: number | null = null;
            let resolvedPlanKey: string | null = null;
            if (planIdMeta != null && Number.isFinite(planIdMeta)) {
              resolvedPlanId = planIdMeta;
            } else if (planKeyMeta && courseIdMeta != null && Number.isFinite(courseIdMeta)) {
              const { data: planRow } = await supabase
                .from('course_plans')
                .select('id, plan_key')
                .eq('course_id', courseIdMeta)
                .eq('plan_key', planKeyMeta)
                .maybeSingle();
              resolvedPlanId = planRow?.id ?? null;
              resolvedPlanKey = planRow?.plan_key ?? null;
            }
            if (resolvedPlanId != null) {
              await supabase
                .from('enrollments')
                .update({ plan_id: resolvedPlanId, updated_at: new Date().toISOString() })
                .eq('id', enrollmentId);

              if (!resolvedPlanKey) {
                const { data: planFromId } = await supabase
                  .from('course_plans')
                  .select('plan_key')
                  .eq('id', resolvedPlanId)
                  .maybeSingle();
                resolvedPlanKey = planFromId?.plan_key ?? null;
              }
            }
            const stageNumber = extractStageNumberFromPlanKey(resolvedPlanKey ?? planKeyMeta ?? null);
            if (resolvedPlanId != null && stageNumber != null) {
              await supabase.rpc('upsert_enrollment_partial_payment', {
                p_enrollment_id: enrollmentId,
                p_stage_plan_id: resolvedPlanId,
                p_stage_number: stageNumber,
                p_is_fully_paid: stageNumber >= 3,
                p_max_topic_idx_unlocked: getNclexMaxTopicIdxForStagePlan(resolvedPlanKey ?? planKeyMeta ?? null),
                p_notes: `Stripe webhook async payment ${session.id}`,
                p_metadata: {
                  source: 'stripe_webhook_async_payment_succeeded',
                  stripe_session_id: session.id,
                },
              });
            }
          } catch (planErr) {
            console.error('Stripe webhook: failed to persist plan_id (async)', planErr);
          }
        }
        
        await supabase
          .from('enrollments')
          .update({
            payment_status: 'completed',
            payment_completed_at: new Date().toISOString(),
            status: 'active',
            updated_at: new Date().toISOString(),
          })
          .eq('id', enrollmentId);

      }
      break;
    }

    case 'checkout.session.async_payment_failed': {
      const session = event.data.object as Stripe.Checkout.Session;
      
      if (session.metadata?.type === 'enrollment' && session.metadata?.enrollment_id) {
        const enrollmentId = parseInt(session.metadata.enrollment_id);
        
        await supabase
          .from('enrollments')
          .update({
            payment_status: 'failed',
            updated_at: new Date().toISOString(),
          })
          .eq('id', enrollmentId);

      }
      break;
    }

    default:
  }

  return NextResponse.json({ received: true }, { headers: corsHeaders });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}

