import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient, formatResponse, formatAuthError } from '@/lib/api/supabase';
import { comparePassword } from '@/lib/api/auth';
import { corsHeaders } from '@/lib/api/utils';

/**
 * POST /api/auth/login
 * Login with email and password
 */
export async function POST(request: NextRequest) {
  try {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return NextResponse.json({}, { headers: corsHeaders });
    }

    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        formatAuthError('Email and password are required', 'MISSING_CREDENTIALS'),
        { status: 400, headers: corsHeaders }
      );
    }

    const supabase = getSupabaseClient();

    // Find user by email
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        formatAuthError('Invalid email or password', 'INVALID_CREDENTIALS'),
        { status: 401, headers: corsHeaders }
      );
    }

    // Check if user has Clerk authentication (no password)
    if (user.clerk_user_id && !user.password_hash) {
      return NextResponse.json(
        formatAuthError('This account uses Clerk authentication. Please sign in using the Sign In button.', 'CLERK_AUTH_REQUIRED'),
        { status: 401, headers: corsHeaders }
      );
    }

    // Verify password
    if (!user.password_hash) {
      return NextResponse.json(
        formatAuthError('Password not set. Please use OTP flow.', 'PASSWORD_NOT_SET'),
        { status: 401, headers: corsHeaders }
      );
    }

    const passwordValid = await comparePassword(password, user.password_hash);

    if (!passwordValid) {
      return NextResponse.json(
        formatAuthError('Invalid email or password', 'INVALID_CREDENTIALS'),
        { status: 401, headers: corsHeaders }
      );
    }

    // Check if user is active
    if (user.status !== 'active') {
      return NextResponse.json(
        formatAuthError('Account is not active', 'ACCOUNT_INACTIVE'),
        { status: 401, headers: corsHeaders }
      );
    }

    // Create a simple token (in production, use JWT)
    // For now, we'll use a token format that can be verified
    const accessToken = `token_${user.id}_${Date.now()}`;

    // Prepare user response (exclude password hash)
    const userResponse = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
      avatar: user.avatar,
      created_at: user.created_at,
      updated_at: user.updated_at,
    };

    return NextResponse.json(
      formatResponse(true, {
        access_token: accessToken,
        token_type: 'bearer',
        user: userResponse,
      }, 'Login successful'),
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      formatResponse(false, null, 'Login failed'),
      { status: 500, headers: corsHeaders }
    );
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

