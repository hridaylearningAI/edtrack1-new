import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient, formatResponse, formatAuthError } from '@/lib/api/supabase';
import { requireAuth } from '@/lib/api/auth';
import { corsHeaders } from '@/lib/api/utils';

/**
 * POST /api/notifications/mark-read
 * Mark a notification as read for the current user
 * This creates a record in notification_reads table to track per-student read status
 */
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
    const { notification_id } = body;

    if (!notification_id) {
      return NextResponse.json(
        formatResponse(false, null, 'Notification ID is required', 0),
        { status: 400, headers: corsHeaders }
      );
    }

    const supabase = getSupabaseClient();
    const userId = authResult.user?.id;

    if (!userId) {
      return NextResponse.json(
        formatAuthError('User ID not found', 'USER_NOT_FOUND'),
        { status: 401, headers: corsHeaders }
      );
    }

    // Check if notification exists
    const { data: notification, error: notifError } = await supabase
      .from('notifications')
      .select('id, recipient_id')
      .eq('id', notification_id)
      .single();

    if (notifError || !notification) {
      return NextResponse.json(
        formatResponse(false, null, 'Notification not found', 0),
        { status: 404, headers: corsHeaders }
      );
    }

    // Verify user has access to this notification
    // Either it's for them specifically (recipient_id = userId) or it's a broadcast (recipient_id = null)
    if (notification.recipient_id !== null && notification.recipient_id !== userId) {
      return NextResponse.json(
        formatAuthError('You do not have access to this notification', 'FORBIDDEN'),
        { status: 403, headers: corsHeaders }
      );
    }

    // Insert or update read record (using ON CONFLICT to handle duplicates)
    const { data, error } = await supabase
      .from('notification_reads')
      .upsert(
        {
          notification_id: notification_id,
          user_id: userId,
          read_at: new Date().toISOString(),
        },
        {
          onConflict: 'notification_id,user_id',
          ignoreDuplicates: false,
        }
      )
      .select()
      .single();

    if (error) {
      console.error('Error marking notification as read:', error);
      return NextResponse.json(
        formatResponse(false, null, 'Failed to mark notification as read', 0),
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      formatResponse(true, data, 'Notification marked as read', 1),
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Error in POST /api/notifications/mark-read:', error);
    return NextResponse.json(
      formatResponse(false, null, error.message || 'Internal server error', 0),
      { status: 500, headers: corsHeaders }
    );
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}
