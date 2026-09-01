import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth';
import { getSupabaseClient, formatResponse } from '@/lib/api/supabase';
import { corsHeaders } from '@/lib/api/utils';

/**
 * GET /api/progress/get-detailed?enrollmentId=X
 * Get detailed progress information for a student's enrollment
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json(
        formatResponse(false, null, 'Unauthorized'),
        { status: 401, headers: corsHeaders }
      );
    }

    const { searchParams } = new URL(request.url);
    const enrollmentId = searchParams.get('enrollmentId');
    const courseId = searchParams.get('courseId');
    const studentId = searchParams.get('studentId'); // For admin access

    if (!enrollmentId && !courseId) {
      return NextResponse.json(
        formatResponse(false, null, 'Missing required parameter: enrollmentId or courseId'),
        { status: 400, headers: corsHeaders }
      );
    }

    const supabase = getSupabaseClient();
    const isAdmin = authResult.user.role === 'admin';

    // Build query based on parameters
    let enrollmentQuery = supabase
      .from('enrollments')
      .select('id, student_id, course_id, progress, status');

    if (enrollmentId) {
      enrollmentQuery = enrollmentQuery.eq('id', parseInt(enrollmentId));
    } else if (courseId) {
      enrollmentQuery = enrollmentQuery.eq('course_id', parseInt(courseId));
      if (!isAdmin) {
        enrollmentQuery = enrollmentQuery.eq('student_id', authResult.user.id);
      } else if (studentId) {
        enrollmentQuery = enrollmentQuery.eq('student_id', parseInt(studentId));
      }
    }

    const { data: enrollments, error: enrollmentError } = await enrollmentQuery;

    if (enrollmentError || !enrollments || enrollments.length === 0) {
      return NextResponse.json(
        formatResponse(false, null, 'Enrollment not found'),
        { status: 404, headers: corsHeaders }
      );
    }

    // For non-admin users, ensure they can only access their own data
    if (!isAdmin) {
      const userEnrollments = enrollments.filter(e => e.student_id === authResult.user.id);
      if (userEnrollments.length === 0) {
        return NextResponse.json(
          formatResponse(false, null, 'Access denied'),
          { status: 403, headers: corsHeaders }
        );
      }
    }

    // Get detailed progress for each enrollment
    const detailedProgress = await Promise.all(
      enrollments.map(async (enrollment) => {
        // Get resource access data
        const { data: resourceAccess } = await supabase
          .from('course_resource_access')
          .select('*')
          .eq('enrollment_id', enrollment.id)
          .order('last_accessed_at', { ascending: false });

        // Get section progress
        const { data: sectionProgress } = await supabase
          .from('course_section_progress')
          .select('*')
          .eq('enrollment_id', enrollment.id)
          .order('section_number', { ascending: true });

        // Get recent activity
        const { data: recentActivity } = await supabase
          .from('course_activity_log')
          .select('*')
          .eq('enrollment_id', enrollment.id)
          .order('created_at', { ascending: false })
          .limit(50);

        // Calculate statistics
        const totalResources = resourceAccess?.length || 0;
        const completedResources = resourceAccess?.filter(r => r.completed).length || 0;
        const totalTimeSpent = resourceAccess?.reduce((sum, r) => sum + (r.time_spent_seconds || 0), 0) || 0;
        const uniqueResourcesAccessed = new Set(resourceAccess?.map(r => r.resource_id) || []).size;

        return {
          enrollment: {
            id: enrollment.id,
            student_id: enrollment.student_id,
            course_id: enrollment.course_id,
            progress: enrollment.progress,
            status: enrollment.status,
          },
          statistics: {
            totalResources,
            completedResources,
            totalTimeSpentSeconds: totalTimeSpent,
            totalTimeSpentFormatted: formatTime(totalTimeSpent),
            uniqueResourcesAccessed,
            completionRate: totalResources > 0 ? Math.round((completedResources / totalResources) * 100) : 0,
          },
          resourceAccess: resourceAccess || [],
          sectionProgress: sectionProgress || [],
          recentActivity: recentActivity || [],
        };
      })
    );

    return NextResponse.json(
      formatResponse(true, detailedProgress.length === 1 ? detailedProgress[0] : detailedProgress, 'Progress data retrieved'),
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Error getting detailed progress:', error);
    return NextResponse.json(
      formatResponse(false, null, error.message || 'Failed to get progress data'),
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * Helper function to format time in seconds to readable format
 */
function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}

