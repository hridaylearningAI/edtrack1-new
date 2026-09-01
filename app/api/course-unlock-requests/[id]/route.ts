import { NextRequest, NextResponse } from "next/server"
import {requireAuth, isAdminRole } from "@/lib/api/auth"
import { getSupabaseClient, formatResponse } from "@/lib/api/supabase"
import { corsHeaders } from "@/lib/api/utils"

/** PATCH /api/course-unlock-requests/[id] - Admin: approve or reject a request */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth(request)
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json(formatResponse(false, null, "Unauthorized"), {
        status: 401,
        headers: corsHeaders,
      })
    }
    if (!isAdminRole(authResult.user.role)) {
      return NextResponse.json(formatResponse(false, null, "Forbidden"), {
        status: 403,
        headers: corsHeaders,
      })
    }
    const { id } = await params
    const requestId = parseInt(id, 10)
    if (Number.isNaN(requestId)) {
      return NextResponse.json(
        formatResponse(false, null, "Invalid request id"),
        { status: 400, headers: corsHeaders }
      )
    }
    const body = await request.json().catch(() => ({}))
    const status = body.status === "approved" || body.status === "rejected" ? body.status : null
    if (!status) {
      return NextResponse.json(
        formatResponse(false, null, "Missing or invalid status (approved|rejected)"),
        { status: 400, headers: corsHeaders }
      )
    }
    const supabase = getSupabaseClient()
    const { data: updated, error } = await supabase
      .from("course_unlock_requests")
      .update({
        status,
        reviewed_at: new Date().toISOString(),
        reviewed_by: authResult.user.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", requestId)
      .select()
      .single()
    if (error) throw error
    if (!updated) {
      return NextResponse.json(
        formatResponse(false, null, "Request not found"),
        { status: 404, headers: corsHeaders }
      )
    }
    return NextResponse.json(formatResponse(true, updated), { headers: corsHeaders })
  } catch (err: unknown) {
    console.error("Error updating course unlock request:", err)
    return NextResponse.json(
      formatResponse(false, null, err instanceof Error ? err.message : "Failed to update"),
      { status: 500, headers: corsHeaders }
    )
  }
}
