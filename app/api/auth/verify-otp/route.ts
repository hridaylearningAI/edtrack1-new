import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient, formatResponse } from '@/lib/api/supabase';
import { corsHeaders } from '@/lib/api/utils';

/**
 * POST /api/auth/verify-otp
 * Verify OTP code
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, code } = body;

    if (!email || !code) {
      return NextResponse.json(
        formatResponse(false, null, 'Email and OTP code are required'),
        { status: 400, headers: corsHeaders }
      );
    }

    const supabase = getSupabaseClient();

    // Find valid OTP
    const { data: otpRecord, error } = await supabase
      .from('otp_codes')
      .select('*')
      .eq('email', email)
      .eq('code', code)
      .eq('is_used', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !otpRecord) {
      return NextResponse.json(
        formatResponse(false, null, 'Invalid or expired OTP code'),
        { status: 400, headers: corsHeaders }
      );
    }

    // Mark OTP as used
    await supabase
      .from('otp_codes')
      .update({ is_used: true, used_at: new Date().toISOString() })
      .eq('id', otpRecord.id);

    // Check if user exists
    const { data: user } = await supabase
      .from('users')
      .select('id, email, name, role')
      .eq('email', email)
      .single();

    return NextResponse.json(
      formatResponse(
        true,
        {
          verified: true,
          user: user || null,
          is_new_user: !user,
        },
        'OTP verified successfully'
      ),
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Verify OTP error:', error);
    return NextResponse.json(
      formatResponse(false, null, 'Failed to verify OTP'),
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

