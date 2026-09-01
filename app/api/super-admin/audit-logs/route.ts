import { NextRequest, NextResponse } from "next/server"
import { corsHeaders } from "@/lib/api/utils"
import { formatResponse } from "@/lib/api/supabase"
import { requireSuperAdmin } from "@/lib/api/super-admin"
import { listPlatformAuditLogs } from "@/lib/api/audit-log"

/**
 * GET /api/super-admin/audit-logs?tenant_id=&limit=&offset=
 */
export async function GET(request: NextRequest) {
  try {
    const gate = await requireSuperAdmin(request)
    if (!gate.allowed) {
      return NextResponse.json(formatResponse(false, null, gate.error), {
        status: gate.status,
        headers: corsHeaders,
      })
    }

    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get("tenant_id") || undefined
    const limit = Number.parseInt(searchParams.get("limit") || "50", 10)
    const offset = Number.parseInt(searchParams.get("offset") || "0", 10)

    const { logs, total } = await listPlatformAuditLogs({
      tenantId,
      limit: Number.isFinite(limit) ? limit : 50,
      offset: Number.isFinite(offset) ? offset : 0,
    })

    return NextResponse.json(
      formatResponse(true, { logs, total }, "Audit logs fetched"),
      { headers: corsHeaders }
    )
  } catch (err: unknown) {
    console.error("GET /api/super-admin/audit-logs error:", err)
    return NextResponse.json(
      formatResponse(false, null, err instanceof Error ? err.message : "Internal server error"),
      { status: 500, headers: corsHeaders }
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders })
}
