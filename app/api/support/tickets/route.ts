import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient, formatResponse, formatAuthError } from '@/lib/api/supabase';
import { requireAuth } from '@/lib/api/auth';
import { corsHeaders } from '@/lib/api/utils';
import { Resend } from 'resend';
import { generateSupportAcknowledgementEmailTemplate } from '@/lib/templates/supportAcknowledgement';

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * GET /api/support/tickets
 * List support tickets - students see their own, admins see all
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
    const user = authResult.user;
    const isAdmin = user.role === 'admin';

    let query = supabase
      .from('support_tickets')
      .select('id, ticket_reference, title, category, priority, status, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (!isAdmin) {
      query = query.eq('user_id', user.id);
    }

    const { data: tickets, error } = await query;

    if (error) {
      console.error('Get support tickets error:', error);
      return NextResponse.json(
        formatResponse(false, null, 'Failed to fetch support tickets'),
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(formatResponse(true, tickets, null), { headers: corsHeaders });
  } catch (error: any) {
    console.error('Get support tickets error:', error);
    return NextResponse.json(
      formatResponse(false, null, 'Failed to fetch support tickets'),
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * POST /api/support/tickets
 * Create a new support ticket and send email to admin
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
    const { title, category, priority, description } = body;

    // Validation
    if (!title || !category || !priority || !description) {
      return NextResponse.json(
        formatResponse(false, null, 'All fields are required'),
        { status: 400, headers: corsHeaders }
      );
    }

    // Use the authenticated Supabase user from requireAuth (integer id).
    const user = authResult.user;

    const supabase = getSupabaseClient();

    // Generate ticket reference from DB (SR-YYYY-NNNN) - atomic, unique
    const { data: ticketReference, error: refError } = await supabase.rpc('generate_support_ticket_reference');
    if (refError || !ticketReference) {
      console.error('Generate ticket reference error:', refError);
      return NextResponse.json(
        formatResponse(false, null, 'Failed to create support ticket'),
        { status: 500, headers: corsHeaders }
      );
    }

    // Store ticket in database
    const { data: ticket, error: insertError } = await supabase
      .from('support_tickets')
      .insert({
        ticket_reference: ticketReference,
        user_id: user.id,
        user_name: user.name || null,
        user_email: user.email || null,
        title,
        category,
        priority,
        description,
        status: 'open',
      })
      .select('id, ticket_reference, created_at')
      .single();

    if (insertError) {
      console.error('Insert support ticket error:', insertError);
      return NextResponse.json(
        formatResponse(false, null, 'Failed to create support ticket'),
        { status: 500, headers: corsHeaders }
      );
    }
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_PORTFOLIO_URL || 'https://edtec.online';
    const logoUrl = process.env.EMAIL_LOGO_URL || process.env.NEXT_PUBLIC_EMAIL_LOGO_URL || 'https://edtec.online/etia-logo.png';

    // Send acknowledgement email to student
    if (process.env.RESEND_API_KEY && user.email) {
      try {
        const acknowledgementHtml = generateSupportAcknowledgementEmailTemplate({
          studentName: user.name || 'Student',
          ticketReference: `#${ticketReference}`,
          logoUrl,
          supportUrl: baseUrl,
        });

        await resend.emails.send({
          from: process.env.FROM_EMAIL || 'noreply@edtec.online',
          to: user.email,
          subject: `Support Request Received - ${ticketReference}`,
          html: acknowledgementHtml,
        });
      } catch (ackError: any) {
        console.error('Error sending support acknowledgement email:', ackError);
      }
    }

    // Send email to support team
    if (process.env.RESEND_API_KEY) {
      try {
        const emailHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>New Support Ticket</title>
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0;">EdTec Online</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">New Support Ticket</p>
            </div>
            
            <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
              <h2 style="color: #333; margin-top: 0;">Support Ticket Details</h2>
              <p style="margin: 0 0 20px 0; font-size: 14px; color: #666;"><strong>Ticket Reference:</strong> #${ticketReference}</p>
              
              <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; width: 150px;">Title:</td>
                  <td style="padding: 8px 0;">${title}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold;">Category:</td>
                  <td style="padding: 8px 0;">${category}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold;">Priority:</td>
                  <td style="padding: 8px 0;">
                    <span style="background: ${
                      priority === 'urgent' ? '#f44336' :
                      priority === 'high' ? '#ff9800' :
                      priority === 'medium' ? '#ffc107' : '#4caf50'
                    }; color: white; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: bold;">
                      ${priority.toUpperCase()}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold;">Student Name:</td>
                  <td style="padding: 8px 0;">${user.name || 'N/A'}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold;">Student Email:</td>
                  <td style="padding: 8px 0;"><a href="mailto:${user.email}" style="color: #2196F3;">${user.email}</a></td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; vertical-align: top;">Description:</td>
                  <td style="padding: 8px 0;">${description.replace(/\n/g, '<br>')}</td>
                </tr>
              </table>
              
              <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px;">
                <p style="margin: 0;"><strong>Action Required:</strong></p>
                <p style="margin: 5px 0 0 0;">Please review and respond to this support ticket at your earliest convenience.</p>
              </div>
              
              <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
              
              <p style="color: #666; font-size: 12px; margin: 0;">
                This is an automated notification from EdTec Online Student Management System.
              </p>
            </div>
          </body>
          </html>
        `;

        await resend.emails.send({
          from: process.env.FROM_EMAIL || 'noreply@edtec.online',
          to: 'support@edtec.online',
          subject: `[${priority.toUpperCase()}] Support Ticket: ${title}`,
          html: emailHtml,
        });

      } catch (emailError: any) {
        console.error('Error sending support ticket email:', emailError);
        // Don't fail the request if email fails
      }
    }

    return NextResponse.json(
      formatResponse(true, { title, category, priority, description, ticketReference: `#${ticketReference}` }, 'Support ticket created successfully'),
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Create support ticket error:', error);
    return NextResponse.json(
      formatResponse(false, null, 'Failed to create support ticket'),
      { status: 500, headers: corsHeaders }
    );
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

