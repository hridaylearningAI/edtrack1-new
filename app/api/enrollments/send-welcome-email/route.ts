import { NextRequest, NextResponse } from 'next/server';
import {requireAuth, isAdminRole } from '@/lib/api/auth';
import { formatResponse } from '@/lib/api/supabase';
import { corsHeaders } from '@/lib/api/utils';
import { Resend } from 'resend';
import { getSupabaseClient } from '@/lib/api/supabase';

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * POST /api/enrollments/send-welcome-email
 * Send welcome email to student with login credentials after enrollment
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

    // Only admins can send welcome emails
    if (!isAdminRole(authResult.user.role)) {
      return NextResponse.json(
        formatResponse(false, null, 'Access denied. Admin only.'),
        { status: 403, headers: corsHeaders }
      );
    }

    const body = await request.json();
    const { enrollmentId, studentId, courseId, studentEmail, studentName, courseName } = body;

    if (!enrollmentId || !studentId || !studentEmail || !courseName) {
      return NextResponse.json(
        formatResponse(false, null, 'Missing required fields: enrollmentId, studentId, studentEmail, courseName'),
        { status: 400, headers: corsHeaders }
      );
    }

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        formatResponse(false, null, 'Email service not configured'),
        { status: 500, headers: corsHeaders }
      );
    }

    const supabase = getSupabaseClient();

    // Get student information
    const { data: student, error: studentError } = await supabase
      .from('users')
      .select('id, email, name')
      .eq('id', studentId)
      .single();

    if (studentError || !student) {
      return NextResponse.json(
        formatResponse(false, null, 'Student not found'),
        { status: 404, headers: corsHeaders }
      );
    }

    // Get enrollment information
    const { data: enrollment, error: enrollmentError } = await supabase
      .from('enrollments')
      .select('*, courses(name)')
      .eq('id', enrollmentId)
      .single();

    if (enrollmentError || !enrollment) {
      return NextResponse.json(
        formatResponse(false, null, 'Enrollment not found'),
        { status: 404, headers: corsHeaders }
      );
    }

    // Generate temporary password for student login
    const tempPassword = `EdTec${Math.random().toString(36).slice(-8)}!${Date.now().toString(36).slice(-4)}`;
    const portalUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to EdTec Online</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">Welcome to EdTec Online!</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Your Enrollment is Complete</p>
        </div>
        
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #333; margin-top: 0;">Hello ${studentName || 'Student'}!</h2>
          
          <p>Congratulations! Your enrollment in <strong>${courseName}</strong> has been successfully completed.</p>
          
          <div style="background: #e8f5e9; border-left: 4px solid #4caf50; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0;"><strong>✅ Enrollment Details:</strong></p>
            <ul style="margin: 5px 0 0 0; padding-left: 20px;">
              <li>Course: <strong>${courseName}</strong></li>
              <li>Enrollment ID: <strong>#${enrollmentId}</strong></li>
              <li>Enrollment Date: <strong>${new Date(enrollment.enrollment_date || new Date()).toLocaleDateString()}</strong></li>
            </ul>
          </div>

          <h3 style="color: #333; margin-top: 30px;">Your Login Credentials</h3>
          
          <div style="background: white; border: 2px solid #667eea; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <p style="margin: 0 0 15px 0; font-weight: bold; color: #667eea;">Student Portal Login:</p>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 10px; font-weight: bold; color: #667eea; width: 120px;">Email:</td>
                <td style="padding: 10px; font-family: monospace; font-size: 16px;">${studentEmail}</td>
              </tr>
              <tr>
                <td style="padding: 10px; font-weight: bold; color: #667eea;">Temporary Password:</td>
                <td style="padding: 10px; font-family: monospace; font-size: 18px; color: #d32f2f; font-weight: bold; letter-spacing: 2px;">
                  ${tempPassword}
                </td>
              </tr>
            </table>
          </div>

          <div style="background: #e7f3ff; border-left: 4px solid #2196F3; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0;"><strong>🔐 Important Security Information:</strong></p>
            <ul style="margin: 5px 0 0 0; padding-left: 20px;">
              <li>This is a temporary password. Please change it after your first login.</li>
              <li>Keep your credentials secure and do not share them with anyone.</li>
              <li>If you forget your password, use the "Forgot Password" link on the login page.</li>
            </ul>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${portalUrl}/login" 
               style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
              Login to Student Portal
            </a>
          </div>

          <h3 style="color: #333; margin-top: 30px;">Next Steps:</h3>
          <ol style="color: #666;">
            <li>Log in to the student portal using your email and temporary password</li>
            <li>Change your password to something secure and memorable</li>
            <li>Open your enrolled course and start learning!</li>
          </ol>

          <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0;"><strong>💡 Need Help?</strong></p>
            <p style="margin: 5px 0 0 0;">If you have any questions or need assistance, please contact our support team. We're here to help you succeed!</p>
          </div>
          
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          
          <p style="color: #666; font-size: 12px; margin: 0;">
            This is an automated email from EdTec Online Student Management System.<br>
            If you did not enroll in this course, please contact support immediately.
          </p>
        </div>
      </body>
      </html>
    `;

    const { data, error } = await resend.emails.send({
      from: process.env.FROM_EMAIL || 'noreply@edtec.online',
      to: studentEmail,
      subject: `Welcome to EdTec Online - Your Enrollment in ${courseName} is Complete!`,
      html: emailHtml,
    });

    if (error) {
      console.error('Resend error:', error);
      return NextResponse.json(
        formatResponse(false, null, 'Failed to send welcome email'),
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      formatResponse(true, { 
        emailId: data?.id,
        tempPassword,
        courseId: courseId ?? null,
      }, 'Welcome email sent successfully'),
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Error sending welcome email:', error);
    return NextResponse.json(
      formatResponse(false, null, error.message || 'Failed to send welcome email'),
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
