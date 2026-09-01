import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth';
import { getSupabaseClient } from '@/lib/api/supabase';
import { generateCertificatePDF, generateCertificateNumber, generateCertificateEmailHTML, CertificateData } from '@/lib/services/certificateService';
import { Resend } from 'resend';
import { corsHeaders } from '@/lib/api/utils';

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * POST /api/certificates/generate
 * Generate a certificate for a completed course enrollment
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401, headers: corsHeaders }
      );
    }

    const supabase = getSupabaseClient();
    const { enrollmentId } = await request.json();

    if (!enrollmentId) {
      return NextResponse.json(
        { success: false, error: 'Enrollment ID is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Get enrollment details
    const { data: enrollment, error: enrollmentError } = await supabase
      .from('enrollments')
      .select(`
        *,
        courses (
          id,
          name,
          description
        ),
        users (
          id,
          name,
          email,
          clerk_id
        )
      `)
      .eq('id', enrollmentId)
      .maybeSingle();

    if (enrollmentError || !enrollment) {
      return NextResponse.json(
        { success: false, error: 'Enrollment not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    // Check if enrollment is completed
    if (enrollment.status !== 'completed') {
      return NextResponse.json(
        { success: false, error: 'Course must be completed before generating certificate' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Check if certificate already exists
    const { data: existingCertificate } = await supabase
      .from('certificates')
      .select('*')
      .eq('enrollment_id', enrollmentId)
      .maybeSingle();

    if (existingCertificate) {
      return NextResponse.json(
        {
          success: true,
          message: 'Certificate already exists',
          data: existingCertificate,
        },
        { headers: corsHeaders }
      );
    }

    // Generate certificate number
    const certificateNumber = generateCertificateNumber(enrollmentId);

    // Prepare certificate data
    const certificateData: CertificateData = {
      studentName: (enrollment.users as any)?.name || 'Student',
      courseName: (enrollment.courses as any)?.name || 'Course',
      completionDate: enrollment.completion_date || enrollment.updated_at || new Date().toISOString().split('T')[0],
      certificateNumber,
      grade: enrollment.grade || undefined,
    };

    // Generate PDF
    const pdfBuffer = await generateCertificatePDF(certificateData);

    // Convert to base64 for storage (in production, you'd upload to S3/Cloudinary/etc.)
    const pdfBase64 = pdfBuffer.toString('base64');
    const pdfDataUrl = `data:application/pdf;base64,${pdfBase64}`;

    // For now, we'll store the certificate data and generate on-demand
    // In production, upload PDF to cloud storage and store the URL
    const certificateUrl = `/api/certificates/view/${enrollmentId}`;

    // Save certificate to database
    const { data: certificate, error: certError } = await supabase
      .from('certificates')
      .insert({
        enrollment_id: enrollmentId,
        student_id: enrollment.student_id,
        course_id: enrollment.course_id,
        certificate_number: certificateNumber,
        certificate_url: certificateUrl,
        certificate_pdf_url: certificateUrl,
        issued_date: certificateData.completionDate,
      })
      .select()
      .single();

    if (certError) {
      console.error('Error saving certificate:', certError);
      return NextResponse.json(
        { success: false, error: 'Failed to save certificate' },
        { status: 500, headers: corsHeaders }
      );
    }

    // Send email with certificate
    const studentEmail = (enrollment.users as any)?.email;
    if (studentEmail && process.env.RESEND_API_KEY) {
      try {
        const emailHtml = generateCertificateEmailHTML(certificateData, certificateUrl);
        
        await resend.emails.send({
          from: process.env.FROM_EMAIL || 'noreply@edtec.online',
          to: studentEmail,
          subject: `🎓 Your Certificate for ${certificateData.courseName}`,
          html: emailHtml,
          attachments: [
            {
              filename: `certificate-${certificateNumber}.pdf`,
              content: pdfBuffer,
            },
          ],
        });

        // Update certificate to mark email as sent
        await supabase
          .from('certificates')
          .update({
            email_sent: true,
            email_sent_at: new Date().toISOString(),
          })
          .eq('id', certificate.id);
      } catch (emailError: any) {
        console.error('Error sending certificate email:', emailError);
        // Don't fail the request if email fails
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Certificate generated and sent successfully',
        data: certificate,
      },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Generate certificate error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to generate certificate',
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

