import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/api/auth"
import { getSupabaseClient, formatAuthError, formatResponse } from "@/lib/api/supabase"
import { corsHeaders } from "@/lib/api/utils"

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json(formatAuthError(authResult.error || "Unauthorized", authResult.error_code || "UNAUTHORIZED"), {
        status: 401,
        headers: corsHeaders,
      })
    }

    const email = authResult.user.email
    if (!email) {
      return NextResponse.json(formatResponse(false, null, "User email missing"), { status: 400, headers: corsHeaders })
    }

    const supabase = getSupabaseClient()
    const { data: partner } = await supabase
      .from("partners")
      .select("id,status,name,partner_code")
      .ilike("email", email)
      .maybeSingle()

    const isAdmin = authResult.user.role === "admin"
    if (!isAdmin && (!partner || partner.status !== "Active")) {
      return NextResponse.json(formatResponse(false, null, "Partner access denied"), { status: 403, headers: corsHeaders })
    }

    const partnerId = partner?.id
    if (!partnerId && !isAdmin) {
      return NextResponse.json(formatResponse(true, { summary: { total: 0 }, enrollments: [] }, "No attributed enrollments yet"), {
        headers: corsHeaders,
      })
    }

    const query = supabase
      .from("enrollments")
      .select("id,course_id,enrollment_date,status,referred_by_partner_id,referred_by_partner_code,courses(name),students(name,email)")
      .order("enrollment_date", { ascending: false })
      .limit(500)

    const { data: enrollments, error } = await query.eq("referred_by_partner_id", partnerId)
    if (error) {
      return NextResponse.json(formatResponse(false, null, "Failed to fetch partner enrollments"), { status: 500, headers: corsHeaders })
    }

    const byCourse: Record<string, number> = {}
    for (const row of enrollments || []) {
      const courseName = (row as any)?.courses?.name || `Course ${(row as any).course_id}`
      byCourse[courseName] = (byCourse[courseName] || 0) + 1
    }

    return NextResponse.json(
      formatResponse(
        true,
        {
          partner: partner ? { id: partner.id, name: partner.name, partner_code: partner.partner_code } : null,
          summary: {
            total: (enrollments || []).length,
            byCourse,
          },
          enrollments: enrollments || [],
        },
        "Partner enrollments fetched successfully"
      ),
      { headers: corsHeaders }
    )
  } catch (err: any) {
    return NextResponse.json(formatResponse(false, null, err?.message || "Internal server error"), {
      status: 500,
      headers: corsHeaders,
    })
  }
}

export async function OPTIONS() {
  return NextResponse.json(null, { status: 200, headers: corsHeaders })
}

