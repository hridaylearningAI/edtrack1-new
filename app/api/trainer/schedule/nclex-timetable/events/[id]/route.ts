import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/api/auth"
import { corsHeaders } from "@/lib/api/utils"
import { getSupabaseClient, formatAuthError, formatResponse } from "@/lib/api/supabase"

async function canAccessTrainerSchedule(request: NextRequest) {
  const authResult = await requireAuth(request)
  if (!authResult.authenticated || !authResult.user) {
    return {
      ok: false as const,
      status: 401,
      response: formatAuthError(authResult.error || "Unauthorized", authResult.error_code || "UNAUTHORIZED"),
    }
  }

  if (authResult.user.role === "admin") {
    return { ok: true as const }
  }

  const email = authResult.user.email
  if (!email) {
    return { ok: false as const, status: 403, response: { success: false, error: "Access denied." } }
  }

  const supabase = getSupabaseClient()
  const { data: trainer } = await supabase.from("trainers").select("id,status").ilike("email", email).maybeSingle()
  if (!trainer || trainer.status !== "Active") {
    return { ok: false as const, status: 403, response: { success: false, error: "Access denied. Active trainer only." } }
  }

  return { ok: true as const }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const access = await canAccessTrainerSchedule(request)
    if (!access.ok) {
      return NextResponse.json(access.response, { status: access.status, headers: corsHeaders })
    }

    const supabase = getSupabaseClient()
    const { error } = await supabase.from("nclex_timetable_events").delete().eq("id", params.id)

    if (error) {
      return NextResponse.json(formatResponse(false, null, "Failed to delete event"), { status: 500, headers: corsHeaders })
    }

    return NextResponse.json(formatResponse(true, null, "Event deleted"), { headers: corsHeaders })
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
