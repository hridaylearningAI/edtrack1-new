import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient, formatResponse, formatAuthError } from '@/lib/api/supabase';
import { hashPassword } from '@/lib/api/auth';
import { corsHeaders } from '@/lib/api/utils';

/**
 * POST /api/auth/setup-password
 * Setup password for new user or update password for existing user
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name, role = 'student' } = body;

    if (!email || !password) {
      return NextResponse.json(
        formatAuthError('Email and password are required', 'MISSING_FIELDS'),
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

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      // Update password for existing user
      const { error: updateError } = await supabase
        .from('users')
        .update({
          password_hash: hashedPassword,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingUser.id);

      if (updateError) {
        console.error('Error updating password:', updateError);
        return NextResponse.json(
          formatResponse(false, null, 'Failed to update password'),
          { status: 500, headers: corsHeaders }
        );
      }

      return NextResponse.json(
        formatResponse(true, {
          user_id: existingUser.id,
          message: 'Password updated successfully',
        }, 'Password setup completed'),
        { headers: corsHeaders }
      );
    }

    // Create new user
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert({
        email,
        name: name || email.split('@')[0],
        password_hash: hashedPassword,
        role,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (createError || !newUser) {
      console.error('Error creating user:', createError);
      return NextResponse.json(
        formatResponse(false, null, 'Failed to create user'),
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      formatResponse(true, {
        user_id: newUser.id,
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          role: newUser.role,
        },
        message: 'Password setup completed',
      }, 'User created successfully'),
      { status: 201, headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Setup password error:', error);
    return NextResponse.json(
      formatResponse(false, null, 'Failed to setup password'),
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

