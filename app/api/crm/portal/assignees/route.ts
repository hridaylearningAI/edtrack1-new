import { NextRequest, NextResponse } from 'next/server'
import { corsHeaders } from '@/lib/api/utils'
import { formatResponse } from '@/lib/api/supabase'
import { requireDemoCrmAuth } from '@/lib/crm/demo-auth'
import { listDemoAssignees } from '@/lib/crm/demo-store'

export async function GET(request: NextRequest) {
  try {
    const auth = requireDemoCrmAuth(request)
    if (!auth.ok) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status, headers: corsHeaders }
      )
    }

    return NextResponse.json(
      formatResponse(
        true,
        { assignees: listDemoAssignees(), can_assign_leads: auth.canAssignLeads },
        'Assignees fetched'
      ),
      { status: 200, headers: corsHeaders }
    )
  } catch (err) {
    console.error('GET /api/crm/portal/assignees error:', err)
    return NextResponse.json(formatResponse(false, null, 'Failed to fetch assignees'), {
      status: 500,
      headers: corsHeaders,
    })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders })
}
