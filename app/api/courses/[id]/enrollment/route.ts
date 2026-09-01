import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient, formatResponse, formatAuthError } from '@/lib/api/supabase';
import { requireAuth } from '@/lib/api/auth';
import { corsHeaders } from '@/lib/api/utils';

/**
 * GET /api/courses/[id]/enrollment
 * Returns whether the authenticated student is enrolled in the course,
 * along with a minimal enrollment object (including certificate/plan flags).
 *
 * Used by the marketing/portfolio site via useEnrollment hook.
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
    const { id: courseId } = await params;
    const courseIdNum = parseInt(courseId, 10);
    if (Number.isNaN(courseIdNum)) {
      return NextResponse.json(
        formatResponse(false, null, 'Invalid course ID'),
        { status: 400, headers: corsHeaders }
      );
    }

    // Resolve student identifiers as in /api/enrollments GET:
    const authenticatedUserId = authResult.user.id;
    const studentIdsToInclude: number[] = [];
    const userIdNum = typeof authenticatedUserId === 'number'
      ? authenticatedUserId
      : parseInt(String(authenticatedUserId), 10);
    if (!Number.isNaN(userIdNum)) {
      studentIdsToInclude.push(userIdNum);
    }

    // Also include any students rows matching the user's email.
    const supabaseClient = supabase;
    let userEmail = (authResult.user as any).email?.trim();
    if (!userEmail) {
      const { data: userRow } = await supabaseClient
        .from('users')
        .select('email')
        .eq('id', authenticatedUserId)
        .maybeSingle();
      userEmail = (userRow?.email as string)?.trim();
    }
    if (userEmail) {
      const { data: studentRows } = await supabaseClient
        .from('students')
        .select('id')
        .ilike('email', userEmail);
      (studentRows || []).forEach((r: { id: number }) => {
        const idNum = typeof r.id === 'number' ? r.id : parseInt(String(r.id), 10);
        if (!Number.isNaN(idNum) && !studentIdsToInclude.includes(idNum)) {
          studentIdsToInclude.push(idNum);
        }
      });
    }

    if (studentIdsToInclude.length === 0) {
      return NextResponse.json(
        formatResponse(true, { isEnrolled: false, enrollment: null }, 'No matching student id for user'),
        { headers: corsHeaders }
      );
    }

    const { data: enrollmentRow, error } = await supabaseClient
      .from('enrollments')
      .select(
        `
          id,
          status,
          enrollment_date,
          with_certificate,
          plan_id,
          course_plans (
            plan_key
          )
        `
      )
      .eq('course_id', courseIdNum)
      .in('student_id', studentIdsToInclude)
      .order('created_at', { ascending: false })
      .maybeSingle();

    if (error) {
      console.error('Error checking enrollment for course:', error);
      return NextResponse.json(
        formatResponse(false, null, 'Failed to check enrollment'),
        { status: 500, headers: corsHeaders }
      );
    }

    if (!enrollmentRow) {
      return NextResponse.json(
        formatResponse(true, { isEnrolled: false, enrollment: null }, 'Not enrolled in course'),
        { headers: corsHeaders }
      );
    }

    type PlanEmbed = { plan_key?: string } | { plan_key?: string }[] | null;
    const cp = enrollmentRow.course_plans as PlanEmbed;
    const fromEmbed = Array.isArray(cp)
      ? cp[0] && typeof cp[0] === 'object' && 'plan_key' in cp[0]
        ? String((cp[0] as { plan_key?: string }).plan_key ?? '')
        : ''
      : cp && typeof cp === 'object' && 'plan_key' in cp
        ? String((cp as { plan_key?: string }).plan_key ?? '')
        : '';
    let planKeyFlat = fromEmbed.length > 0 ? fromEmbed : undefined;
    const pid = enrollmentRow.plan_id as number | null | undefined;
    if (!planKeyFlat && pid != null && !Number.isNaN(Number(pid))) {
      const { data: planRow } = await supabaseClient
        .from('course_plans')
        .select('plan_key')
        .eq('id', pid)
        .maybeSingle();
      planKeyFlat = planRow?.plan_key ? String(planRow.plan_key) : undefined;
    }

    const { course_plans: _drop, ...rest } = enrollmentRow as Record<string, unknown>;
    const enrollment = {
      ...rest,
      ...(planKeyFlat ? { plan_key: planKeyFlat } : {}),
    };

    return NextResponse.json(
      formatResponse(true, { isEnrolled: true, enrollment }, 'Enrollment found'),
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Get course enrollment error:', error);
    return NextResponse.json(
      formatResponse(false, null, 'Failed to check enrollment'),
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

