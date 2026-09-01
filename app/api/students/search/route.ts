import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient, formatResponse, formatAuthError } from '@/lib/api/supabase';
import { requireAuth } from '@/lib/api/auth';
import { corsHeaders, getPaginationParams } from '@/lib/api/utils';

/**
 * GET /api/students/search
 * Advanced search for students with multiple filters
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
    const { page, limit, offset } = getPaginationParams(request);
    const params = new URL(request.url).searchParams;

    // Build query - fetch from users table with role='student' filter
    let query = supabase
      .from('users')
      .select('*', { count: 'exact' })
      .eq('role', 'student'); // Only get students, not admins

    // Apply all filters (only for fields that exist in users table)
    if (params.get('name')) {
      query = query.ilike('name', `%${params.get('name')}%`);
    }
    if (params.get('email')) {
      query = query.ilike('email', `%${params.get('email')}%`);
    }
    if (params.get('status')) {
      query = query.eq('status', params.get('status'));
    }
    // Note: 'grade' and 'enrollment_date' filters removed as they don't exist in users table

    // Apply pagination
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('Error searching students:', error);
      return NextResponse.json(
        formatResponse(false, null, 'Failed to search students'),
        { status: 500, headers: corsHeaders }
      );
    }

    // Map users table data to Student interface
    // Map created_at to enrollment_date for backward compatibility
    const students = (data || []).map((user: any) => ({
      ...user,
      enrollment_date: user.created_at, // Use created_at as enrollment_date
    }));

    return NextResponse.json(
      formatResponse(true, students, 'Students search completed', count || 0, page, limit),
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Search students error:', error);
    return NextResponse.json(
      formatResponse(false, null, 'Failed to search students'),
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

