import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient, formatResponse } from '@/lib/api/supabase';
import { corsHeaders } from '@/lib/api/utils';

/**
 * POST /api/trials/convert
 * Convert a trial enrollment to a paid enrollment
 * This is called automatically during purchase flow
 * Body: { email, courseId, enrollmentId }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, courseId, enrollmentId } = body;

    if (!email || !courseId || !enrollmentId) {
      return NextResponse.json(
        formatResponse(false, null, 'Email, course ID, and enrollment ID are required'),
        { status: 400, headers: corsHeaders }
      );
    }

    const supabase = getSupabaseClient();

    // Find the trial enrollment
    const { data: trialEnrollment, error: trialError } = await supabase
      .from('trial_enrollments')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .eq('course_id', courseId)
      .single();

    if (trialError || !trialEnrollment) {
      // No trial to convert - this is fine, just return success
      return NextResponse.json(
        formatResponse(true, { converted: false, reason: 'No trial enrollment found' }, 'No trial to convert'),
        { headers: corsHeaders }
      );
    }

    // Check if already converted
    if (trialEnrollment.trial_converted) {
      return NextResponse.json(
        formatResponse(true, { converted: false, reason: 'Trial already converted' }, 'Trial already converted'),
        { headers: corsHeaders }
      );
    }

    // Update trial enrollment to mark as converted
    const { error: updateError } = await supabase
      .from('trial_enrollments')
      .update({
        trial_converted: true,
        converted_to_enrollment_id: enrollmentId,
        converted_at: new Date().toISOString(),
        status: 'converted',
        updated_at: new Date().toISOString(),
      })
      .eq('id', trialEnrollment.id);

    if (updateError) {
      console.error('Error converting trial enrollment:', updateError);
      return NextResponse.json(
        formatResponse(false, null, 'Failed to convert trial enrollment'),
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      formatResponse(true, {
        converted: true,
        trialEnrollmentId: trialEnrollment.id,
        enrollmentId: enrollmentId,
      }, 'Trial converted successfully'),
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Error converting trial:', error);
    return NextResponse.json(
      formatResponse(false, null, error.message || 'Failed to convert trial'),
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

