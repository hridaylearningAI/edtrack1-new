import { NextRequest, NextResponse } from 'next/server';
import {requireAuth, isAdminRole } from '@/lib/api/auth';
import { formatResponse } from '@/lib/api/supabase';
import { corsHeaders } from '@/lib/api/utils';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * POST /api/enrollments/send-payment-email
 * Send payment link email to student
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

    // Only admins can send payment emails
    if (!isAdminRole(authResult.user.role)) {
      return NextResponse.json(
        formatResponse(false, null, 'Access denied. Admin only.'),
        { status: 403, headers: corsHeaders }
      );
    }

    const body = await request.json();
    const { studentEmail, studentName, courseName, paymentUrl, amount } = body;

    if (!studentEmail || !paymentUrl || !courseName) {
      return NextResponse.json(
        formatResponse(false, null, 'Missing required fields: studentEmail, paymentUrl, courseName'),
        { status: 400, headers: corsHeaders }
      );
    }

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        formatResponse(false, null, 'Email service not configured'),
        { status: 500, headers: corsHeaders }
      );
    }

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Complete Your Enrollment Payment</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">EdTec Online</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Complete Your Enrollment</p>
        </div>
        
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #333; margin-top: 0;">Payment Required for Enrollment</h2>
          
          <p>Hello ${studentName || 'Student'},</p>
          
          <p>Thank you for your interest in enrolling in <strong>${courseName}</strong>.</p>
          
          <p>To complete your enrollment, please complete the payment using the secure payment link below:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${paymentUrl}" 
               style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
              Complete Payment${amount ? ` - $${amount}` : ''}
            </a>
          </div>
          
          <div style="background: #e7f3ff; border-left: 4px solid #2196F3; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0;"><strong>Important:</strong></p>
            <ul style="margin: 5px 0 0 0; padding-left: 20px;">
              <li>This payment link is valid for 24 hours</li>
              <li>Your enrollment will be activated automatically upon successful payment</li>
              <li>You will receive a confirmation email once payment is completed</li>
            </ul>
          </div>
          
          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            If you have any questions or need assistance, please contact our support team.
          </p>
          
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          
          <p style="color: #666; font-size: 12px; margin: 0;">
            This is an automated email from EdTec Online Student Management System.<br>
            If you did not initiate this enrollment, please ignore this email.
          </p>
        </div>
      </body>
      </html>
    `;

    const { data, error } = await resend.emails.send({
      from: process.env.FROM_EMAIL || 'noreply@edtec.online',
      to: studentEmail,
      subject: `Complete Your Enrollment Payment - ${courseName}`,
      html: emailHtml,
    });

    if (error) {
      console.error('Resend error:', error);
      return NextResponse.json(
        formatResponse(false, null, 'Failed to send email'),
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      formatResponse(true, { emailId: data?.id }, 'Payment email sent successfully'),
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Error sending payment email:', error);
    return NextResponse.json(
      formatResponse(false, null, error.message || 'Failed to send payment email'),
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

