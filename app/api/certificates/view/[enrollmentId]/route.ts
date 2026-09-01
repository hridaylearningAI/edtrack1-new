import { NextRequest, NextResponse } from 'next/server';
import {requireAuth, isAdminRole } from '@/lib/api/auth';
import { getSupabaseClient } from '@/lib/api/supabase';
import { generateCertificatePDF, CertificateData } from '@/lib/services/certificateService';
import { corsHeaders } from '@/lib/api/utils';

/**
 * GET /api/certificates/view/[enrollmentId]
 * View/download certificate PDF for an enrollment
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ enrollmentId: string }> }
) {
  try {
    const authResult = await requireAuth(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401, headers: corsHeaders }
      );
    }

    const { enrollmentId: enrollmentIdParam } = await params;
    const enrollmentId = parseInt(enrollmentIdParam);
    if (isNaN(enrollmentId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid enrollment ID' },
        { status: 400, headers: corsHeaders }
      );
    }


    const supabase = getSupabaseClient();

    // First, check if enrollment exists and get its details
    // For students, also filter by student_id for security
    let enrollmentQuery = supabase
      .from('enrollments')
      .select(`
        *,
        courses (
          id,
          name,
          description
        )
      `)
      .eq('id', enrollmentId);

    // For students, filter by their own ID to ensure they can only access their enrollments
    if (authResult.user.role === 'student') {
      enrollmentQuery = enrollmentQuery.eq('student_id', authResult.user.id);
    }

    const { data: enrollment, error: enrollmentError } = await enrollmentQuery.maybeSingle();

    if (enrollmentError) {
      console.error('[Certificate View] Error fetching enrollment:', {
        enrollmentId,
        error: enrollmentError,
        userId: authResult.user.id,
        role: authResult.user.role
      });
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to fetch enrollment',
          details: enrollmentError.message 
        },
        { status: 500, headers: corsHeaders }
      );
    }

    if (!enrollment) {
      console.error('[Certificate View] Enrollment not found:', {
        enrollmentId,
        userId: authResult.user.id,
        role: authResult.user.role
      });
      return NextResponse.json(
        { 
          success: false, 
          error: 'Enrollment not found. It may not exist or you may not have access to it.',
          enrollmentId
        },
        { status: 404, headers: corsHeaders }
      );
    }

    // Double-check permissions (students can only view their own certificates)
    // This is redundant for students since we filter in the query, but kept for extra security
    if (!isAdminRole(authResult.user.role) && enrollment.student_id !== authResult.user.id) {
      console.error('[Certificate View] Permission denied:', {
        enrollmentId,
        enrollmentStudentId: enrollment.student_id,
        userId: authResult.user.id,
        role: authResult.user.role
      });
      return NextResponse.json(
        { success: false, error: 'Unauthorized to view this certificate' },
        { status: 403, headers: corsHeaders }
      );
    }


    // Get certificate if it exists
    const { data: certificate, error: certError } = await supabase
      .from('certificates')
      .select('*')
      .eq('enrollment_id', enrollmentId)
      .maybeSingle();

    if (certError) {
      console.error('Error fetching certificate:', certError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch certificate' },
        { status: 500, headers: corsHeaders }
      );
    }

    if (!certificate) {
      // Certificate doesn't exist yet - check if course should have one
      if (!enrollment.with_certificate) {
        return NextResponse.json(
          { success: false, error: 'This course does not offer a certificate' },
          { status: 404, headers: corsHeaders }
        );
      }
      
      // Certificate should exist but doesn't - might not be generated yet
      return NextResponse.json(
        { 
          success: false, 
          error: 'Certificate not found. It may not have been generated yet. Please try syncing your progress or contact support.',
          enrollmentId,
          enrollmentStatus: enrollment.status,
          enrollmentProgress: enrollment.progress
        },
        { status: 404, headers: corsHeaders }
      );
    }

    // Fetch user details separately since Supabase doesn't recognize the relationship
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, name, email')
      .eq('id', enrollment.student_id)
      .maybeSingle();

    if (userError) {
      console.error('[Certificate View] Error fetching user:', userError);
    }

    // Generate PDF using certificate data and enrollment details
    const certificateData: CertificateData = {
      studentName: userData?.name || 'Student',
      courseName: (enrollment.courses as any)?.name || 'Course',
      completionDate: certificate.issued_date || enrollment.completion_date || new Date().toISOString().split('T')[0],
      certificateNumber: certificate.certificate_number,
      grade: enrollment.grade || undefined,
    };

    const pdfBuffer = await generateCertificatePDF(certificateData);

    // Return PDF as response
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="certificate-${certificate.certificate_number}.pdf"`,
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error('View certificate error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to generate certificate',
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

