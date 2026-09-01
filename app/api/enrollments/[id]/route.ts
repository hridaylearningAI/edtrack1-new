import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient, formatResponse, formatAuthError } from '@/lib/api/supabase';
import {requireAuth, isAdminRole } from '@/lib/api/auth';
import { corsHeaders } from '@/lib/api/utils';

/**
 * GET /api/enrollments/[id]
 * Get enrollment by ID
 * PUT /api/enrollments/[id]
 * Update enrollment
 * DELETE /api/enrollments/[id]
 * Delete enrollment
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth(request);
    if (!authResult.authenticated) {
      return NextResponse.json(
        formatAuthError(authResult.error || 'Unauthorized', authResult.error_code || 'UNAUTHORIZED'),
        { status: 401, headers: corsHeaders }
      );
    }

    const supabase = getSupabaseClient();
    const { id } = await params;
    const enrollmentId = id;

    const { data: enrollment, error } = await supabase
      .from('enrollments')
      .select('*')
      .eq('id', enrollmentId)
      .single();

    if (error || !enrollment) {
      return NextResponse.json(
        formatResponse(false, null, 'Enrollment not found'),
        { status: 404, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      formatResponse(true, enrollment, 'Enrollment fetched successfully'),
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Get enrollment error:', error);
    return NextResponse.json(
      formatResponse(false, null, 'Failed to fetch enrollment'),
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth(request);
    if (!authResult.authenticated) {
      return NextResponse.json(
        formatAuthError(authResult.error || 'Unauthorized', authResult.error_code || 'UNAUTHORIZED'),
        { status: 401, headers: corsHeaders }
      );
    }

    const body = await request.json();
    const { id } = await params;
    const enrollmentId = id;
    const supabase = getSupabaseClient();

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (body.status !== undefined) updateData.status = body.status;
    if (body.progress !== undefined) updateData.progress = body.progress;
    if (body.completion_date !== undefined) updateData.completion_date = body.completion_date;

    // Only admins can update with_certificate (upgrade/degrade certificate)
    if (body.with_certificate !== undefined && authResult.user.role === 'admin') {
      updateData.with_certificate = !!body.with_certificate;
    }

    const { data: enrollment, error } = await supabase
      .from('enrollments')
      .update(updateData)
      .eq('id', enrollmentId)
      .select()
      .single();

    if (error || !enrollment) {
      return NextResponse.json(
        formatResponse(false, null, 'Enrollment not found or update failed'),
        { status: 404, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      formatResponse(true, enrollment, 'Enrollment updated successfully'),
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Update enrollment error:', error);
    return NextResponse.json(
      formatResponse(false, null, 'Failed to update enrollment'),
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth(request);
    if (!authResult.authenticated) {
      return NextResponse.json(
        formatAuthError(authResult.error || 'Unauthorized', authResult.error_code || 'UNAUTHORIZED'),
        { status: 401, headers: corsHeaders }
      );
    }

    // Only admins can delete (unenroll) — students cannot remove their own or others' enrollments via this API
    if (!isAdminRole(authResult.user.role)) {
      return NextResponse.json(
        formatResponse(false, null, 'Only admins can unenroll students'),
        { status: 403, headers: corsHeaders }
      );
    }

    const { id } = await params;
    const enrollmentId = id;
    const supabase = getSupabaseClient();

    const { error } = await supabase
      .from('enrollments')
      .delete()
      .eq('id', enrollmentId);

    if (error) {
      console.error('Error deleting enrollment:', error);
      return NextResponse.json(
        formatResponse(false, null, 'Failed to delete enrollment'),
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      formatResponse(true, null, 'Enrollment deleted successfully'),
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Delete enrollment error:', error);
    return NextResponse.json(
      formatResponse(false, null, 'Failed to delete enrollment'),
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

