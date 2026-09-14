import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient, formatResponse, formatAuthError } from '@/lib/api/supabase';
import { requireAuth } from '@/lib/api/auth';
import { requireTenantScope } from '@/lib/api/tenant-scope';
import { corsHeaders, getPaginationParams } from '@/lib/api/utils';

/**
 * GET /api/courses
 * Get all courses with filtering and pagination
 * POST /api/courses
 * Create a new course
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
    const authResult = { authenticated: true as const, user: scope.user };

    const supabase = getSupabaseClient();
    const { page, limit, offset } = getPaginationParams(request);
    const params = new URL(request.url).searchParams;

    // Build query
    let query = supabase
      .from('courses')
      .select('*', { count: 'exact' });

    // Apply filters
    if (params.get('name')) {
      query = query.ilike('name', `%${params.get('name')}%`);
    }
    if (params.get('status')) {
      query = query.eq('status', params.get('status'));
    }
    if (params.get('course_status')) {
      query = query.eq('course_status', params.get('course_status'));
    }
    if (params.get('category')) {
      query = query.eq('category', parseInt(params.get('category') || '1'));
    }

    // Apply pagination
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (scope.tenantId) query = query.eq('tenant_id', scope.tenantId);
    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching courses:', error);
      return NextResponse.json(
        formatResponse(false, null, 'Failed to fetch courses'),
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      formatResponse(true, data || [], 'Courses fetched successfully', count || 0, page, limit),
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Get courses error:', error);
    return NextResponse.json(
      formatResponse(false, null, 'Failed to fetch courses'),
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
    const authResult = { authenticated: true as const, user: scope.user };

    const body = await request.json();
    const { 
      name, 
      description, 
      details,
      price, // Legacy field
      price_without_certificate, 
      price_with_certificate,
      discount,
      image_url, 
      status = 'active',
      course_status = 'live',
      category = 1,
      category_code,
      category_name,
      course_code,
      tags,
      features,
      curriculum,
      outcomes,
      requirements,
      rating,
      level,
      duration,
      deadline_months,
      trial_enabled,
      trial_duration_days,
      trial_link,
      content_folder,
      provider_logo_url,
      provider_name,
      listed_on_portfolio,
      partner_api_enabled,
    } = body;

    if (!name) {
      return NextResponse.json(
        formatResponse(false, null, 'Course name is required'),
        { status: 400, headers: corsHeaders }
      );
    }

    if (name.length > 500) {
      return NextResponse.json(
        formatResponse(false, null, 'Course name must be 500 characters or less'),
        { status: 400, headers: corsHeaders }
      );
    }

    const supabase = getSupabaseClient();

    // Prepare course data
    const courseData: any = {
      name,
      description: description || null,
      details: details || null,
      price_without_certificate: price_without_certificate ?? price ?? null,
      price_with_certificate: price_with_certificate ?? price_without_certificate ?? price ?? null,
      discount: discount || null,
      image_url: image_url || null,
      status,
      course_status,
      category: category || 1,
      category_code: category_code || null,
      category_name: category_name || null,
      course_code: course_code || null,
      tags: Array.isArray(tags) ? tags : [],
      features: Array.isArray(features) ? features : [],
      // Curriculum can be a string (HTML from Tiptap) or an array (legacy)
      curriculum: typeof curriculum === 'string' 
        ? (curriculum.trim() ? [curriculum.trim()] : [])
        : (Array.isArray(curriculum) ? curriculum : []),
      outcomes: Array.isArray(outcomes) ? outcomes : [],
      requirements: Array.isArray(requirements) ? requirements : [],
      rating: rating || 4.5,
      level: level || 'Self-Paced',
      duration: duration || 'Self-Paced',
      deadline_months: deadline_months || null,
      trial_enabled: trial_enabled !== undefined ? trial_enabled : false,
      trial_duration_days: trial_duration_days || (trial_enabled ? 7 : null),
      trial_link: trial_link || null,
      content_folder: content_folder?.trim() || null,
      provider_logo_url: provider_logo_url || null,
      provider_name: provider_name || null,
      listed_on_portfolio: listed_on_portfolio !== undefined ? !!listed_on_portfolio : true,
      partner_api_enabled: partner_api_enabled !== undefined ? !!partner_api_enabled : false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Auto-set duration and deadline for Category 2
    if (category === 2) {
      courseData.duration = 'Self-Paced';
      courseData.deadline_months = 3;
    }

    // Create course
    const { data: course, error } = await supabase
      .from('courses')
      .insert({ ...courseData, tenant_id: scope.tenantId })
      .select()
      .single();

    if (error) {
      console.error('Supabase error creating course:', error);
      return NextResponse.json(
        formatResponse(false, null, `Failed to create course: ${error.message}`),
        { status: 500, headers: corsHeaders }
      );
    }

    if (!course) {
      return NextResponse.json(
        formatResponse(false, null, 'Failed to create course: No data returned'),
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      formatResponse(true, course, 'Course created successfully'),
      { status: 201, headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Create course error:', error);
    return NextResponse.json(
      formatResponse(false, null, 'Failed to create course'),
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

