import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient, formatResponse, formatAuthError } from '@/lib/api/supabase';
import { requireAuth } from '@/lib/api/auth';
import { corsHeaders } from '@/lib/api/utils';

/**
 * GET /api/admin/course-distribution — list courses with distribution flags
 * PATCH /api/admin/course-distribution — bulk update { updates: [{ id, listed_on_portfolio?, partner_api_enabled? }] }
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (!authResult.authenticated) {
      return NextResponse.json(
        formatAuthError(authResult.error || 'Unauthorized', authResult.error_code || 'UNAUTHORIZED'),
        { status: 401, headers: corsHeaders },
      );
    }

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('courses')
      .select(
        'id, name, course_code, status, course_status, category_name, listed_on_portfolio, partner_api_enabled, updated_at',
      )
      .order('name', { ascending: true });

    if (error) {
      console.error('course-distribution GET:', error);
      return NextResponse.json(
        formatResponse(false, null, 'Failed to fetch courses'),
        { status: 500, headers: corsHeaders },
      );
    }

    return NextResponse.json(
      formatResponse(true, data || [], 'Course distribution loaded'),
      { headers: corsHeaders },
    );
  } catch (error: unknown) {
    console.error('course-distribution GET error:', error);
    return NextResponse.json(
      formatResponse(false, null, 'Failed to fetch course distribution'),
      { status: 500, headers: corsHeaders },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (!authResult.authenticated) {
      return NextResponse.json(
        formatAuthError(authResult.error || 'Unauthorized', authResult.error_code || 'UNAUTHORIZED'),
        { status: 401, headers: corsHeaders },
      );
    }

    const body = await request.json();
    const updates = Array.isArray(body?.updates) ? body.updates : [];
    if (updates.length === 0) {
      return NextResponse.json(
        formatResponse(false, null, 'updates array is required'),
        { status: 400, headers: corsHeaders },
      );
    }

    const supabase = getSupabaseClient();
    const results: unknown[] = [];

    for (const row of updates) {
      const id = Number(row?.id);
      if (!Number.isFinite(id)) continue;

      const patch: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      if (row.listed_on_portfolio !== undefined) {
        patch.listed_on_portfolio = !!row.listed_on_portfolio;
      }
      if (row.partner_api_enabled !== undefined) {
        patch.partner_api_enabled = !!row.partner_api_enabled;
      }

      const { data, error } = await supabase
        .from('courses')
        .update(patch)
        .eq('id', id)
        .select('id, name, listed_on_portfolio, partner_api_enabled')
        .single();

      if (error) {
        console.error(`course-distribution PATCH id=${id}:`, error);
        continue;
      }
      results.push(data);
    }

    return NextResponse.json(
      formatResponse(true, results, `Updated ${results.length} course(s)`),
      { headers: corsHeaders },
    );
  } catch (error: unknown) {
    console.error('course-distribution PATCH error:', error);
    return NextResponse.json(
      formatResponse(false, null, 'Failed to update course distribution'),
      { status: 500, headers: corsHeaders },
    );
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}
