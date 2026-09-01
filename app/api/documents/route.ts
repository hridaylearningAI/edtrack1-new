import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient, formatResponse, formatAuthError } from '@/lib/api/supabase';
import { requireAuth } from '@/lib/api/auth';
import { corsHeaders, getPaginationParams } from '@/lib/api/utils';

/**
 * GET /api/documents
 * Get all documents with filtering and pagination
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

    // Build query
    let query = supabase
      .from('documents')
      .select('*', { count: 'exact' });

    // Apply filters
    if (params.get('student_id')) {
      query = query.eq('student_id', params.get('student_id'));
    }
    if (params.get('document_type')) {
      query = query.eq('document_type', params.get('document_type'));
    }
    if (params.get('status')) {
      query = query.eq('status', params.get('status'));
    }

    // Apply pagination
    query = query
      .order('uploaded_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching documents:', error);
      return NextResponse.json(
        formatResponse(false, null, 'Failed to fetch documents'),
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      formatResponse(true, data || [], 'Documents fetched successfully', count || 0, page, limit),
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Get documents error:', error);
    return NextResponse.json(
      formatResponse(false, null, 'Failed to fetch documents'),
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

