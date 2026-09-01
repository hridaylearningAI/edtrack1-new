import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient, formatResponse } from '@/lib/api/supabase';
import { Resend } from 'resend';
import { corsHeaders } from '@/lib/api/utils';

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * POST /api/trials/start
 * Start a free trial for a course (SMS-only; no external LMS).
 * No authentication required - users only need email and name.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, name, courseId } = body;

    if (!email || !name || !courseId) {
      return NextResponse.json(
        formatResponse(false, null, 'Email, name, and course ID are required'),
        { status: 400, headers: corsHeaders }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        formatResponse(false, null, 'Invalid email format'),
        { status: 400, headers: corsHeaders }
      );
    }

    const supabase = getSupabaseClient();
    const portalUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_PORTFOLIO_URL || 'https://edtec.online';

    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id, name, trial_enabled, trial_duration_days')
      .eq('id', courseId)
      .single();

    if (courseError || !course) {
      return NextResponse.json(
        formatResponse(false, null, 'Course not found'),
        { status: 404, headers: corsHeaders }
      );
    }

    if (!course.trial_enabled) {
      return NextResponse.json(
        formatResponse(false, null, 'This course does not offer free trials'),
        { status: 400, headers: corsHeaders }
      );
    }

    const trialDurationDays = course.trial_duration_days || 7;

    const { data: existingTrial } = await supabase
      .from('trial_enrollments')
      .select('id, status, trial_expires_at')
      .eq('email', email.toLowerCase().trim())
      .eq('course_id', courseId)
      .single();

    if (existingTrial) {
      const expiresAt = new Date(existingTrial.trial_expires_at);
      const now = new Date();

      if (expiresAt > now && existingTrial.status === 'active') {
        return NextResponse.json(
          formatResponse(false, null, 'You already have an active trial for this course'),
          { status: 409, headers: corsHeaders }
        );
      }
    }

    const trialStartedAt = new Date();
    const trialExpiresAt = new Date(trialStartedAt);
    trialExpiresAt.setDate(trialExpiresAt.getDate() + trialDurationDays);

    let trialEnrollment;

    if (existingTrial) {
      const { data: updated, error: updateError } = await supabase
        .from('trial_enrollments')
        .update({
          name: name.trim(),
          trial_started_at: trialStartedAt.toISOString(),
          trial_expires_at: trialExpiresAt.toISOString(),
          status: 'active',
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingTrial.id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating trial enrollment:', updateError);
        return NextResponse.json(
          formatResponse(false, null, 'Failed to update trial enrollment'),
          { status: 500, headers: corsHeaders }
        );
      }
      trialEnrollment = updated;
    } else {
      const { data: created, error: createError } = await supabase
        .from('trial_enrollments')
        .insert({
          email: email.toLowerCase().trim(),
          name: name.trim(),
          course_id: courseId,
          trial_started_at: trialStartedAt.toISOString(),
          trial_expires_at: trialExpiresAt.toISOString(),
          status: 'active',
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating trial enrollment:', createError);
        return NextResponse.json(
          formatResponse(false, null, 'Failed to create trial enrollment'),
          { status: 500, headers: corsHeaders }
        );
      }
      trialEnrollment = created;
    }

    if (process.env.RESEND_API_KEY) {
      try {
        const emailSubject = `Your Free Trial Access - ${course.name}`;
        const emailHtml = `
          <!DOCTYPE html>
          <html>
          <head><meta charset="utf-8"><title>${emailSubject}</title></head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #1e3a5f;">Your free trial is ready</h1>
            <p>Hello ${name.trim()},</p>
            <p>Your free trial for <strong>${course.name}</strong> is now active until <strong>${trialExpiresAt.toLocaleDateString()}</strong>.</p>
            <p>Sign in to the student portal to start learning:</p>
            <p style="text-align:center;margin:28px 0;">
              <a href="${portalUrl}/login" style="background:#1e3a5f;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:bold;">
                Open Student Portal
              </a>
            </p>
            <p style="color:#666;font-size:13px;">If you need help, reply to this email or contact support.</p>
          </body>
          </html>
        `;

        await resend.emails.send({
          from: process.env.FROM_EMAIL || 'noreply@edtec.online',
          to: email,
          subject: emailSubject,
          html: emailHtml,
        });
      } catch (emailError: unknown) {
        console.error('Error sending trial email:', emailError);
      }
    } else {
      console.warn('RESEND_API_KEY not configured - skipping trial email');
    }

    return NextResponse.json(
      formatResponse(true, {
        trialEnrollment,
        trialExpiresAt: trialExpiresAt.toISOString(),
        message: 'Trial started successfully. Check your email for access details.',
      }, 'Trial started successfully'),
      { status: 201, headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Error starting trial:', error);
    return NextResponse.json(
      formatResponse(false, null, error.message || 'Failed to start trial'),
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}
