import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient, formatResponse } from '@/lib/api/supabase';
import { corsHeaders } from '@/lib/api/utils';

/**
 * GET /api/trials/status
 * Check trial status/eligibility for a course
 * Query params: email, courseId
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const courseId = searchParams.get('courseId');

    if (!email || !courseId) {
      return NextResponse.json(
        formatResponse(false, null, 'Email and course ID are required'),
        { status: 400, headers: corsHeaders }
      );
    }

    const supabase = getSupabaseClient();

    // Check if course exists and has trial enabled
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

    // Check for existing trial
    const { data: existingTrial } = await supabase
      .from('trial_enrollments')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .eq('course_id', courseId)
      .single();

    let eligibility = {
      canStartTrial: false,
      hasActiveTrial: false,
      hasExpiredTrial: false,
      hasConvertedTrial: false,
      trial: null as any,
      course: {
        id: course.id,
        name: course.name,
        trialEnabled: course.trial_enabled,
        trialDurationDays: course.trial_duration_days || 7,
      },
    };

    if (!course.trial_enabled) {
      return NextResponse.json(
        formatResponse(true, {
          ...eligibility,
          reason: 'Course does not offer free trials',
        }, 'Trial status retrieved'),
        { headers: corsHeaders }
      );
    }

    if (existingTrial) {
      const expiresAt = new Date(existingTrial.trial_expires_at);
      const now = new Date();
      const isExpired = expiresAt <= now;
      const isActive = existingTrial.status === 'active' && !isExpired;
      const isConverted = existingTrial.trial_converted;

      eligibility.hasActiveTrial = isActive;
      eligibility.hasExpiredTrial = isExpired && !isConverted;
      eligibility.hasConvertedTrial = isConverted;
      eligibility.trial = existingTrial;
      eligibility.canStartTrial = !isActive; // Can start if not currently active
    } else {
      eligibility.canStartTrial = true;
    }

    return NextResponse.json(
      formatResponse(true, eligibility, 'Trial status retrieved'),
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Error checking trial status:', error);
    return NextResponse.json(
      formatResponse(false, null, error.message || 'Failed to check trial status'),
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

