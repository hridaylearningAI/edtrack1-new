import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient, formatResponse, formatAuthError } from '@/lib/api/supabase';
import { requireAuth } from '@/lib/api/auth';
import { corsHeaders } from '@/lib/api/utils';

/**
 * GET /api/notifications/settings
 * Get notification settings for the current user or all users (admin)
 * POST /api/notifications/settings
 * Create or update notification settings
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (!authResult.authenticated) {
      return NextResponse.json(
        formatAuthError(authResult.error || 'Unauthorized', authResult.error_code || 'UNAUTHORIZED'),
        { status: 401, headers: corsHeaders }
      );
    }

    const supabase = getSupabaseClient();
    const params = new URL(request.url).searchParams;
    const userId = params.get('user_id');

    let query = supabase.from('notification_settings').select('*');

    // If user_id is provided, filter by it (admin can view any user's settings)
    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching notification settings:', error);
      return NextResponse.json(
        formatResponse(false, null, 'Failed to fetch notification settings', 0),
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      formatResponse(true, data || [], 'Notification settings fetched successfully', data?.length || 0),
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Error in GET /api/notifications/settings:', error);
    return NextResponse.json(
      formatResponse(false, null, error.message || 'Internal server error', 0),
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (!authResult.authenticated) {
      return NextResponse.json(
        formatAuthError(authResult.error || 'Unauthorized', authResult.error_code || 'UNAUTHORIZED'),
        { status: 401, headers: corsHeaders }
      );
    }

    const body = await request.json();
    const { user_id, category, email_enabled, push_enabled, sms_enabled } = body;

    if (!user_id || !category) {
      return NextResponse.json(
        formatResponse(false, null, 'user_id and category are required', 0),
        { status: 400, headers: corsHeaders }
      );
    }

    const supabase = getSupabaseClient();

    // Use upsert to create or update
    const { data, error } = await supabase
      .from('notification_settings')
      .upsert({
        user_id,
        category,
        email_enabled: email_enabled !== undefined ? email_enabled : true,
        push_enabled: push_enabled !== undefined ? push_enabled : true,
        sms_enabled: sms_enabled !== undefined ? sms_enabled : false,
      }, {
        onConflict: 'user_id,category'
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving notification settings:', error);
      return NextResponse.json(
        formatResponse(false, null, 'Failed to save notification settings', 0),
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      formatResponse(true, data, 'Notification settings saved successfully', 1),
      { status: 201, headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Error in POST /api/notifications/settings:', error);
    return NextResponse.json(
      formatResponse(false, null, error.message || 'Internal server error', 0),
      { status: 500, headers: corsHeaders }
    );
  }
}

