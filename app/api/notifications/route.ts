import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient, formatResponse, formatAuthError } from '@/lib/api/supabase';
import { requireAuth } from '@/lib/api/auth';
import { corsHeaders, getPaginationParams } from '@/lib/api/utils';

/**
 * GET /api/notifications
 * Get all notifications with filtering and pagination
 * POST /api/notifications
 * Create a new notification
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
    const { page, limit, offset } = getPaginationParams(request);
    const params = new URL(request.url).searchParams;

    // Build query
    // For student queries, we need to join with notification_reads to check read status
    const userId = authResult.userId;
    let query = supabase
      .from('notifications')
      .select('*', { count: 'exact' });
    
    // If we have a user ID, we can optionally join with notification_reads
    // For now, we'll fetch read status separately in the hook

    // Apply filters
    if (params.get('status')) {
      query = query.eq('status', params.get('status'));
    }
    if (params.get('type')) {
      query = query.eq('type', params.get('type'));
    }
    if (params.get('priority')) {
      query = query.eq('priority', params.get('priority'));
    }
    if (params.get('recipient_id')) {
      const recipientId = params.get('recipient_id');
      // Support special value 'null' to fetch broadcast notifications
      if (recipientId === 'null') {
        query = query.is('recipient_id', null);
      } else {
        query = query.eq('recipient_id', recipientId);
      }
    }
    // Support include_broadcast parameter to include null recipient_id notifications
    if (params.get('include_broadcast') === 'true' && params.get('recipient_id')) {
      // This will be handled by OR logic - we'll fetch both in the hook instead
      // For now, we'll handle this client-side
    }

    // Apply pagination
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching notifications:', error);
      return NextResponse.json(
        formatResponse(false, null, 'Failed to fetch notifications', 0),
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      formatResponse(true, data || [], 'Notifications fetched successfully', count || 0, page, limit),
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Error in GET /api/notifications:', error);
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
    const { title, message, type, priority, recipient_id, recipient_name, recipient_email, delivery_method, metadata } = body;

    // Validation
    if (!title || !message) {
      return NextResponse.json(
        formatResponse(false, null, 'Title and message are required', 0),
        { status: 400, headers: corsHeaders }
      );
    }

    const supabase = getSupabaseClient();

    // If recipient_id is provided, fetch user details
    let finalRecipientName = recipient_name;
    let finalRecipientEmail = recipient_email;

    if (recipient_id && (!recipient_name || !recipient_email)) {
      const { data: user } = await supabase
        .from('users')
        .select('name, email')
        .eq('id', recipient_id)
        .single();

      if (user) {
        finalRecipientName = user.name;
        finalRecipientEmail = user.email;
      }
    }

    // Create notification
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        title,
        message,
        type: type || 'General',
        priority: priority || 'Medium',
        recipient_id: recipient_id || null,
        recipient_name: finalRecipientName || null,
        recipient_email: finalRecipientEmail || null,
        delivery_method: delivery_method || 'Email',
        status: 'Pending',
        metadata: metadata || null,
        created_by: authResult.userId || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating notification:', error);
      return NextResponse.json(
        formatResponse(false, null, 'Failed to create notification', 0),
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      formatResponse(true, data, 'Notification created successfully', 1),
      { status: 201, headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Error in POST /api/notifications:', error);
    return NextResponse.json(
      formatResponse(false, null, error.message || 'Internal server error', 0),
      { status: 500, headers: corsHeaders }
    );
  }
}

