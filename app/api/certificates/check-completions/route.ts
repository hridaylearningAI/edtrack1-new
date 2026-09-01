import { NextRequest, NextResponse } from 'next/server';
import {requireAuth, isAdminRole } from '@/lib/api/auth';
import { getSupabaseClient } from '@/lib/api/supabase';
import { generateCertificatePDF, generateCertificateNumber, generateCertificateEmailHTML, CertificateData } from '@/lib/services/certificateService';
import { Resend } from 'resend';
import { corsHeaders } from '@/lib/api/utils';

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * POST /api/certificates/check-completions
 * Check for enrollments at 100% progress that should be marked as completed
 * and generate certificates if needed
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

    // Only admins can trigger this check
    if (!isAdminRole(authResult.user.role)) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403, headers: corsHeaders }
      );
    }

    const supabase = getSupabaseClient();

    // Find enrollments at 100% progress but not marked as completed
    const { data: incompleteEnrollments, error: fetchError } = await supabase
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
          email
        )
      `)
      .eq('progress', 100)
      .neq('status', 'completed')
      .eq('with_certificate', true);

    if (fetchError) {
      throw fetchError;
    }

    if (!incompleteEnrollments || incompleteEnrollments.length === 0) {
      return NextResponse.json(
        {
          success: true,
          message: 'No enrollments found that need completion marking',
          data: [],
        },
        { headers: corsHeaders }
      );
    }

    const results = [];

    for (const enrollment of incompleteEnrollments) {
      try {
        // Mark as completed
        const completionDate = new Date().toISOString().split('T')[0];
        
        await supabase
          .from('enrollments')
          .update({
            status: 'completed',
            completion_date: completionDate,
          })
          .eq('id', enrollment.id);

        // Check if certificate already exists
        const { data: existingCert } = await supabase
          .from('certificates')
          .select('id')
          .eq('enrollment_id', enrollment.id)
          .maybeSingle();

        if (!existingCert) {
          // Generate certificate
          const certificateNumber = generateCertificateNumber(enrollment.id);

          const certificateData: CertificateData = {
            studentName: (enrollment.users as any)?.name || 'Student',
            courseName: (enrollment.courses as any)?.name || 'Course',
            completionDate,
            certificateNumber,
            grade: enrollment.grade || undefined,
          };

          // Generate PDF
          const pdfBuffer = await generateCertificatePDF(certificateData);
          const certificateUrl = `/api/certificates/view/${enrollment.id}`;

          // Save certificate
          const { data: certificate } = await supabase
            .from('certificates')
            .insert({
              enrollment_id: enrollment.id,
              student_id: enrollment.student_id,
              course_id: enrollment.course_id,
              certificate_number: certificateNumber,
              certificate_url: certificateUrl,
              certificate_pdf_url: certificateUrl,
              issued_date: completionDate,
            })
            .select()
            .single();

          // Send email if certificate was created
          if (certificate && process.env.RESEND_API_KEY) {
            const studentEmail = (enrollment.users as any)?.email;
            if (studentEmail) {
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

                await supabase
                  .from('certificates')
                  .update({
                    email_sent: true,
                    email_sent_at: new Date().toISOString(),
                  })
                  .eq('id', certificate.id);
              } catch (emailError) {
                console.error('Error sending certificate email:', emailError);
              }
            }
          }

          results.push({
            enrollmentId: enrollment.id,
            courseName: (enrollment.courses as any)?.name,
            studentName: (enrollment.users as any)?.name,
            certificateGenerated: true,
            certificateNumber,
          });
        } else {
          results.push({
            enrollmentId: enrollment.id,
            courseName: (enrollment.courses as any)?.name,
            studentName: (enrollment.users as any)?.name,
            certificateGenerated: false,
            message: 'Certificate already exists',
          });
        }
      } catch (error: any) {
        console.error(`Error processing enrollment ${enrollment.id}:`, error);
        results.push({
          enrollmentId: enrollment.id,
          error: error.message || 'Unknown error',
        });
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: `Processed ${results.length} enrollments`,
        data: results,
      },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Check completions error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to check completions',
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

