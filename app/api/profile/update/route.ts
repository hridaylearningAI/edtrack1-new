import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient, formatResponse, formatAuthError } from '@/lib/api/supabase';
import { requireAuth } from '@/lib/api/auth';
import { corsHeaders } from '@/lib/api/utils';

/**
 * PUT /api/profile/update
 * Update current authenticated user's profile
 */
export async function PUT(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (!authResult.authenticated) {
      return NextResponse.json(
        formatAuthError(authResult.error || 'Unauthorized', authResult.error_code || 'UNAUTHORIZED'),
        { status: 401, headers: corsHeaders }
      );
    }

    const body = await request.json();
    const supabase = getSupabaseClient();
    const userId = authResult.user.id; // Database user ID from requireAuth

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    // Only update fields that exist in users table
    if (body.name !== undefined) updateData.name = body.name;
    if (body.email !== undefined) updateData.email = body.email;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.avatar !== undefined) updateData.avatar = body.avatar;
    // Note: phone, address, date_of_birth, grade, enrollment_date don't exist in users table

    const { data: user, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single();

    if (error || !user) {
      console.error('Update profile error:', error);
      return NextResponse.json(
        formatResponse(false, null, 'Failed to update profile'),
        { status: 404, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      formatResponse(true, user, 'Profile updated successfully'),
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Update profile error:', error);
    return NextResponse.json(
      formatResponse(false, null, 'Failed to update profile'),
      { status: 500, headers: corsHeaders }
    );
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

