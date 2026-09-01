import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient, formatResponse, formatAuthError } from '@/lib/api/supabase';
import {requireAuth, isAdminRole } from '@/lib/api/auth';
import { corsHeaders } from '@/lib/api/utils';

/**
 * GET /api/trainers/[id]
 * Get a specific trainer by ID
 * PUT /api/trainers/[id]
 * Update a trainer
 * DELETE /api/trainers/[id]
 * Delete a trainer
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
      .from('trainers')
      .select('*')
      .eq('id', params.id)
      .single();

    if (error) {
      console.error('Error fetching trainer:', error);
      return NextResponse.json(
        formatResponse(false, null, 'Trainer not found', 0),
        { status: 404, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      formatResponse(true, data, 'Trainer fetched successfully', 1),
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Error in GET /api/trainers/[id]:', error);
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
      name, 
      email, 
      specialization, 
      experience, 
      status, 
      join_date, 
      avatar, 
      qualifications,
      courses_teaching,
      rating,
      students_assigned
    } = body;

    const supabase = getSupabaseClient();

    // If email is being updated, check for duplicates
    if (email) {
      const { data: existing } = await supabase
        .from('trainers')
        .select('id')
        .eq('email', email)
        .neq('id', params.id)
        .single();

      if (existing) {
        return NextResponse.json(
          formatResponse(false, null, 'Trainer with this email already exists', 0),
          { status: 409, headers: corsHeaders }
        );
      }
    }

    // Build update object
    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (email !== undefined) updates.email = email;
    if (specialization !== undefined) updates.specialization = specialization;
    if (experience !== undefined) updates.experience = experience;
    if (status !== undefined) updates.status = status;
    if (join_date !== undefined) updates.join_date = join_date;
    if (avatar !== undefined) updates.avatar = avatar;
    if (qualifications !== undefined) updates.qualifications = qualifications;
    if (courses_teaching !== undefined) updates.courses_teaching = courses_teaching;
    if (rating !== undefined) updates.rating = rating;
    if (students_assigned !== undefined) updates.students_assigned = students_assigned;

    const { data, error } = await supabase
      .from('trainers')
      .update(updates)
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating trainer:', error);
      return NextResponse.json(
        formatResponse(false, null, 'Failed to update trainer', 0),
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      formatResponse(true, data, 'Trainer updated successfully', 1),
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Error in PUT /api/trainers/[id]:', error);
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
      .from('trainers')
      .delete()
      .eq('id', params.id);

    if (error) {
      console.error('Error deleting trainer:', error);
      return NextResponse.json(
        formatResponse(false, null, 'Failed to delete trainer', 0),
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      formatResponse(true, null, 'Trainer deleted successfully', 0),
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Error in DELETE /api/trainers/[id]:', error);
    return NextResponse.json(
      formatResponse(false, null, error.message || 'Internal server error', 0),
      { status: 500, headers: corsHeaders }
    );
  }
}

