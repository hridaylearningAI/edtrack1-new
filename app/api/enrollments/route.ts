import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient, formatResponse, formatAuthError } from '@/lib/api/supabase';
import { requireAuth } from '@/lib/api/auth';
import { corsHeaders, getPaginationParams } from '@/lib/api/utils';
import { generateEdtecStudentNumber } from '@/lib/studentNumber';

/**
 * enrollments.student_id FK → students.id. Users may exist in `users` without a `students` row yet.
 * Ensures a row exists, or reuses an existing `students` row with the same email.
 */
async function ensureStudentsRowForEnrollment(
  supabase: ReturnType<typeof getSupabaseClient>,
  enrollmentStudentId: number
): Promise<{ ok: true; studentId: number } | { ok: false; message: string }> {
  const { data: hasRow } = await supabase
    .from('students')
    .select('id')
    .eq('id', enrollmentStudentId)
    .maybeSingle();
  if (hasRow) return { ok: true, studentId: enrollmentStudentId };

  const { data: userRow, error: uErr } = await supabase
    .from('users')
    .select('id, name, email, status, student_number, role')
    .eq('id', enrollmentStudentId)
    .maybeSingle();

  if (uErr || !userRow || userRow.role !== 'student') {
    return { ok: false, message: 'Invalid student user for enrollment' };
  }

  const email = (userRow.email || '').trim();
  if (!email) {
    return { ok: false, message: 'User has no email; cannot create students row' };
  }

  const want = email.toLowerCase();
  const { data: emailRows } = await supabase
    .from('students')
    .select('id, email')
    .ilike('email', email);
  const existingByEmail = (emailRows || []).find(
    (s: { email?: string | null }) => (s.email || '').trim().toLowerCase() === want
  );
  if (existingByEmail) {
    return { ok: true, studentId: existingByEmail.id };
  }

  let studentNumber = userRow.student_number as string | null | undefined;
  if (!studentNumber) {
    studentNumber = await generateEdtecStudentNumber();
    if (!studentNumber) {
      return { ok: false, message: 'Could not generate student number' };
    }
  }

  const { error: insErr } = await supabase.from('students').insert({
    id: userRow.id,
    name: (userRow.name as string) || email.split('@')[0] || 'Student',
    email,
    grade: 'N/A',
    enrollment_date: new Date().toISOString().split('T')[0],
    status: (userRow.status as string) ?? 'active',
    student_number: studentNumber,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  if (insErr) {
    console.error('ensureStudentsRowForEnrollment insert error:', insErr);
    return {
      ok: false,
      message: insErr.message || 'Failed to create students row for enrollment',
    };
  }

  return { ok: true, studentId: userRow.id };
}

function extractStageNumberFromPlanKey(planKey: string | null | undefined): number | null {
  if (!planKey) return null;
  const m = planKey.match(/_(?:stage|part|partial)[_-]?(\d+)$/i);
  if (!m) return null;
  const n = parseInt(m[1] || '', 10);
  return Number.isFinite(n) ? n : null;
}

function getNclexMaxTopicIdxForStagePlan(planKey: string | null | undefined): number | null {
  if (!planKey) return null;
  switch (planKey) {
    case 'guided_nclex_stage1':
      return 0;
    case 'guided_nclex_stage2':
      return 6;
    case 'guided_nclex_stage3':
      return 8;
    default:
      return null;
  }
}

/**
 * GET /api/enrollments
 * Get all enrollments with filtering and pagination
 * POST /api/enrollments
 * Create a new enrollment
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (!authResult.authenticated) {
      return NextResponse.json(
        formatAuthError(authResult.error || 'Unauthorized', authResult.error_code || 'UNAUTHORIZED'),
        { status: 401, headers: corsHeaders }
      );
    }

    const supabase = getSupabaseClient();
    const params = new URL(request.url).searchParams;
    // For students, return all enrollments (no pagination limit) so Active Units etc. show every course
    const isStudent = authResult.user.role === 'student';
    const pagination = getPaginationParams(request);
    const page = isStudent && !params.has('limit') ? 1 : pagination.page;
    const limit = isStudent && !params.has('limit') ? 500 : pagination.limit;
    const offset = (page - 1) * limit;

    // Use the authenticated user's Supabase ID (not Clerk ID)
    // The authResult.user.id is the Supabase user ID from the users table
    const authenticatedUserId = authResult.user.id;

    // Build query with course information and plan (e.g. NCLEX plan name)
    let query = supabase
      .from('enrollments')
      .select(`
        *,
        courses (
          id,
          name,
          course_code,
          description,
          image_url,
          content_folder,
          price_without_certificate,
          price_with_certificate
        ),
        course_plans (
          id,
          name,
          plan_key
        )
      `, { count: 'exact' });

    // For students, filter by IDs that represent this user: auth user id (users.id) and
    // any students.id linked by email, so we show enrollments whether stored with
    // users.id or students.id (e.g. admin direct enroll).
    if (isStudent) {
      const userIdNum = typeof authenticatedUserId === 'number' ? authenticatedUserId : parseInt(String(authenticatedUserId), 10);
      const studentIdsToInclude: number[] = [userIdNum];

      // Ensure we have the user's email (auth object may not include it)
      let userEmail = (authResult.user as any).email?.trim();
      if (!userEmail) {
        const { data: userRow } = await supabase
          .from('users')
          .select('email')
          .eq('id', authenticatedUserId)
          .maybeSingle();
        userEmail = (userRow?.email as string)?.trim();
      }
      if (userEmail) {
        const { data: studentRows } = await supabase
          .from('students')
          .select('id')
          .ilike('email', userEmail);
        (studentRows || []).forEach((r: { id: number }) => {
          const id = typeof r.id === 'number' ? r.id : parseInt(String(r.id), 10);
          if (!studentIdsToInclude.includes(id)) studentIdsToInclude.push(id);
        });
      }
      query = query.in('student_id', studentIdsToInclude);
    } else if (params.get('student_id')) {
      // Admin can filter by any student_id
      query = query.eq('student_id', params.get('student_id'));
    }
    
    // Apply other filters
    if (params.get('course_id')) {
      query = query.eq('course_id', params.get('course_id'));
    }
    if (params.get('status')) {
      query = query.eq('status', params.get('status'));
    }

    // Apply pagination
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching enrollments:', error);
      return NextResponse.json(
        formatResponse(false, null, 'Failed to fetch enrollments'),
        { status: 500, headers: corsHeaders }
      );
    }

    // Flatten plan_key when embed is missing (e.g. RLS hides course_plans) but plan_id is set — needed for NCLEX partial-payment gating.
    type Row = {
      id?: number;
      plan_id?: number | null;
      course_plans?: { plan_key?: string } | { plan_key?: string }[] | null;
      plan_key?: string;
      partial_payment?: {
        max_stage_paid?: number;
        is_fully_paid?: boolean;
        max_topic_idx_unlocked?: number | null;
        latest_stage_plan_key?: string | null;
      } | null;
    };
    let rows: Row[] = (data || []) as Row[];
    const planIds = [
      ...new Set(
        rows
          .map((r) => r.plan_id)
          .filter((id): id is number => id != null && !Number.isNaN(Number(id)))
          .map((id) => Number(id))
      ),
    ];
    if (planIds.length > 0) {
      const { data: planRows } = await supabase.from('course_plans').select('id, plan_key').in('id', planIds);
      const planKeyById = new Map<number, string>(
        (planRows || []).map((p: { id: number; plan_key: string }) => [p.id, p.plan_key])
      );
      rows = rows.map((e) => {
        const fromEmbed = (() => {
          const cp = e.course_plans;
          if (!cp) return undefined;
          if (Array.isArray(cp)) {
            const first = cp[0];
            return first && typeof first === 'object' && first !== null && 'plan_key' in first
              ? String((first as { plan_key?: string }).plan_key ?? '')
              : undefined;
          }
          if (typeof cp === 'object' && 'plan_key' in cp) {
            return String((cp as { plan_key?: string }).plan_key ?? '');
          }
          return undefined;
        })();
        const fromId = e.plan_id != null ? planKeyById.get(Number(e.plan_id)) : undefined;
        const plan_key = (fromEmbed && fromEmbed.length > 0 ? fromEmbed : undefined) || fromId;
        if (plan_key && plan_key.length > 0) {
          return { ...e, plan_key };
        }
        return e;
      });
    }

    const enrollmentIds = rows
      .map((r) => (r.id != null && !Number.isNaN(Number(r.id)) ? Number(r.id) : null))
      .filter((id): id is number => id != null);
    if (enrollmentIds.length > 0) {
      const { data: partialRows } = await supabase
        .from('enrollment_partial_payments')
        .select('enrollment_id, max_stage_paid, is_fully_paid, max_topic_idx_unlocked, latest_stage_plan_key')
        .in('enrollment_id', enrollmentIds);
      const partialByEnrollment = new Map<number, Row["partial_payment"]>(
        (partialRows || []).map(
          (p: {
            enrollment_id: number;
            max_stage_paid?: number;
            is_fully_paid?: boolean;
            max_topic_idx_unlocked?: number | null;
            latest_stage_plan_key?: string | null;
          }) => [
            p.enrollment_id,
            {
              max_stage_paid: p.max_stage_paid,
              is_fully_paid: p.is_fully_paid,
              max_topic_idx_unlocked: p.max_topic_idx_unlocked,
              latest_stage_plan_key: p.latest_stage_plan_key,
            },
          ]
        )
      );
      rows = rows.map((e) => {
        const id = e.id != null && !Number.isNaN(Number(e.id)) ? Number(e.id) : null;
        if (id == null) return e;
        const partial = partialByEnrollment.get(id);
        return partial ? { ...e, partial_payment: partial } : e;
      });
    }

    return NextResponse.json(
      formatResponse(true, rows, 'Enrollments fetched successfully', count || 0, page, limit),
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Get enrollments error:', error);
    return NextResponse.json(
      formatResponse(false, null, 'Failed to fetch enrollments'),
      { status: 500, headers: corsHeaders }
    );
  }
}

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
    const { student_id, course_id, enrollment_date, status, progress, grade, notes } = body;
    const planIdRaw = body.plan_id;

    if (!student_id || !course_id) {
      return NextResponse.json(
        formatResponse(false, null, 'Student ID and Course ID are required'),
        { status: 400, headers: corsHeaders }
      );
    }

    const supabase = getSupabaseClient();
    const isAdmin = authResult.user.role === 'admin';

    let resolvedPlanId: number | null = null;
    if (planIdRaw !== undefined && planIdRaw !== null && planIdRaw !== '') {
      if (!isAdmin) {
        return NextResponse.json(
          formatResponse(false, null, 'Only administrators can set plan_id on enrollment'),
          { status: 403, headers: corsHeaders }
        );
      }
      const planIdNum = typeof planIdRaw === 'number' ? planIdRaw : parseInt(String(planIdRaw), 10);
      if (!Number.isFinite(planIdNum)) {
        return NextResponse.json(
          formatResponse(false, null, 'Invalid plan_id'),
          { status: 400, headers: corsHeaders }
        );
      }
      const courseIdNum = typeof course_id === 'number' ? course_id : parseInt(String(course_id), 10);
      const { data: planRow, error: planErr } = await supabase
        .from('course_plans')
        .select('id, course_id, plan_key')
        .eq('id', planIdNum)
        .maybeSingle();
      if (planErr || !planRow) {
        return NextResponse.json(
          formatResponse(false, null, 'Plan not found'),
          { status: 400, headers: corsHeaders }
        );
      }
      if (Number(planRow.course_id) !== Number(courseIdNum)) {
        return NextResponse.json(
          formatResponse(false, null, 'Selected plan does not belong to the chosen course'),
          { status: 400, headers: corsHeaders }
        );
      }
      resolvedPlanId = planIdNum;
    }

    const requestedId =
      typeof student_id === 'number' ? student_id : parseInt(String(student_id), 10);
    if (!Number.isFinite(requestedId)) {
      return NextResponse.json(
        formatResponse(false, null, 'Invalid student_id'),
        { status: 400, headers: corsHeaders }
      );
    }

    // Enrollment Overview passes `users.id`. Some accounts exist in `users` but not yet in `students`.
    const { data: studentById } = await supabase
      .from('students')
      .select('id, email, status')
      .eq('id', requestedId)
      .maybeSingle();

    const { data: userByRequestedId } = await supabase
      .from('users')
      .select('id, email, role')
      .eq('id', requestedId)
      .maybeSingle();

    if (!studentById && (!userByRequestedId || userByRequestedId.role !== 'student')) {
      return NextResponse.json(
        formatResponse(
          false,
          null,
          `No student or student-role user found for id ${requestedId}`
        ),
        { status: 400, headers: corsHeaders }
      );
    }

    let studentRow: { id: number; email: string | null; status: string | null } | null = studentById;
    if (!studentRow && userByRequestedId?.role === 'student' && userByRequestedId.email) {
      const want = userByRequestedId.email.trim().toLowerCase();
      const { data: emailRows } = await supabase
        .from('students')
        .select('id, email, status')
        .ilike('email', userByRequestedId.email.trim());
      studentRow =
        (emailRows || []).find(
          (s: { email?: string | null }) =>
            (s.email || '').trim().toLowerCase() === want
        ) ?? null;
    }

    // Resolve the id to use for enrollment.student_id. Student dashboard filters by
    // users.id (and students.id linked by email). Prefer users.id so the student sees the course.
    let enrollmentStudentId: number = requestedId;
    if (userByRequestedId?.role === 'student') {
      enrollmentStudentId =
        typeof userByRequestedId.id === 'number'
          ? userByRequestedId.id
          : parseInt(String(userByRequestedId.id), 10);
    } else if (studentRow) {
      const studentEmail = (studentRow.email || '').trim().toLowerCase();
      enrollmentStudentId = requestedId;
      const { data: userSameId } = await supabase
        .from('users')
        .select('id')
        .eq('id', requestedId)
        .eq('role', 'student')
        .maybeSingle();
      if (userSameId?.id != null) {
        enrollmentStudentId =
          typeof userSameId.id === 'number' ? userSameId.id : parseInt(String(userSameId.id), 10);
      } else if (studentEmail) {
        const { data: emailCandidates } = await supabase
          .from('users')
          .select('id, email')
          .eq('role', 'student')
          .ilike('email', studentRow.email?.trim() ?? '');
        const match = (emailCandidates || []).find(
          (u: { id: number; email?: string }) =>
            (u.email || '').trim().toLowerCase() === studentEmail
        );
        if (match?.id != null) {
          enrollmentStudentId =
            typeof match.id === 'number' ? match.id : parseInt(String(match.id), 10);
        }
      }
    }

    const ensured = await ensureStudentsRowForEnrollment(supabase, enrollmentStudentId);
    if (!ensured.ok) {
      return NextResponse.json(
        formatResponse(false, null, ensured.message),
        { status: 400, headers: corsHeaders }
      );
    }
    enrollmentStudentId = ensured.studentId;

    // Check if enrollment already exists (by resolved user id and course)
    const { data: existing } = await supabase
      .from('enrollments')
      .select('id')
      .eq('student_id', enrollmentStudentId)
      .eq('course_id', course_id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        formatResponse(false, null, 'Enrollment already exists'),
        { status: 409, headers: corsHeaders }
      );
    }

    // Use 'active' so the student sees the course on dashboard and current-units immediately.
    // 'pending' is only for payment flow (payment_status tracks that).
    let enrollmentStatus = status || 'active';
    if (status === 'pending') {
      enrollmentStatus = 'enrolled'; // Payment flow: enrolled until payment completes
    }

    // Certificate-only courses (no price_without_certificate) include the certificate by default when not specified
    let withCertificate = body.with_certificate;
    if (withCertificate === undefined) {
      const { data: courseRow } = await supabase
        .from('courses')
        .select('price_without_certificate, price_with_certificate')
        .eq('id', course_id)
        .maybeSingle();
      const isCertificateOnly = courseRow && (courseRow.price_without_certificate == null || courseRow.price_without_certificate === 0);
      if (isCertificateOnly) withCertificate = true;
    }

    // Prepare enrollment data (use resolved user id so student sees it on dashboard/current-units)
    const enrollmentData: any = {
      student_id: enrollmentStudentId,
      course_id,
      enrollment_date: enrollment_date || new Date().toISOString(),
      status: enrollmentStatus,
      progress: progress !== undefined ? progress : 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    if (body.with_certificate !== undefined) {
      enrollmentData.with_certificate = !!body.with_certificate;
    } else if (withCertificate === true) {
      enrollmentData.with_certificate = true;
    }

    // Add optional fields if provided
    if (grade !== undefined) enrollmentData.grade = grade;
    if (notes !== undefined) {
      enrollmentData.notes = notes;
    } else if (resolvedPlanId != null) {
      enrollmentData.notes = 'Direct administrative enrollment (plan selected)';
    }
    if (resolvedPlanId != null) {
      enrollmentData.plan_id = resolvedPlanId;
    }

    // Create enrollment
    const { data: enrollment, error } = await supabase
      .from('enrollments')
      .insert(enrollmentData)
      .select()
      .single();

    if (error || !enrollment) {
      console.error('Error creating enrollment:', error);
      console.error('Enrollment data attempted:', enrollmentData);
      return NextResponse.json(
        formatResponse(false, null, `Failed to create enrollment: ${error?.message || 'Unknown error'}`),
        { status: 500, headers: corsHeaders }
      );
    }

    // Staged / partial plans (e.g. guided_nclex_stage1): sync enrollment_partial_payments like Stripe webhook
    if (resolvedPlanId != null) {
      const { data: planForPartial } = await supabase
        .from('course_plans')
        .select('id, plan_key')
        .eq('id', resolvedPlanId)
        .maybeSingle();
      const planKey = planForPartial?.plan_key ?? null;
      const stageNumber = extractStageNumberFromPlanKey(planKey);
      if (planForPartial && stageNumber != null) {
        try {
          await supabase.rpc('upsert_enrollment_partial_payment', {
            p_enrollment_id: enrollment.id,
            p_stage_plan_id: planForPartial.id,
            p_stage_number: stageNumber,
            p_is_fully_paid: stageNumber >= 3,
            p_max_topic_idx_unlocked: getNclexMaxTopicIdxForStagePlan(planKey),
            p_notes: `Admin direct enrollment (plan ${planKey})`,
            p_metadata: { source: 'admin_direct_enrollment' },
          });
        } catch (planErr) {
          console.error('Enrollment POST: upsert_enrollment_partial_payment failed', planErr);
        }
      }
    }

    return NextResponse.json(
      formatResponse(true, enrollment, 'Enrollment created successfully'),
      { status: 201, headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Create enrollment error:', error);
    return NextResponse.json(
      formatResponse(false, null, 'Failed to create enrollment'),
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

