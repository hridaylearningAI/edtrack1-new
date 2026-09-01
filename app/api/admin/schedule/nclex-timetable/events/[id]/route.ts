import { NextRequest, NextResponse } from "next/server"
import {requireAuth, isAdminRole } from "@/lib/api/auth"
import { corsHeaders } from "@/lib/api/utils"
import { getSupabaseClient, formatAuthError, formatResponse } from "@/lib/api/supabase"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authResult = await requireAuth(request)
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json(formatAuthError(authResult.error || "Unauthorized", authResult.error_code || "UNAUTHORIZED"), {
        status: 401,
        headers: corsHeaders,
      })
    }
    if (!isAdminRole(authResult.user.role)) {
      return NextResponse.json({ success: false, error: "Access denied. Admin only." }, { status: 403, headers: corsHeaders })
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

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authResult = await requireAuth(request)
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json(formatAuthError(authResult.error || "Unauthorized", authResult.error_code || "UNAUTHORIZED"), {
        status: 401,
        headers: corsHeaders,
      })
    }
    if (!isAdminRole(authResult.user.role)) {
      return NextResponse.json({ success: false, error: "Access denied. Admin only." }, { status: 403, headers: corsHeaders })
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

