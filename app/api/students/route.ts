import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient, formatResponse, formatAuthError } from '@/lib/api/supabase';
import { requireTenantScope } from '@/lib/api/tenant-scope';
import { corsHeaders, getPaginationParams } from '@/lib/api/utils';
import { generateEdtecStudentNumber } from '@/lib/studentNumber';

/**
 * GET /api/students
 * Get all students with filtering and pagination
 * POST /api/students
 * Create a new student
 */
export async function GET(request: NextRequest) {
  try {
    const scope = await requireTenantScope(request);
    if (!scope.ok) {
      return NextResponse.json(
        formatAuthError(scope.error, scope.code),
        { status: scope.status, headers: corsHeaders }
      );
    }

    const supabase = getSupabaseClient();
    const { page, limit, offset } = getPaginationParams(request);
    const params = new URL(request.url).searchParams;

    // Build query - fetch from students table (enrollments reference this table)
    // Also join with users table to get user data if needed
    let query = supabase
      .from('students')
      .select('*', { count: 'exact' });

    if (scope.tenantId) query = query.eq('tenant_id', scope.tenantId);

    // Hide dummy accounts by default.
    // Admin tools can include them explicitly via ?include_dummy=true.
    const includeDummy = (params.get('include_dummy') || 'false') === 'true';
    if (!includeDummy) {
      query = query.neq('status', 'dummy');
    }

    // Apply filters
    if (params.get('name')) {
      query = query.ilike('name', `%${params.get('name')}%`);
    }
    if (params.get('email')) {
      query = query.ilike('email', `%${params.get('email')}%`);
    }
    if (params.get('status')) {
      query = query.eq('status', params.get('status'));
    }
    if (params.get('grade')) {
      query = query.eq('grade', params.get('grade'));
    }

    // Apply pagination
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching students:', error);
      return NextResponse.json(
        formatResponse(false, null, 'Failed to fetch students'),
        { status: 500, headers: corsHeaders }
      );
    }

    // Map students table data to Student interface
    // enrollment_date already exists in students table
    const students = (data || []).map((student: any) => ({
      ...student,
      // Keep enrollment_date as is (it exists in students table)
      enrollment_date: student.enrollment_date || student.created_at,
    }));

    return NextResponse.json(
      formatResponse(true, students, 'Students fetched successfully', count || 0, page, limit),
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Get students error:', error);
    return NextResponse.json(
      formatResponse(false, null, 'Failed to fetch students'),
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const scope = await requireTenantScope(request);
    if (!scope.ok) {
      return NextResponse.json(
        formatAuthError(scope.error, scope.code),
        { status: scope.status, headers: corsHeaders }
      );
    }

    const body = await request.json();
    const { name, email, status = 'active' } = body;

    if (!name || !email) {
      return NextResponse.json(
        formatResponse(false, null, 'Name and email are required'),
        { status: 400, headers: corsHeaders }
      );
    }

    const supabase = getSupabaseClient();

    // Check if user with email already exists
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existing) {
      return NextResponse.json(
        formatResponse(false, null, 'User with this email already exists'),
        { status: 409, headers: corsHeaders }
      );
    }

    // Generate EDTEC student number (EDTEC-YYXNNNN)
    const studentNumber = await generateEdtecStudentNumber();
    if (!studentNumber) {
      return NextResponse.json(
        formatResponse(false, null, 'Failed to generate student number'),
        { status: 500, headers: corsHeaders }
      );
    }

    // Create user with role='student' in users table
    // Note: password_hash is required but we'll generate a temporary one or use a placeholder
    // In production, you should generate a proper password or require it
    const { data: user, error: userError } = await supabase
      .from('users')
      .insert({
        name,
        email,
        password_hash: '$2b$12$PLACEHOLDER_PASSWORD_HASH', // Placeholder - should be replaced with actual password hash
        role: 'student', // Set role to student
        tenant_id: scope.tenantId,
        status,
        student_number: studentNumber,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (userError || !user) {
      console.error('Error creating user:', userError);
      return NextResponse.json(
        formatResponse(false, null, 'Failed to create user'),
        { status: 500, headers: corsHeaders }
      );
    }

    // Also create a record in the students table (required for enrollments foreign key)
    // Try to use the user's ID as the student's ID to keep them in sync
    let studentRecord: any = null;
    let studentId: number | null = null;

    const { data: studentRecordWithId, error: studentError } = await supabase
      .from('students')
      .insert({
        id: user.id, // Try to use same ID as user
        name,
        email,
        phone: body.phone || null,
        address: body.address || null,
        date_of_birth: body.date_of_birth || null,
        grade: body.grade || 'N/A',
        tenant_id: scope.tenantId,
        enrollment_date: new Date().toISOString().split('T')[0],
        status,
        student_number: studentNumber,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (studentError || !studentRecordWithId) {
      // If inserting with specific ID fails, try without ID (let it auto-increment)
      // This can happen if the students table doesn't allow setting the ID
      console.warn('Could not create student with user ID, trying auto-increment:', studentError?.message);
      
      const { data: studentRecordAuto, error: studentErrorAuto } = await supabase
        .from('students')
        .insert({
          name,
          email,
          phone: body.phone || null,
          address: body.address || null,
          date_of_birth: body.date_of_birth || null,
          grade: body.grade || 'N/A',
        tenant_id: scope.tenantId,
          enrollment_date: new Date().toISOString().split('T')[0],
          status,
          student_number: studentNumber,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (studentErrorAuto || !studentRecordAuto) {
        console.error('Error creating student record:', studentErrorAuto);
        return NextResponse.json(
          formatResponse(false, null, 'Failed to create student record in students table'),
          { status: 500, headers: corsHeaders }
        );
      } else {
        studentRecord = studentRecordAuto;
        studentId = studentRecordAuto.id;
      }
    } else {
      studentRecord = studentRecordWithId;
      studentId = studentRecordWithId.id;
    }

    // Return the user data with the student ID (which is what enrollments need)
    // The frontend expects the user data, but we include the student ID for enrollment purposes
    return NextResponse.json(
      formatResponse(true, { ...user, student_id: studentId }, 'Student created successfully'),
      { status: 201, headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Create student error:', error);
    return NextResponse.json(
      formatResponse(false, null, 'Failed to create student'),
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

