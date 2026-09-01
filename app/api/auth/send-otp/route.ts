import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient, formatResponse } from '@/lib/api/supabase';
import { corsHeaders } from '@/lib/api/utils';
import { Resend } from 'resend';

/**
 * POST /api/auth/send-otp
 * Send OTP to email for verification
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        formatResponse(false, null, 'Email is required'),
        { status: 400, headers: corsHeaders }
      );
    }

    const supabase = getSupabaseClient();

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);

    // Store OTP in database
    const { error: otpError } = await supabase
      .from('otp_codes')
      .insert({
        email,
        code: otp,
        expires_at: expiresAt.toISOString(),
        is_used: false,
        created_at: new Date().toISOString(),
      });

    if (otpError) {
      console.error('Error storing OTP:', otpError);
      return NextResponse.json(
        formatResponse(false, null, 'Failed to send OTP'),
        { status: 500, headers: corsHeaders }
      );
    }

    // Send OTP via email
    const resendApiKey = process.env.RESEND_API_KEY;
    if (resendApiKey) {
      try {
        const resend = new Resend(resendApiKey);
        await resend.emails.send({
          from: process.env.FROM_EMAIL || 'noreply@edtec.online',
          to: email,
          subject: 'Your EdTec Online Verification Code',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Your Verification Code</h2>
              <p>Your OTP code is: <strong style="font-size: 24px; letter-spacing: 4px;">${otp}</strong></p>
              <p>This code will expire in 10 minutes.</p>
              <p>If you didn't request this code, please ignore this email.</p>
            </div>
          `,
        });
      } catch (emailError) {
        console.error('Error sending OTP email:', emailError);
      }
    }

    const isDevelopment = process.env.NODE_ENV === 'development';
    
    return NextResponse.json(
      formatResponse(
        true,
        {
          message: 'OTP sent successfully',
          expires_in_minutes: 10,
          ...(isDevelopment && { otp }),
        },
        'OTP sent to your email'
      ),
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Send OTP error:', error);
    return NextResponse.json(
      formatResponse(false, null, 'Failed to send OTP'),
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

