import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/api/auth"
import { corsHeaders } from "@/lib/api/utils"
import { getSupabaseClient, formatAuthError, formatResponse } from "@/lib/api/supabase"

async function canManageMeetingLinks(request: NextRequest) {
  const authResult = await requireAuth(request)
  if (!authResult.authenticated || !authResult.user) {
    return { ok: false as const, status: 401, response: formatAuthError(authResult.error || "Unauthorized", authResult.error_code || "UNAUTHORIZED") }
  }

  if (authResult.user.role === "admin") {
    return { ok: true as const, authResult }
  }

  const email = authResult.user.email
  if (!email) {
    return { ok: false as const, status: 403, response: { success: false, error: "Access denied." } }
  }

  const supabase = getSupabaseClient()
  const { data: trainer } = await supabase
    .from("trainers")
    .select("id,status")
    .ilike("email", email)
    .maybeSingle()

  if (!trainer || trainer.status !== "Active") {
    return { ok: false as const, status: 403, response: { success: false, error: "Access denied. Active trainer only." } }
  }

  return { ok: true as const, authResult }
}

/**
 * PUT /api/trainer/schedule/nclex-timetable/events/[id]/meeting-link
 * Allow active trainers (or admins) to set/clear meeting link for an event.
 */
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const access = await canManageMeetingLinks(request)
    if (!access.ok) {
      return NextResponse.json(access.response, { status: access.status, headers: corsHeaders })
    }

    const body = await request.json().catch(() => ({}))
    const meetingLinkRaw = typeof body?.meeting_link === "string" ? body.meeting_link.trim() : ""
    const meetingLink = meetingLinkRaw.length > 0 ? meetingLinkRaw : null
    const recordingLinkRaw = typeof body?.recording_link === "string" ? body.recording_link.trim() : ""
    const recordingLink = recordingLinkRaw.length > 0 ? recordingLinkRaw : null

    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from("nclex_timetable_events")
      .update({ meeting_link: meetingLink, recording_link: recordingLink })
      .eq("id", params.id)
      .select("id,title,date,time,type,course,sheet,meeting_link,recording_link")
      .maybeSingle()

    if (error) {
      return NextResponse.json(formatResponse(false, null, "Failed to update meeting link"), { status: 500, headers: corsHeaders })
    }
    if (!data) {
      return NextResponse.json(formatResponse(false, null, "Event not found"), { status: 404, headers: corsHeaders })
    }

    return NextResponse.json(formatResponse(true, data, "Meeting link updated"), { headers: corsHeaders })
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

