import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient, formatResponse } from '@/lib/api/supabase';
import { corsHeaders } from '@/lib/api/utils';

/**
 * GET /api/courses/[id]/plans
 * List course plans (segments) for a course. Public; used by portfolio for NCLEX etc.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = getSupabaseClient();
    const { id: courseId } = await params;
    const courseIdNum = parseInt(courseId, 10);
    if (Number.isNaN(courseIdNum)) {
      return NextResponse.json(
        formatResponse(false, null, 'Invalid course ID'),
        { status: 400, headers: corsHeaders }
      );
    }

    const { data: plans, error } = await supabase
      .from('course_plans')
      .select('id, course_id, plan_key, name, price, stripe_price_id, sort_order, description')
      .eq('course_id', courseIdNum)
      .order('sort_order', { ascending: true });

    if (error) {
      if (error.code === '42P01' || /relation.*does not exist/i.test(error.message || '')) {
        return NextResponse.json(
          formatResponse(true, [], 'No plans (table may not exist)'),
          { headers: corsHeaders }
        );
      }
      console.error('Plans fetch error:', error);
      return NextResponse.json(
        formatResponse(false, null, 'Failed to fetch plans'),
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      formatResponse(true, plans || [], 'Plans fetched successfully'),
      { headers: corsHeaders }
    );
  } catch (err: unknown) {
    console.error('Get course plans error:', err);
    return NextResponse.json(
      formatResponse(false, null, 'Failed to fetch plans'),
      { status: 500, headers: corsHeaders }
    );
  }
}
