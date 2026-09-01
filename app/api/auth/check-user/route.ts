import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient, formatResponse } from '@/lib/api/supabase';
import { corsHeaders } from '@/lib/api/utils';

/**
 * POST /api/auth/check-user
 * Check if user exists by email
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

    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, name, role, password_hash, clerk_user_id')
      .eq('email', email)
      .single();

    if (error || !user) {
      return NextResponse.json(
        formatResponse(true, {
          exists: false,
          message: 'User not found. Sending verification code to your email.',
          requires_otp: true,
        }, 'User check completed'),
        { headers: corsHeaders }
      );
    }

    // User exists
    return NextResponse.json(
      formatResponse(true, {
        exists: true,
        user_id: user.id,
        message: user.password_hash 
          ? 'User exists. Please enter your password.'
          : 'User exists. Please use OTP flow.',
        requires_otp: !user.password_hash,
        has_password: !!user.password_hash,
        has_clerk: !!user.clerk_user_id,
      }, 'User check completed'),
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Check user error:', error);
    return NextResponse.json(
      formatResponse(false, null, 'Failed to check user'),
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

