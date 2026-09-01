import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient, formatResponse, formatAuthError } from '@/lib/api/supabase';
import { requireAuth } from '@/lib/api/auth';
import { corsHeaders } from '@/lib/api/utils';

/**
 * POST /api/support/tickets/[id]/reply
 * Add a reply to a support ticket
 * Students can reply to their own tickets; admins can reply to any ticket (is_staff=true)
 */
export async function POST(
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
    const { message } = body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return NextResponse.json(
        formatResponse(false, null, 'Message is required'),
        { status: 400, headers: corsHeaders }
      );
    }

    const supabase = getSupabaseClient();
    const user = authResult.user;
    const isAdmin = user.role === 'admin';

    const { data: ticket, error: ticketError } = await supabase
      .from('support_tickets')
      .select('id, user_id, status')
      .eq('id', ticketId)
      .single();

    if (ticketError || !ticket) {
      return NextResponse.json(
        formatResponse(false, null, 'Ticket not found'),
        { status: 404, headers: corsHeaders }
      );
    }

    // Students can only reply to their own tickets; admins can reply to any
    if (!isAdmin && ticket.user_id !== user.id) {
      return NextResponse.json(
        formatAuthError('Forbidden', 'FORBIDDEN'),
        { status: 403, headers: corsHeaders }
      );
    }

    // Don't allow replies on closed tickets
    if (ticket.status === 'closed') {
      return NextResponse.json(
        formatResponse(false, null, 'Cannot reply to a closed ticket'),
        { status: 400, headers: corsHeaders }
      );
    }

    const { data: reply, error: insertError } = await supabase
      .from('support_ticket_replies')
      .insert({
        ticket_id: ticketId,
        user_id: user.id,
        message: message.trim(),
        is_staff: isAdmin,
      })
      .select('id, ticket_id, user_id, message, is_staff, created_at')
      .single();

    if (insertError) {
      console.error('Insert support ticket reply error:', insertError);
      return NextResponse.json(
        formatResponse(false, null, 'Failed to add reply'),
        { status: 500, headers: corsHeaders }
      );
    }

    // Update ticket's updated_at
    await supabase
      .from('support_tickets')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', ticketId);

    return NextResponse.json(
      formatResponse(true, reply, 'Reply added successfully'),
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Add support ticket reply error:', error);
    return NextResponse.json(
      formatResponse(false, null, 'Failed to add reply'),
      { status: 500, headers: corsHeaders }
    );
  }
}
