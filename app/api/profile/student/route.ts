import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient, formatResponse, formatAuthError } from '@/lib/api/supabase';
import { requireAuth } from '@/lib/api/auth';
import { corsHeaders } from '@/lib/api/utils';

/**
 * GET /api/profile/student
 * Get current authenticated student's profile (from students table, includes phone)
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

    if (authResult.user.role !== 'student') {
      return NextResponse.json(
        formatResponse(false, null, 'Not a student'),
        { status: 403, headers: corsHeaders }
      );
    }

    const supabase = getSupabaseClient();
    const userId = typeof authResult.user.id === 'number' ? authResult.user.id : parseInt(String(authResult.user.id), 10);

    const { data: student, error } = await supabase
      .from('students')
      .select('id, name, email, phone, address, date_of_birth, grade, enrollment_date, status, student_number, created_at, updated_at')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Get student profile error:', error);
      return NextResponse.json(
        formatResponse(false, null, 'Failed to fetch student profile'),
        { status: 500, headers: corsHeaders }
      );
    }

    if (!student) {
      return NextResponse.json(
        formatResponse(true, { phone: null, name: authResult.user.name, email: authResult.user.email }, 'Student profile not found; phone not set'),
        { headers: corsHeaders }
      );
    }

    return NextResponse.json(
      formatResponse(true, student, 'Student profile fetched'),
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Get student profile error:', error);
    return NextResponse.json(
      formatResponse(false, null, 'Failed to fetch student profile'),
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * PATCH /api/profile/student
 * Update current authenticated student's phone (and optionally other fields from students table)
 */
export async function PATCH(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (!authResult.authenticated) {
      return NextResponse.json(
        formatAuthError(authResult.error || 'Unauthorized', authResult.error_code || 'UNAUTHORIZED'),
        { status: 401, headers: corsHeaders }
      );
    }

    if (authResult.user.role !== 'student') {
      return NextResponse.json(
        formatResponse(false, null, 'Not a student'),
        { status: 403, headers: corsHeaders }
      );
    }

    const body = await request.json();
    const supabase = getSupabaseClient();
    const userId = typeof authResult.user.id === 'number' ? authResult.user.id : parseInt(String(authResult.user.id), 10);

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (body.phone !== undefined) updateData.phone = body.phone === '' ? null : String(body.phone).trim();

    let result = await supabase
      .from('students')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single();

    if (result.error && (result.error.code === 'PGRST116' || result.error.message?.includes('0 rows'))) {
      // No student row yet: create one so the user can save their phone
      const insertResult = await supabase
        .from('students')
        .insert({
          id: userId,
          name: authResult.user.name || 'Student',
          email: authResult.user.email || '',
          phone: updateData.phone ?? null,
          address: 'Address not provided',
          date_of_birth: '1990-01-01',
          grade: 'N/A',
          enrollment_date: new Date().toISOString().split('T')[0],
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (insertResult.error) {
        console.error('Create student profile error:', insertResult.error);
        return NextResponse.json(
          formatResponse(false, null, 'Failed to save phone'),
          { status: 500, headers: corsHeaders }
        );
      }
      result = { data: insertResult.data, error: insertResult.error };
    } else if (result.error) {
      console.error('Update student profile error:', result.error);
      return NextResponse.json(
        formatResponse(false, null, 'Failed to update phone'),
        { status: 500, headers: corsHeaders }
      );
    }

    const student = result.data;
    if (!student) {
      return NextResponse.json(
        formatResponse(false, null, 'Student profile not found'),
        { status: 404, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      formatResponse(true, student, 'Phone saved successfully'),
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Update student profile error:', error);
    return NextResponse.json(
      formatResponse(false, null, 'Failed to update phone'),
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}
