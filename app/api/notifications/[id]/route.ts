import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient, formatResponse, formatAuthError } from '@/lib/api/supabase';
import { requireAuth } from '@/lib/api/auth';
import { corsHeaders } from '@/lib/api/utils';

/**
 * GET /api/notifications/[id]
 * Get a specific notification by ID
 * PUT /api/notifications/[id]
 * Update a notification (mark as sent, delivered, read, etc.)
 * DELETE /api/notifications/[id]
 * Delete a notification
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAuth(request);
    if (!authResult.authenticated) {
      return NextResponse.json(
        formatAuthError(authResult.error || 'Unauthorized', authResult.error_code || 'UNAUTHORIZED'),
        { status: 401, headers: corsHeaders }
      );
    }

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('id', params.id)
      .single();

    if (error) {
      console.error('Error fetching notification:', error);
      return NextResponse.json(
        formatResponse(false, null, 'Notification not found', 0),
        { status: 404, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      formatResponse(true, data, 'Notification fetched successfully', 1),
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Error in GET /api/notifications/[id]:', error);
    return NextResponse.json(
      formatResponse(false, null, error.message || 'Internal server error', 0),
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAuth(request);
    if (!authResult.authenticated) {
      return NextResponse.json(
        formatAuthError(authResult.error || 'Unauthorized', authResult.error_code || 'UNAUTHORIZED'),
        { status: 401, headers: corsHeaders }
      );
    }

    const body = await request.json();
    const { status, sent_at, delivered_at, read_at, ...otherUpdates } = body;

    const supabase = getSupabaseClient();

    // Build update object
    const updates: any = { ...otherUpdates };
    
    if (status) {
      updates.status = status;
      if (status === 'Sent' && !sent_at) {
        updates.sent_at = new Date().toISOString();
      }
      if (status === 'Delivered' && !delivered_at) {
        updates.delivered_at = new Date().toISOString();
      }
    }
    
    if (sent_at) updates.sent_at = sent_at;
    if (delivered_at) updates.delivered_at = delivered_at;
    if (read_at !== undefined) updates.read_at = read_at;

    const { data, error } = await supabase
      .from('notifications')
      .update(updates)
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating notification:', error);
      return NextResponse.json(
        formatResponse(false, null, 'Failed to update notification', 0),
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      formatResponse(true, data, 'Notification updated successfully', 1),
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Error in PUT /api/notifications/[id]:', error);
    return NextResponse.json(
      formatResponse(false, null, error.message || 'Internal server error', 0),
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAuth(request);
    if (!authResult.authenticated) {
      return NextResponse.json(
        formatAuthError(authResult.error || 'Unauthorized', authResult.error_code || 'UNAUTHORIZED'),
        { status: 401, headers: corsHeaders }
      );
    }

    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', params.id);

    if (error) {
      console.error('Error deleting notification:', error);
      return NextResponse.json(
        formatResponse(false, null, 'Failed to delete notification', 0),
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      formatResponse(true, null, 'Notification deleted successfully', 0),
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Error in DELETE /api/notifications/[id]:', error);
    return NextResponse.json(
      formatResponse(false, null, error.message || 'Internal server error', 0),
      { status: 500, headers: corsHeaders }
    );
  }
}

