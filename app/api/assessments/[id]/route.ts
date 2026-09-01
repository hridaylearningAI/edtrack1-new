import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient, formatResponse, formatAuthError } from '@/lib/api/supabase';
import {requireAuth, isAdminRole } from '@/lib/api/auth';
import { corsHeaders } from '@/lib/api/utils';

/**
 * GET /api/assessments/[id]
 * Get a specific assessment by ID
 * PUT /api/assessments/[id]
 * Update an assessment
 * DELETE /api/assessments/[id]
 * Delete an assessment
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
    if (!isAdminRole(authResult.user?.role)) {
      return NextResponse.json(
        formatResponse(false, null, 'Access denied. Admin only.', 0),
        { status: 403, headers: corsHeaders }
      )
    }

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('assessments')
      .select('*')
      .eq('id', params.id)
      .single();

    if (error) {
      console.error('Error fetching assessment:', error);
      return NextResponse.json(
        formatResponse(false, null, 'Assessment not found', 0),
        { status: 404, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      formatResponse(true, data, 'Assessment fetched successfully', 1),
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Error in GET /api/assessments/[id]:', error);
    return NextResponse.json(
      formatResponse(false, null, error.message || 'Internal server error', 0),
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
      status,
      students_attempted,
      average_score
    } = body;

    const supabase = getSupabaseClient();

    // If trainer_id is provided and trainer_name is not, fetch it
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

    // If course_id is provided and course_name is not, fetch it
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

    // Build update object
    const updates: any = {};
    if (title !== undefined) updates.title = title;
    if (course_id !== undefined) updates.course_id = course_id;
    if (finalCourseName !== undefined) updates.course_name = finalCourseName;
    if (trainer_id !== undefined) updates.trainer_id = trainer_id;
    if (finalTrainerName !== undefined) updates.trainer_name = finalTrainerName;
    if (type !== undefined) updates.type = type;
    if (duration !== undefined) updates.duration = duration;
    if (total_questions !== undefined) updates.total_questions = total_questions;
    if (passing_score !== undefined) updates.passing_score = passing_score;
    if (description !== undefined) updates.description = description;
    if (instructions !== undefined) updates.instructions = instructions;
    if (status !== undefined) updates.status = status;
    if (students_attempted !== undefined) updates.students_attempted = students_attempted;
    if (average_score !== undefined) updates.average_score = average_score;

    const { data, error } = await supabase
      .from('assessments')
      .update(updates)
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating assessment:', error);
      return NextResponse.json(
        formatResponse(false, null, 'Failed to update assessment', 0),
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      formatResponse(true, data, 'Assessment updated successfully', 1),
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Error in PUT /api/assessments/[id]:', error);
    return NextResponse.json(
      formatResponse(false, null, error.message || 'Internal server error', 0),
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
    if (!isAdminRole(authResult.user?.role)) {
      return NextResponse.json(
        formatResponse(false, null, 'Access denied. Admin only.', 0),
        { status: 403, headers: corsHeaders }
      )
    }

    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('assessments')
      .delete()
      .eq('id', params.id);

    if (error) {
      console.error('Error deleting assessment:', error);
      return NextResponse.json(
        formatResponse(false, null, 'Failed to delete assessment', 0),
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      formatResponse(true, null, 'Assessment deleted successfully', 0),
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Error in DELETE /api/assessments/[id]:', error);
    return NextResponse.json(
      formatResponse(false, null, error.message || 'Internal server error', 0),
      { status: 500, headers: corsHeaders }
    );
  }
}

