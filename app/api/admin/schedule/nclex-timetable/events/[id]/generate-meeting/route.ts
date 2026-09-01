import { NextRequest, NextResponse } from "next/server"
import {requireAuth, isAdminRole } from "@/lib/api/auth"
import { corsHeaders } from "@/lib/api/utils"
import { getSupabaseClient, formatAuthError, formatResponse } from "@/lib/api/supabase"
import { createTeamsMeeting } from "@/lib/integrations/microsoft-graph"

type GenerateBody = {
  startDateTime?: string
  endDateTime?: string
  subject?: string
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
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

    const body = (await request.json().catch(() => ({}))) as GenerateBody
    const startDateTimeIso = typeof body.startDateTime === "string" ? body.startDateTime.trim() : ""
    const endDateTimeIso = typeof body.endDateTime === "string" ? body.endDateTime.trim() : ""
    if (!startDateTimeIso || !endDateTimeIso) {
      return NextResponse.json(formatResponse(false, null, "startDateTime and endDateTime are required"), {
        status: 400,
        headers: corsHeaders,
      })
    }

    const supabase = getSupabaseClient()
    const { data: eventRow, error: fetchError } = await supabase
      .from("nclex_timetable_events")
      .select("id,title,date,time,type,course,sheet,meeting_link")
      .eq("id", id)
      .maybeSingle()

    if (fetchError) {
      return NextResponse.json(formatResponse(false, null, "Failed to fetch event"), { status: 500, headers: corsHeaders })
    }
    if (!eventRow) {
      return NextResponse.json(formatResponse(false, null, "Event not found"), { status: 404, headers: corsHeaders })
    }

    const subject = (typeof body.subject === "string" && body.subject.trim()) || eventRow.title || "NCLEX Live Class"
    const created = await createTeamsMeeting({
      subject,
      startDateTimeIso,
      endDateTimeIso,
    })

    const { data: updated, error: updateError } = await supabase
      .from("nclex_timetable_events")
      .update({ meeting_link: created.joinWebUrl })
      .eq("id", id)
      .select("id,title,date,time,type,course,sheet,meeting_link")
      .maybeSingle()

    if (updateError) {
      return NextResponse.json(formatResponse(false, null, "Meeting created but failed to save link"), {
        status: 500,
        headers: corsHeaders,
      })
    }

    return NextResponse.json(
      formatResponse(
        true,
        {
          event: updated,
          joinWebUrl: created.joinWebUrl,
        },
        "Teams meeting created and linked"
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

