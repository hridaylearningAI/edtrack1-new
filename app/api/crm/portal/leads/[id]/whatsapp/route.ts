import { NextRequest, NextResponse } from 'next/server'
import { corsHeaders, getRequestBody } from '@/lib/api/utils'
import { formatResponse } from '@/lib/api/supabase'
import { requireDemoCrmAuth } from '@/lib/crm/demo-auth'
import {
  appendWhatsAppMessage,
  getDemoLead,
  getDemoWhatsApp,
  getWhatsAppSession,
  listWhatsAppTemplates,
  resolveTemplateBody,
} from '@/lib/crm/demo-store'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const auth = requireDemoCrmAuth(request)
    if (!auth.ok) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status, headers: corsHeaders }
      )
    }

    const { id } = await context.params
    const leadId = parseInt(id, 10)
    if (!Number.isFinite(leadId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid lead id' },
        { status: 400, headers: corsHeaders }
      )
    }

    const lead = getDemoLead(leadId)
    if (!lead) {
      return NextResponse.json(
        { success: false, error: 'Lead not found' },
        { status: 404, headers: corsHeaders }
      )
    }

    const messages = getDemoWhatsApp(leadId)
    const session = getWhatsAppSession(messages)
    const templates = listWhatsAppTemplates(lead)

    return NextResponse.json(
      formatResponse(true, {
        messages,
        session,
        templates,
        can_send_template: templates.length > 0,
      }),
      { headers: corsHeaders }
    )
  } catch (error) {
    console.error('CRM WhatsApp list error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to load WhatsApp thread' },
      { status: 500, headers: corsHeaders }
    )
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const auth = requireDemoCrmAuth(request)
    if (!auth.ok) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status, headers: corsHeaders }
      )
    }

    const { id } = await context.params
    const leadId = parseInt(id, 10)
    if (!Number.isFinite(leadId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid lead id' },
        { status: 400, headers: corsHeaders }
      )
    }

    const lead = getDemoLead(leadId)
    if (!lead) {
      return NextResponse.json(
        { success: false, error: 'Lead not found' },
        { status: 404, headers: corsHeaders }
      )
    }

    const body = await getRequestBody<{
      body?: string
      template_id?: string
      retry_message_id?: number
    }>(request)

    let text = typeof body.body === 'string' ? body.body.trim() : ''
    let templateId: string | null = null

    if (typeof body.template_id === 'string' && body.template_id.trim()) {
      templateId = body.template_id.trim()
      text = resolveTemplateBody(templateId, lead) || text
    }

    if (!text) {
      return NextResponse.json(
        { success: false, error: 'Message body required' },
        { status: 400, headers: corsHeaders }
      )
    }

    const messagesBefore = getDemoWhatsApp(leadId)
    const session = getWhatsAppSession(messagesBefore)
    if (!session.open && !templateId) {
      return NextResponse.json(
        {
          success: false,
          error:
            'WhatsApp only allows free-form replies within 24 hours of the lead\'s last message. Send an approved template first.',
        },
        { status: 400, headers: corsHeaders }
      )
    }

    appendWhatsAppMessage(leadId, {
      direction: 'outbound',
      body: text,
      template_id: templateId,
      author_name: 'Demo admin',
    })

    const messages = getDemoWhatsApp(leadId)
    const nextSession = getWhatsAppSession(messages)
    const templates = listWhatsAppTemplates(lead)

    return NextResponse.json(
      formatResponse(true, {
        messages,
        session: nextSession,
        templates,
        can_send_template: templates.length > 0,
      }),
      { headers: corsHeaders }
    )
  } catch (error) {
    console.error('CRM WhatsApp send error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to send WhatsApp message' },
      { status: 500, headers: corsHeaders }
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders })
}
