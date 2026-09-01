import { NextRequest, NextResponse } from 'next/server';
import {requireAuth, isAdminRole } from '@/lib/api/auth';
import { getSupabaseClient, formatResponse } from '@/lib/api/supabase';
import { corsHeaders } from '@/lib/api/utils';

/**
 * GET /api/progress/admin/all
 * Get all students' progress data for admin dashboard
 * Includes real-time progress from enrollments and progress tracking tables
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

    // Only admins can access this endpoint
    if (!isAdminRole(authResult.user.role)) {
      return NextResponse.json(
        formatResponse(false, null, 'Access denied. Admin only.'),
        { status: 403, headers: corsHeaders }
      );
    }

    const supabase = getSupabaseClient();

    // Get all students
    const { data: students, error: studentsError } = await supabase
      .from('users')
      .select(`
        id,
        name,
        email,
        avatar,
        created_at,
        updated_at
      `)
      .eq('role', 'student')
      .order('created_at', { ascending: false });

    if (studentsError) {
      console.error('Error fetching students:', studentsError);
      return NextResponse.json(
        formatResponse(false, null, 'Failed to fetch students'),
        { status: 500, headers: corsHeaders }
      );
    }

    // Get all enrollments to fetch progress tracking data
    const { data: allEnrollments, error: enrollmentsError } = await supabase
      .from('enrollments')
      .select('id, student_id, course_id, progress, status, updated_at');

    if (enrollmentsError) {
      console.error('Error fetching enrollments:', enrollmentsError);
    }

    // Get progress tracking data for all enrollments
    const enrollmentIds = allEnrollments?.map(e => e.id) || [];
    
    // Get resource access data
    const { data: resourceAccess } = enrollmentIds.length > 0 ? await supabase
      .from('course_resource_access')
      .select('enrollment_id, time_spent_seconds, completed, last_accessed_at')
      .in('enrollment_id', enrollmentIds) : { data: null };

    // Get section progress
    const { data: sectionProgress } = enrollmentIds.length > 0 ? await supabase
      .from('course_section_progress')
      .select('enrollment_id, progress_percentage, resources_total, resources_accessed, resources_completed')
      .in('enrollment_id', enrollmentIds) : { data: null };

    // Get recent activity
    const { data: recentActivity } = enrollmentIds.length > 0 ? await supabase
      .from('course_activity_log')
      .select('enrollment_id, created_at, activity_type')
      .in('enrollment_id', enrollmentIds)
      .order('created_at', { ascending: false })
      .limit(1000) : { data: null };

    // Get trial progress (course_trial_progress) per enrollment
    const { data: trialProgress } = enrollmentIds.length > 0 ? await supabase
      .from('course_trial_progress')
      .select('enrollment_id, section_id, completed_at')
      .in('enrollment_id', enrollmentIds) : { data: null };

    // Get quiz attempts per enrollment
    const { data: quizAttempts } = enrollmentIds.length > 0 ? await supabase
      .from('course_quiz_attempts')
      .select('enrollment_id, quiz_identifier, score_percent, passed, total_questions, correct_count, attempted_at')
      .in('enrollment_id', enrollmentIds)
      .order('attempted_at', { ascending: false }) : { data: null };

    // Get enrollments with course data for all students
    const studentIds = (students || []).map(s => s.id);
    const { data: enrollmentsWithCourses, error: enrollmentsError2 } = studentIds.length > 0 ? await supabase
      .from('enrollments')
      .select(`
        id,
        student_id,
        course_id,
        progress,
        status,
        enrollment_date,
        completion_date,
        updated_at,
        grade,
        with_certificate,
        plan_id,
        courses (
          id,
          name,
          description
        ),
        course_plans (
          id,
          name,
          plan_key
        )
      `)
      .in('student_id', studentIds) : { data: null, error: null };

    if (enrollmentsError2) {
      console.error('Error fetching enrollments with courses:', enrollmentsError2);
    }

    // Group enrollments by student_id
    const enrollmentsByStudent = new Map<number, any[]>();
    (enrollmentsWithCourses || []).forEach(enrollment => {
      if (!enrollmentsByStudent.has(enrollment.student_id)) {
        enrollmentsByStudent.set(enrollment.student_id, []);
      }
      enrollmentsByStudent.get(enrollment.student_id)!.push(enrollment);
    });

    // Process students with their progress data
    const studentsWithProgress = (students || []).map(student => {
      const enrollments = enrollmentsByStudent.get(student.id) || [];
      
      // Calculate overall progress for each student
      const totalEnrollments = enrollments.length;
      const completedEnrollments = enrollments.filter(e => e.status === 'completed' || e.progress >= 100).length;
      const overallProgress = totalEnrollments > 0 
        ? Math.round((enrollments.reduce((sum, e) => sum + (e.progress || 0), 0) / totalEnrollments))
        : 0;

      // Get time spent from resource access
      const studentEnrollmentIds = enrollments.map(e => e.id);
      const studentResourceAccess = (resourceAccess || []).filter(ra => 
        studentEnrollmentIds.includes(ra.enrollment_id)
      );
      const totalTimeSpent = studentResourceAccess.reduce((sum, ra) => 
        sum + (ra.time_spent_seconds || 0), 0
      );

      // Get last activity
      const studentActivity = (recentActivity || []).filter(ra => 
        studentEnrollmentIds.includes(ra.enrollment_id)
      );
      const lastActivity = studentActivity.length > 0 
        ? studentActivity[0].created_at 
        : (enrollments.length > 0 ? enrollments[0].updated_at : student.updated_at);

      // Get current course (most recent active enrollment)
      const activeEnrollments = enrollments.filter(e => e.status === 'active');
      const currentCourse = activeEnrollments.length > 0 
        ? activeEnrollments[0].courses?.name || 'No Course Enrolled'
        : (enrollments.length > 0 ? enrollments[0].courses?.name || 'No Course Enrolled' : 'No Course Enrolled');

      // Trial progress and quiz attempts per enrollment
      const trialByEnrollment = new Map<number, string[]>();
      (trialProgress || []).forEach((row: { enrollment_id: number; section_id: string }) => {
        if (!trialByEnrollment.has(row.enrollment_id)) trialByEnrollment.set(row.enrollment_id, []);
        trialByEnrollment.get(row.enrollment_id)!.push(row.section_id);
      });
      const quizByEnrollment = new Map<number, Array<{ quiz_identifier: string; score_percent: number; passed: boolean; attempted_at: string }>>();
      (quizAttempts || []).forEach((row: { enrollment_id: number; quiz_identifier: string; score_percent: number; passed: boolean; attempted_at: string }) => {
        if (!quizByEnrollment.has(row.enrollment_id)) quizByEnrollment.set(row.enrollment_id, []);
        quizByEnrollment.get(row.enrollment_id)!.push({
          quiz_identifier: row.quiz_identifier,
          score_percent: row.score_percent,
          passed: row.passed,
          attempted_at: row.attempted_at,
        });
      });

      // Calculate unit progress for each enrollment
      const unitProgress = enrollments.map(enrollment => {
        const enrollmentSections = (sectionProgress || []).filter(sp => sp.enrollment_id === enrollment.id);
        const avgSectionProgress = enrollmentSections.length > 0
          ? Math.round(enrollmentSections.reduce((sum, sp) => sum + (sp.progress_percentage || 0), 0) / enrollmentSections.length)
          : enrollment.progress || 0;
        const trialSections = trialByEnrollment.get(enrollment.id) || [];
        const attempts = quizByEnrollment.get(enrollment.id) || [];

        return {
          name: enrollment.courses?.name || 'Unknown Course',
          progress: enrollment.progress || 0,
          status: enrollment.status === 'completed' || enrollment.progress >= 100 ? 'Completed' :
                 enrollment.progress > 0 ? 'In Progress' : 'Not Started',
          enrollmentId: enrollment.id,
          courseId: enrollment.course_id,
          trialSectionsCompleted: trialSections.length,
          trialSectionIds: trialSections,
          quizAttempts: attempts,
          grade: enrollment.grade ?? null,
        };
      });

      // Determine status
      let status = "On Track";
      if (overallProgress === 100 && totalEnrollments > 0) status = "Completed";
      else if (overallProgress < 30 && totalEnrollments > 0) status = "Behind Schedule";

      return {
        id: student.id,
        name: student.name,
        email: student.email,
        avatar: student.avatar || null,
        course: currentCourse,
        enrollmentDate: enrollments.length > 0 
          ? enrollments[0].enrollment_date || enrollments[0].created_at 
          : student.created_at,
        overallProgress,
        currentUnit: overallProgress === 100 && totalEnrollments > 0 
          ? "Course Completed" 
          : `${currentCourse} - In Progress`,
        unitsCompleted: completedEnrollments,
        totalUnits: totalEnrollments,
        lastActivity,
        timeSpent: Math.round(totalTimeSpent / 3600), // Convert to hours
        status,
        unitProgress,
        enrollments: enrollments.map((e: any) => {
          const planEmbed = e.course_plans;
          const planObj = Array.isArray(planEmbed) ? planEmbed[0] : planEmbed;
          const planName = typeof planObj?.name === 'string' ? planObj.name : null;
          const planKey = typeof planObj?.plan_key === 'string' ? planObj.plan_key : null;
          return {
            id: e.id,
            courseId: e.course_id,
            courseName: e.courses?.name || 'Unknown Course',
            progress: e.progress || 0,
            status: e.status,
            enrollmentDate: e.enrollment_date,
            completionDate: e.completion_date,
            updatedAt: e.updated_at,
            grade: e.grade ?? null,
            withCertificate: e.with_certificate === true || e.with_certificate === 'true',
            planId: e.plan_id ?? null,
            planName,
            planKey,
            trialSectionsCompleted: (trialByEnrollment.get(e.id) || []).length,
            trialSectionIds: trialByEnrollment.get(e.id) || [],
            quizAttempts: quizByEnrollment.get(e.id) || [],
          };
        })
      };
    });

    return NextResponse.json(
      formatResponse(true, studentsWithProgress, 'Progress data retrieved successfully'),
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Error getting admin progress data:', error);
    return NextResponse.json(
      formatResponse(false, null, error.message || 'Failed to get progress data'),
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}

