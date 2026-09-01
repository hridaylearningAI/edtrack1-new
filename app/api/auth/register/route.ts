import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient, formatResponse, formatAuthError } from '@/lib/api/supabase';
import { hashPassword } from '@/lib/api/auth';
import { corsHeaders } from '@/lib/api/utils';

/**
 * POST /api/auth/register
 * Register a new user
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name, role = 'student' } = body;

    if (!email || !password || !name) {
      return NextResponse.json(
        formatAuthError('Email, password, and name are required', 'MISSING_FIELDS'),
        { status: 400, headers: corsHeaders }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        formatAuthError('Password must be at least 6 characters', 'INVALID_PASSWORD'),
        { status: 400, headers: corsHeaders }
      );
    }

    const supabase = getSupabaseClient();

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return NextResponse.json(
        formatAuthError('User with this email already exists', 'USER_EXISTS'),
        { status: 409, headers: corsHeaders }
      );
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const { data: user, error: createError } = await supabase
      .from('users')
      .insert({
        email,
        name,
        role,
        password_hash: passwordHash,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (createError || !user) {
      console.error('Error creating user:', createError);
      return NextResponse.json(
        formatResponse(false, null, 'Failed to create user'),
        { status: 500, headers: corsHeaders }
      );
    }

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
      formatResponse(true, userResponse, 'User registered successfully'),
      { status: 201, headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Register error:', error);
    return NextResponse.json(
      formatResponse(false, null, 'Registration failed'),
      { status: 500, headers: corsHeaders }
    );
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

