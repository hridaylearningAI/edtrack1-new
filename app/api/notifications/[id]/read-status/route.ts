import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient, formatResponse, formatAuthError } from '@/lib/api/supabase';
import { requireAuth } from '@/lib/api/auth';
import { corsHeaders } from '@/lib/api/utils';

/**
 * GET /api/notifications/[id]/read-status
 * Get read status for a specific notification
 * Returns list of students who have read it and who haven't
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
    const notificationId = parseInt(params.id);

    if (isNaN(notificationId)) {
      return NextResponse.json(
        formatResponse(false, null, 'Invalid notification ID', 0),
        { status: 400, headers: corsHeaders }
      );
    }

    // Get the notification to check if it's a broadcast
    const { data: notification, error: notifError } = await supabase
      .from('notifications')
      .select('id, recipient_id, recipient_name')
      .eq('id', notificationId)
      .single();

    if (notifError || !notification) {
      return NextResponse.json(
        formatResponse(false, null, 'Notification not found', 0),
        { status: 404, headers: corsHeaders }
      );
    }

    // Get all students who have read this notification
    const { data: readRecords, error: readError } = await supabase
      .from('notification_reads')
      .select(`
        user_id,
        read_at,
        users:user_id (
          id,
          name,
          email
        )
      `)
      .eq('notification_id', notificationId);

    if (readError) {
      console.error('Error fetching read records:', readError);
      return NextResponse.json(
        formatResponse(false, null, 'Failed to fetch read status', 0),
        { status: 500, headers: corsHeaders }
      );
    }

    // Format read records
    const readBy = (readRecords || []).map((record: any) => ({
      user_id: record.user_id,
      read_at: record.read_at,
      user: record.users || null,
    }));

    // If it's a broadcast notification (recipient_id is null), get all students
    // to show who hasn't read it
    let allStudents: any[] = [];
    let unreadBy: any[] = [];

    if (notification.recipient_id === null) {
      // Get all students
      const { data: students, error: studentsError } = await supabase
        .from('users')
        .select('id, name, email')
        .eq('role', 'student')
        .order('name');

      if (!studentsError && students) {
        allStudents = students;
        const readUserIds = new Set(readBy.map((r: any) => r.user_id));
        unreadBy = students
          .filter((student: any) => !readUserIds.has(student.id))
          .map((student: any) => ({
            user_id: student.id,
            user: student,
          }));
      }
    } else {
      // For personal notifications, check if the specific recipient has read it
      const hasRead = readBy.some((r: any) => r.user_id === notification.recipient_id);
      if (!hasRead) {
        // Get recipient info
        const { data: recipient } = await supabase
          .from('users')
          .select('id, name, email')
          .eq('id', notification.recipient_id)
          .single();

        if (recipient) {
          unreadBy = [{
            user_id: recipient.id,
            user: recipient,
          }];
        }
      }
    }

    return NextResponse.json(
      formatResponse(true, {
        notification_id: notificationId,
        is_broadcast: notification.recipient_id === null,
        read_by: readBy,
        unread_by: unreadBy,
        read_count: readBy.length,
        unread_count: unreadBy.length,
        total_recipients: notification.recipient_id === null 
          ? allStudents.length 
          : 1,
      }, 'Read status fetched successfully', 1),
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Error in GET /api/notifications/[id]/read-status:', error);
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
