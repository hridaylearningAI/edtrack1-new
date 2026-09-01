import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient, formatResponse, formatAuthError } from '@/lib/api/supabase';
import { requireAuth } from '@/lib/api/auth';
import { corsHeaders } from '@/lib/api/utils';

/**
 * GET /api/support/tickets/[id]
 * Get a single support ticket with replies
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth(request);
    if (!authResult.authenticated) {
      return NextResponse.json(
        formatAuthError(authResult.error || 'Unauthorized', authResult.error_code || 'UNAUTHORIZED'),
        { status: 401, headers: corsHeaders }
      );
    }

    const { id } = await params;
    const ticketId = parseInt(id, 10);
    if (isNaN(ticketId)) {
      return NextResponse.json(
        formatResponse(false, null, 'Invalid ticket ID'),
        { status: 400, headers: corsHeaders }
      );
    }

    const supabase = getSupabaseClient();
    const user = authResult.user;
    const isAdmin = user.role === 'admin';

    const { data: ticket, error: ticketError } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('id', ticketId)
      .single();

    if (ticketError || !ticket) {
      return NextResponse.json(
        formatResponse(false, null, 'Ticket not found'),
        { status: 404, headers: corsHeaders }
      );
    }

    // Students can only view their own tickets
    if (!isAdmin && ticket.user_id !== user.id) {
      return NextResponse.json(
        formatAuthError('Forbidden', 'FORBIDDEN'),
        { status: 403, headers: corsHeaders }
      );
    }

    // Fetch replies
    const { data: replies } = await supabase
      .from('support_ticket_replies')
      .select('id, user_id, message, is_staff, created_at')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });

    return NextResponse.json(
      formatResponse(true, { ...ticket, replies: replies || [] }, null),
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Get support ticket error:', error);
    return NextResponse.json(
      formatResponse(false, null, 'Failed to fetch ticket'),
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * PUT /api/support/tickets/[id]
 * Update ticket (status) - admins only for status changes, students cannot update
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth(request);
    if (!authResult.authenticated) {
      return NextResponse.json(
        formatAuthError(authResult.error || 'Unauthorized', authResult.error_code || 'UNAUTHORIZED'),
        { status: 401, headers: corsHeaders }
      );
    }

    const { id } = await params;
    const ticketId = parseInt(id, 10);
    if (isNaN(ticketId)) {
      return NextResponse.json(
        formatResponse(false, null, 'Invalid ticket ID'),
        { status: 400, headers: corsHeaders }
      );
    }

    const body = await request.json();
    const { status } = body;

    const supabase = getSupabaseClient();
    const user = authResult.user;
    const isAdmin = user.role === 'admin';

    const { data: existing } = await supabase
      .from('support_tickets')
      .select('id, user_id, status')
      .eq('id', ticketId)
      .single();

    if (!existing) {
      return NextResponse.json(
        formatResponse(false, null, 'Ticket not found'),
        { status: 404, headers: corsHeaders }
      );
    }

    // Only admins can update ticket status
    if (!isAdmin) {
      return NextResponse.json(
        formatAuthError('Only admins can update ticket status', 'FORBIDDEN'),
        { status: 403, headers: corsHeaders }
      );
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (status && ['open', 'in_progress', 'resolved', 'closed'].includes(status)) {
      updates.status = status;
    }

    const { data: updated, error } = await supabase
      .from('support_tickets')
      .update(updates)
      .eq('id', ticketId)
      .select()
      .single();

    if (error) {
      console.error('Update support ticket error:', error);
      return NextResponse.json(
        formatResponse(false, null, 'Failed to update ticket'),
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      formatResponse(true, updated, 'Ticket updated successfully'),
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Update support ticket error:', error);
    return NextResponse.json(
      formatResponse(false, null, 'Failed to update ticket'),
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * DELETE /api/support/tickets/[id]
 * Delete ticket - admins only, or the ticket owner
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth(request);
    if (!authResult.authenticated) {
      return NextResponse.json(
        formatAuthError(authResult.error || 'Unauthorized', authResult.error_code || 'UNAUTHORIZED'),
        { status: 401, headers: corsHeaders }
      );
    }

    const { id } = await params;
    const ticketId = parseInt(id, 10);
    if (isNaN(ticketId)) {
      return NextResponse.json(
        formatResponse(false, null, 'Invalid ticket ID'),
        { status: 400, headers: corsHeaders }
      );
    }

    const supabase = getSupabaseClient();
    const user = authResult.user;
    const isAdmin = user.role === 'admin';

    const { data: existing } = await supabase
      .from('support_tickets')
      .select('id, user_id')
      .eq('id', ticketId)
      .single();

    if (!existing) {
      return NextResponse.json(
        formatResponse(false, null, 'Ticket not found'),
        { status: 404, headers: corsHeaders }
      );
    }

    if (!isAdmin && existing.user_id !== user.id) {
      return NextResponse.json(
        formatAuthError('Forbidden', 'FORBIDDEN'),
        { status: 403, headers: corsHeaders }
      );
    }

    const { error } = await supabase
      .from('support_tickets')
      .delete()
      .eq('id', ticketId);

    if (error) {
      console.error('Delete support ticket error:', error);
      return NextResponse.json(
        formatResponse(false, null, 'Failed to delete ticket'),
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      formatResponse(true, null, 'Ticket deleted successfully'),
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Delete support ticket error:', error);
    return NextResponse.json(
      formatResponse(false, null, 'Failed to delete ticket'),
      { status: 500, headers: corsHeaders }
    );
  }
}
