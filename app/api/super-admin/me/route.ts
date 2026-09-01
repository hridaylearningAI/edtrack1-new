import { NextRequest, NextResponse } from "next/server"
import { corsHeaders } from "@/lib/api/utils"
import { formatResponse } from "@/lib/api/supabase"
import { requireSuperAdmin } from "@/lib/api/super-admin"

/**
 * GET /api/super-admin/me
 * Returns whether the current user has super admin access.
 */
export async function GET(request: NextRequest) {
  const gate = await requireSuperAdmin(request)
  return NextResponse.json(
    formatResponse(gate.allowed, { allowed: gate.allowed }, gate.allowed ? "Super admin access granted" : gate.error),
    { status: gate.allowed ? 200 : gate.status, headers: corsHeaders }
  )
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders })
}
