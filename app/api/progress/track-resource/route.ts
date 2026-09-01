import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth';
import { getSupabaseClient, formatResponse } from '@/lib/api/supabase';
import { corsHeaders } from '@/lib/api/utils';

/**
 * POST /api/progress/track-resource
 * Track when a student accesses a course resource/file
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json(
        formatResponse(false, null, 'Unauthorized'),
        { status: 401, headers: corsHeaders }
      );
    }

    const body = await request.json();
    const {
      enrollmentId,
      courseId,
      resourceId,
      resourceName,
      resourceType,
      resourceUrl,
      timeSpentSeconds = 0,
      markCompleted = false,
    } = body;

    // Validation
    if (!enrollmentId || !courseId || !resourceId || !resourceName || !resourceType) {
      return NextResponse.json(
        formatResponse(false, null, 'Missing required fields: enrollmentId, courseId, resourceId, resourceName, resourceType'),
        { status: 400, headers: corsHeaders }
      );
    }

    const supabase = getSupabaseClient();

    // Verify enrollment belongs to the authenticated user
    const { data: enrollment, error: enrollmentError } = await supabase
      .from('enrollments')
      .select('id, student_id, course_id')
      .eq('id', enrollmentId)
      .eq('student_id', authResult.user.id)
      .eq('course_id', courseId)
      .single();

    if (enrollmentError || !enrollment) {
      return NextResponse.json(
        formatResponse(false, null, 'Enrollment not found or access denied'),
        { status: 404, headers: corsHeaders }
      );
    }

    // Check if resource access already exists
    const { data: existingAccess } = await supabase
      .from('course_resource_access')
      .select('*')
      .eq('enrollment_id', enrollmentId)
      .eq('resource_id', resourceId)
      .maybeSingle();

    if (existingAccess) {
      // Update existing access record
      const updateData: any = {
        access_count: existingAccess.access_count + 1,
        last_accessed_at: new Date().toISOString(),
        time_spent_seconds: existingAccess.time_spent_seconds + (timeSpentSeconds || 0),
        updated_at: new Date().toISOString(),
      };

      if (markCompleted && !existingAccess.completed) {
        updateData.completed = true;
        updateData.completed_at = new Date().toISOString();
      }

      const { data: updatedAccess, error: updateError } = await supabase
        .from('course_resource_access')
        .update(updateData)
        .eq('id', existingAccess.id)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      // Update section progress
      await updateSectionProgress(enrollmentId, enrollment.course_id, authResult.user.id);

      // Log activity
      await logActivity(enrollmentId, authResult.user.id, courseId, 'resource_access', {
        resourceId,
        resourceName,
        resourceType,
        action: 'accessed',
      });

      return NextResponse.json(
        formatResponse(true, updatedAccess, 'Resource access updated'),
        { headers: corsHeaders }
      );
    } else {
      // Create new access record
      const newAccess = {
        enrollment_id: enrollmentId,
        student_id: authResult.user.id,
        course_id: courseId,
        resource_id: resourceId,
        resource_name: resourceName,
        resource_type: resourceType,
        resource_url: resourceUrl || null,
        access_count: 1,
        time_spent_seconds: timeSpentSeconds || 0,
        completed: markCompleted || false,
        completed_at: markCompleted ? new Date().toISOString() : null,
      };

      const { data: createdAccess, error: createError } = await supabase
        .from('course_resource_access')
        .insert(newAccess)
        .select()
        .single();

      if (createError) {
        throw createError;
      }

      // Update section progress
      await updateSectionProgress(enrollmentId, enrollment.course_id, authResult.user.id);

      // Log activity
      await logActivity(enrollmentId, authResult.user.id, courseId, 'resource_access', {
        resourceId,
        resourceName,
        resourceType,
        action: 'first_access',
      });

      return NextResponse.json(
        formatResponse(true, createdAccess, 'Resource access recorded'),
        { headers: corsHeaders }
      );
    }
  } catch (error: any) {
    console.error('Error tracking resource access:', error);
    return NextResponse.json(
      formatResponse(false, null, error.message || 'Failed to track resource access'),
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * Helper function to update section progress
 */
async function updateSectionProgress(
  enrollmentId: number,
  courseId: number,
  studentId: number
) {
  const supabase = getSupabaseClient();

  // Get resource access counts
  const { data: resourceAccess } = await supabase
    .from('course_resource_access')
    .select('resource_id, resource_type, completed')
    .eq('enrollment_id', enrollmentId);

  if (!resourceAccess || resourceAccess.length === 0) return;

  const totalResources = resourceAccess.length;
  const completedResources = resourceAccess.filter(r => r.completed).length;
  const progressPercentage = totalResources > 0 ? Math.round((completedResources / totalResources) * 100) : 0;

  // Update overall enrollment progress
  await supabase
    .from('enrollments')
    .update({
      progress: progressPercentage,
      updated_at: new Date().toISOString(),
    })
    .eq('id', enrollmentId);
}

/**
 * Helper function to log activity
 */
async function logActivity(
  enrollmentId: number,
  studentId: number,
  courseId: number,
  activityType: string,
  activityDetails: any
) {
  const supabase = getSupabaseClient();

  await supabase
    .from('course_activity_log')
    .insert({
      enrollment_id: enrollmentId,
      student_id: studentId,
      course_id: courseId,
      activity_type: activityType,
      activity_details: activityDetails,
    });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}

