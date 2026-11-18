import { NextRequest, NextResponse } from 'next/server'
import { corsHeaders, getRequestBody } from '@/lib/api/utils'
import { formatResponse } from '@/lib/api/supabase'
import { requireDemoCrmAuth } from '@/lib/crm/demo-auth'
import { distributeDemoLeads } from '@/lib/crm/demo-store'

type DistributeBody = {
  lead_ids?: number[]
  only_unassigned?: boolean
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

    const body = await getRequestBody<DistributeBody>(request)
    const leadIds = Array.isArray(body.lead_ids)
      ? body.lead_ids.map((id) => Number(id)).filter((id) => Number.isFinite(id))
      : []
    if (leadIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'lead_ids is required' },
        { status: 400, headers: corsHeaders }
      )
    }

    const result = distributeDemoLeads({
      leadIds,
      onlyUnassigned: body.only_unassigned !== false,
    })

    return NextResponse.json(formatResponse(true, result, 'Leads distributed'), {
      status: 200,
      headers: corsHeaders,
    })
  } catch (err) {
    console.error('POST /api/crm/portal/leads/distribute error:', err)
    const message = err instanceof Error ? err.message : 'Failed to distribute leads'
    const status = message.includes('No') ? 400 : 500
    return NextResponse.json(formatResponse(false, null, message), { status, headers: corsHeaders })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders })
}
