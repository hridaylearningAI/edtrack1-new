import { NextRequest, NextResponse } from 'next/server'
import { corsHeaders, getPaginationParams, getRequestBody } from '@/lib/api/utils'
import { formatResponse } from '@/lib/api/supabase'
import { requireDemoCrmAuth } from '@/lib/crm/demo-auth'
import {
  createDemoLead,
  getDemoStats,
  listDemoLeads,
} from '@/lib/crm/demo-store'
import { mapLeadPayload } from '@/lib/crm/types'

export async function GET(request: NextRequest) {
  try {
    const auth = requireDemoCrmAuth(request)
    if (!auth.ok) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status, headers: corsHeaders }
      )
    }

    const { searchParams } = new URL(request.url)
    const { page, limit, offset } = getPaginationParams(request)
    const status = searchParams.get('status')
    const platform = searchParams.get('platform')
    const search = searchParams.get('search')
    const includeStats = searchParams.get('stats') === '1'

    const { leads, total } = listDemoLeads({ status, platform, search, limit, offset })
    const stats = includeStats ? getDemoStats() : null

    return NextResponse.json(
      formatResponse(
        true,
        {
          leads,
          pagination: { page, limit, offset, total },
          stats,
          can_assign_leads: auth.canAssignLeads,
        },
        'Leads fetched'
      ),
      { status: 200, headers: corsHeaders }
    )
  } catch (err) {
    console.error('GET /api/crm/portal/leads error:', err)
    return NextResponse.json(formatResponse(false, null, 'Failed to fetch leads'), {
      status: 500,
      headers: corsHeaders,
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = requireDemoCrmAuth(request)
    if (!auth.ok) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status, headers: corsHeaders }
      )
    }

    const body = await getRequestBody<Record<string, unknown>>(request)
    const input = mapLeadPayload(body)
    if (!input.full_name?.trim() || !input.email?.trim()) {
      return NextResponse.json(
        { success: false, error: 'full_name and email are required' },
        { status: 400, headers: corsHeaders }
      )
    }

    const result = createDemoLead({
      full_name: input.full_name,
      email: input.email,
      phone: input.phone,
      course: input.course,
      education_qualification: input.education_qualification,
      current_status: input.current_status,
      city: input.city,
      state: input.state,
      country: input.country,
      notes: input.notes,
      marketing_platform: input.marketing_platform || 'Direct',
      lead_source: input.lead_source || 'Direct',
      assigned_to_user_id: input.assigned_to_user_id ?? null,
    })

    return NextResponse.json(
      formatResponse(
        true,
        {
          lead: result.lead,
          created: result.created,
          updated: result.updated,
          duplicate: result.duplicate,
        },
        result.created ? 'Lead created' : result.updated ? 'Lead updated' : 'Duplicate lead'
      ),
      { status: result.created ? 201 : 200, headers: corsHeaders }
    )
  } catch (err) {
    console.error('POST /api/crm/portal/leads error:', err)
    return NextResponse.json(
      formatResponse(false, null, err instanceof Error ? err.message : 'Failed to create lead'),
      { status: 500, headers: corsHeaders }
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders })
}
