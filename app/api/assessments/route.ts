import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient, formatResponse, formatAuthError } from '@/lib/api/supabase';
import {requireAuth, isAdminRole } from '@/lib/api/auth';
import { corsHeaders, getPaginationParams } from '@/lib/api/utils';

/**
 * GET /api/assessments
 * Get all assessments with filtering and pagination
 * POST /api/assessments
 * Create a new assessment
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
    if (!isAdminRole(authResult.user?.role)) {
      return NextResponse.json(
        formatResponse(false, null, 'Access denied. Admin only.', 0),
        { status: 403, headers: corsHeaders }
      )
    }

    const supabase = getSupabaseClient();
    const { page, limit, offset } = getPaginationParams(request);
    const params = new URL(request.url).searchParams;

    // Build query
    let query = supabase
      .from('assessments')
      .select('*', { count: 'exact' });

    // Apply filters
    if (params.get('status')) {
      query = query.eq('status', params.get('status'));
    }
    if (params.get('type')) {
      query = query.eq('type', params.get('type'));
    }
    if (params.get('trainer_id')) {
      query = query.eq('trainer_id', params.get('trainer_id'));
    }
    if (params.get('course_id')) {
      query = query.eq('course_id', params.get('course_id'));
    }
    if (params.get('title')) {
      query = query.ilike('title', `%${params.get('title')}%`);
    }

    // Apply pagination
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching assessments:', error);
      return NextResponse.json(
        formatResponse(false, null, 'Failed to fetch assessments', 0),
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      formatResponse(true, data || [], 'Assessments fetched successfully', count || 0, page, limit),
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Error in GET /api/assessments:', error);
    return NextResponse.json(
      formatResponse(false, null, error.message || 'Internal server error', 0),
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
    if (!isAdminRole(authResult.user?.role)) {
      return NextResponse.json(
        formatResponse(false, null, 'Access denied. Admin only.', 0),
        { status: 403, headers: corsHeaders }
      )
    }

    const body = await request.json();
    const { 
      title,
      course_id,
      course_name,
      trainer_id,
      trainer_name,
      type,
      duration,
      total_questions,
      passing_score,
      description,
      instructions,
      status
    } = body;

    // Validation
    if (!title || !type) {
      return NextResponse.json(
        formatResponse(false, null, 'Title and type are required', 0),
        { status: 400, headers: corsHeaders }
      );
    }

    const supabase = getSupabaseClient();

    // If trainer_id is provided, fetch trainer name
    let finalTrainerName = trainer_name;
    if (trainer_id && !trainer_name) {
      const { data: trainer } = await supabase
        .from('trainers')
        .select('name')
        .eq('id', trainer_id)
        .single();

      if (trainer) {
        finalTrainerName = trainer.name;
      }
    }

    // If course_id is provided, fetch course name
    let finalCourseName = course_name;
    if (course_id && !course_name) {
      const { data: course } = await supabase
        .from('courses')
        .select('title')
        .eq('id', course_id)
        .single();

      if (course) {
        finalCourseName = course.title;
      }
    }

    // Create assessment
    const { data, error } = await supabase
      .from('assessments')
      .insert({
        title,
        course_id: course_id || null,
        course_name: finalCourseName || null,
        trainer_id: trainer_id || null,
        trainer_name: finalTrainerName || null,
        type,
        duration: duration || null,
        total_questions: total_questions || 0,
        passing_score: passing_score || 0,
        description: description || null,
        instructions: instructions || null,
        status: status || 'Draft',
        students_attempted: 0,
        average_score: 0.0,
        created_by: authResult.userId || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating assessment:', error);
      return NextResponse.json(
        formatResponse(false, null, 'Failed to create assessment', 0),
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      formatResponse(true, data, 'Assessment created successfully', 1),
      { status: 201, headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Error in POST /api/assessments:', error);
    return NextResponse.json(
      formatResponse(false, null, error.message || 'Internal server error', 0),
      { status: 500, headers: corsHeaders }
    );
  }
}

