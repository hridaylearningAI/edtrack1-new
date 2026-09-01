import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient, formatResponse, formatAuthError } from '@/lib/api/supabase';
import { requireAuth, requireCourseAccess } from '@/lib/api/auth';
import { corsHeaders } from '@/lib/api/utils';

/**
 * GET /api/courses/[id]
 * Get course by ID
 * PUT /api/courses/[id]
 * Update course
 * DELETE /api/courses/[id]
 * Delete course
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
    const { id: courseId } = await params;
    const courseIdNum = parseInt(courseId, 10);

    // Students must be enrolled to access course details (content_folder etc.)
    if (!Number.isNaN(courseIdNum)) {
      const access = await requireCourseAccess(request, courseIdNum);
      if (!access.allowed) {
        return NextResponse.json(
          formatAuthError(access.error ?? 'Access denied', 'FORBIDDEN'),
          { status: access.status, headers: corsHeaders }
        );
      }
    }

    const { data: course, error } = await supabase
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .single();

    if (error || !course) {
      return NextResponse.json(
        formatResponse(false, null, 'Course not found'),
        { status: 404, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      formatResponse(true, course, 'Course fetched successfully'),
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Get course error:', error);
    return NextResponse.json(
      formatResponse(false, null, 'Failed to fetch course'),
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
    const { id: courseId } = await params;
    const supabase = getSupabaseClient();

    // Validate name length if provided
    if (body.name !== undefined) {
      if (body.name.length > 500) {
        return NextResponse.json(
          formatResponse(false, null, 'Course name must be 500 characters or less'),
          { status: 400, headers: corsHeaders }
        );
      }
    }

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    // VET Provider fields (category 7)
    if (body.provider_logo_url !== undefined) updateData.provider_logo_url = body.provider_logo_url || null;
    if (body.provider_name !== undefined) updateData.provider_name = body.provider_name || null;

    // Basic fields
    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.details !== undefined) updateData.details = body.details;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.course_status !== undefined) updateData.course_status = body.course_status;
    
    // Pricing fields
    if (body.price !== undefined) updateData.price = body.price; // Legacy
    // Handle null values explicitly to allow clearing price fields
    if (body.price_without_certificate !== undefined) {
      updateData.price_without_certificate = body.price_without_certificate === null ? null : body.price_without_certificate;
    }
    if (body.price_with_certificate !== undefined) {
      updateData.price_with_certificate = body.price_with_certificate === null ? null : body.price_with_certificate;
    }
    if (body.discount !== undefined) updateData.discount = body.discount;
    
    // Category fields
    if (body.category !== undefined) {
      updateData.category = body.category;
      // Auto-set duration and deadline for Category 2
      if (body.category === 2) {
        updateData.duration = 'Self-Paced';
        updateData.deadline_months = 3;
      }
    }
    if (body.category_code !== undefined) updateData.category_code = body.category_code;
    if (body.category_name !== undefined) updateData.category_name = body.category_name;
    if (body.course_code !== undefined) updateData.course_code = body.course_code;
    
    // Enhanced fields - ensure arrays are properly formatted
    // Always update these fields if provided (even if empty array)
    if (body.tags !== undefined) {
      updateData.tags = Array.isArray(body.tags) ? body.tags : [];
    }
    if (body.features !== undefined) {
      updateData.features = Array.isArray(body.features) ? body.features : [];
    }
    // Curriculum can be a string (HTML from Tiptap) or an array (legacy)
    if (body.curriculum !== undefined) {
      if (typeof body.curriculum === 'string') {
        // Store HTML string as a single-element array for backward compatibility
        // Empty string means clear the curriculum
        const trimmed = body.curriculum.trim();
        updateData.curriculum = trimmed ? [trimmed] : [];
      } else if (Array.isArray(body.curriculum)) {
        updateData.curriculum = body.curriculum;
      } else {
        updateData.curriculum = [];
      }
    }
    if (body.outcomes !== undefined) {
      updateData.outcomes = Array.isArray(body.outcomes) ? body.outcomes : [];
    }
    if (body.requirements !== undefined) {
      updateData.requirements = Array.isArray(body.requirements) ? body.requirements : [];
    }
    if (body.image_url !== undefined) updateData.image_url = body.image_url;
    if (body.rating !== undefined) updateData.rating = body.rating;
    if (body.level !== undefined) updateData.level = body.level;
    if (body.duration !== undefined) updateData.duration = body.duration;
    if (body.deadline_months !== undefined) updateData.deadline_months = body.deadline_months;
    
    // Trial fields
    if (body.trial_enabled !== undefined) updateData.trial_enabled = body.trial_enabled;
    if (body.trial_duration_days !== undefined) updateData.trial_duration_days = body.trial_duration_days;
    if (body.trial_link !== undefined) updateData.trial_link = body.trial_link || null;
    if (body.content_folder !== undefined) updateData.content_folder = body.content_folder?.trim() || null;
    if (body.listed_on_portfolio !== undefined) updateData.listed_on_portfolio = !!body.listed_on_portfolio;
    if (body.partner_api_enabled !== undefined) updateData.partner_api_enabled = !!body.partner_api_enabled;

    const { data: course, error } = await supabase
      .from('courses')
      .update(updateData)
      .eq('id', courseId)
      .select()
      .single();

    if (error) {
      console.error('Supabase error updating course:', error);
      return NextResponse.json(
        formatResponse(false, null, `Update failed: ${error.message}`),
        { status: 500, headers: corsHeaders }
      );
    }

    if (!course) {
      return NextResponse.json(
        formatResponse(false, null, 'Course not found'),
        { status: 404, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      formatResponse(true, course, 'Course updated successfully'),
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Update course error:', error);
    return NextResponse.json(
      formatResponse(false, null, 'Failed to update course'),
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

    const { id: courseId } = await params;
    const supabase = getSupabaseClient();

    const { error } = await supabase
      .from('courses')
      .delete()
      .eq('id', courseId);

    if (error) {
      console.error('Error deleting course:', error);
      return NextResponse.json(
        formatResponse(false, null, 'Failed to delete course'),
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      formatResponse(true, null, 'Course deleted successfully'),
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Delete course error:', error);
    return NextResponse.json(
      formatResponse(false, null, 'Failed to delete course'),
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

