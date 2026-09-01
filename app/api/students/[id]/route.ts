import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient, formatResponse, formatAuthError } from '@/lib/api/supabase';
import { requireAuth } from '@/lib/api/auth';
import { corsHeaders } from '@/lib/api/utils';

/**
 * GET /api/students/[id]
 * Get student by ID
 * PUT /api/students/[id]
 * Update student
 * DELETE /api/students/[id]
 * Delete student
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
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
    const studentId = params.id;

    const { data: student, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', studentId)
      .eq('role', 'student') // Ensure we only get students
      .single();

    if (error || !student) {
      return NextResponse.json(
        formatResponse(false, null, 'Student not found'),
        { status: 404, headers: corsHeaders }
      );
    }

    // Map created_at to enrollment_date for backward compatibility
    const studentWithEnrollmentDate = {
      ...student,
      enrollment_date: student.created_at,
    };

    return NextResponse.json(
      formatResponse(true, studentWithEnrollmentDate, 'Student fetched successfully'),
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Get student error:', error);
    return NextResponse.json(
      formatResponse(false, null, 'Failed to fetch student'),
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAuth(request);
    if (!authResult.authenticated) {
      return NextResponse.json(
        formatAuthError(authResult.error || 'Unauthorized', authResult.error_code || 'UNAUTHORIZED'),
        { status: 401, headers: corsHeaders }
      );
    }

    const body = await request.json();
    const studentId = params.id;
    const supabase = getSupabaseClient();

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    // Only update fields that exist in users table
    if (body.name !== undefined) updateData.name = body.name;
    if (body.email !== undefined) updateData.email = body.email;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.avatar !== undefined) updateData.avatar = body.avatar;
    // Note: phone, address, date_of_birth, grade, enrollment_date don't exist in users table

    const { data: student, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', studentId)
      .eq('role', 'student') // Ensure we only update students
      .select()
      .single();

    if (error || !student) {
      return NextResponse.json(
        formatResponse(false, null, 'Student not found or update failed'),
        { status: 404, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      formatResponse(true, student, 'Student updated successfully'),
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Update student error:', error);
    return NextResponse.json(
      formatResponse(false, null, 'Failed to update student'),
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAuth(request);
    if (!authResult.authenticated) {
      return NextResponse.json(
        formatAuthError(authResult.error || 'Unauthorized', authResult.error_code || 'UNAUTHORIZED'),
        { status: 401, headers: corsHeaders }
      );
    }

    const studentId = params.id;
    const supabase = getSupabaseClient();

    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', studentId)
      .eq('role', 'student'); // Ensure we only delete students

    if (error) {
      console.error('Error deleting student:', error);
      return NextResponse.json(
        formatResponse(false, null, 'Failed to delete student'),
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      formatResponse(true, null, 'Student deleted successfully'),
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Delete student error:', error);
    return NextResponse.json(
      formatResponse(false, null, 'Failed to delete student'),
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

