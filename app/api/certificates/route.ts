import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth';
import { getSupabaseClient } from '@/lib/api/supabase';
import { corsHeaders } from '@/lib/api/utils';

/**
 * GET /api/certificates
 * Get all certificates for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401, headers: corsHeaders }
      );
    }

    const supabase = getSupabaseClient();

    // Build query
    let query = supabase
      .from('certificates')
      .select(`
        *,
        enrollments (
          completion_date,
          grade,
          courses (
            id,
            name,
            description
          )
        )
      `)
      .order('issued_at', { ascending: false });

    // Students can only see their own certificates
    if (authResult.user.role === 'student') {
      query = query.eq('student_id', authResult.user.id);
    }

    const { data: certificates, error } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json(
      {
        success: true,
        data: certificates || [],
      },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Get certificates error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch certificates',
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

