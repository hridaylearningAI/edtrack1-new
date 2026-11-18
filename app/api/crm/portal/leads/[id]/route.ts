import { NextRequest, NextResponse } from 'next/server'
import { corsHeaders, getRequestBody } from '@/lib/api/utils'
import { formatResponse } from '@/lib/api/supabase'
import { requireDemoCrmAuth } from '@/lib/crm/demo-auth'
import {
  getDemoActivities,
  getDemoAssignee,
  getDemoLead,
  updateDemoLead,
} from '@/lib/crm/demo-store'
import { isCrmLeadStatus } from '@/lib/crm/types'

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

    const activities = getDemoActivities(leadId)
    const assignee = getDemoAssignee(lead.assigned_to_user_id)

    return NextResponse.json(
      formatResponse(
        true,
        { lead, activities, assignee, can_assign_leads: auth.canAssignLeads },
        'Lead fetched'
      ),
      { status: 200, headers: corsHeaders }
    )
  } catch (err) {
    console.error('GET /api/crm/portal/leads/[id] error:', err)
    return NextResponse.json(formatResponse(false, null, 'Failed to fetch lead'), {
      status: 500,
      headers: corsHeaders,
    })
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
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

    const body = await getRequestBody<Record<string, unknown>>(request)
    const patch: Parameters<typeof updateDemoLead>[1] = {}

    if (typeof body.status === 'string' && isCrmLeadStatus(body.status)) {
      patch.status = body.status
    }
    if ('assigned_to_user_id' in body) {
      const raw = body.assigned_to_user_id
      if (raw === null || raw === '' || raw === '__unassigned__') {
        patch.assigned_to_user_id = null
      } else {
        const n = Number(raw)
        patch.assigned_to_user_id = Number.isFinite(n) ? n : null
      }
    }
    if (typeof body.add_note === 'string') {
      patch.add_note = body.add_note
    }
    if (typeof body.notes === 'string') {
      patch.notes = body.notes
    }

    const lead = updateDemoLead(leadId, patch)
    if (!lead) {
      return NextResponse.json(
        { success: false, error: 'Lead not found' },
        { status: 404, headers: corsHeaders }
      )
    }

    return NextResponse.json(formatResponse(true, { lead }, 'Lead updated'), {
      status: 200,
      headers: corsHeaders,
    })
  } catch (err) {
    console.error('PATCH /api/crm/portal/leads/[id] error:', err)
    return NextResponse.json(formatResponse(false, null, 'Failed to update lead'), {
      status: 500,
      headers: corsHeaders,
    })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders })
}
