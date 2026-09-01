import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient, formatResponse, formatAuthError } from '@/lib/api/supabase';
import { requireAuth } from '@/lib/api/auth';
import { corsHeaders } from '@/lib/api/utils';

/**
 * GET /api/notifications/read-status
 * Get read status for notifications for the current user
 * Returns a map of notification_id -> read_at timestamp
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
    const userId = authResult.user?.id;
    const params = new URL(request.url).searchParams;
    const notificationIds = params.get('notification_ids');

    if (!userId) {
      return NextResponse.json(
        formatAuthError('User ID not found', 'USER_NOT_FOUND'),
        { status: 401, headers: corsHeaders }
      );
    }

    let query = supabase
      .from('notification_reads')
      .select('notification_id, read_at')
      .eq('user_id', userId);

    // If specific notification IDs are provided, filter by them
    if (notificationIds) {
      const ids = notificationIds.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
      if (ids.length > 0) {
        query = query.in('notification_id', ids);
      }
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching read status:', error);
      return NextResponse.json(
        formatResponse(false, null, 'Failed to fetch read status', 0),
        { status: 500, headers: corsHeaders }
      );
    }

    // Convert to a map for easier lookup: { notification_id: read_at }
    const readStatusMap: Record<number, string> = {};
    if (data) {
      data.forEach((read: any) => {
        readStatusMap[read.notification_id] = read.read_at;
      });
    }

    return NextResponse.json(
      formatResponse(true, readStatusMap, 'Read status fetched successfully', Object.keys(readStatusMap).length),
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Error in GET /api/notifications/read-status:', error);
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
