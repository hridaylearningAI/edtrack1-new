import crypto from "crypto"
import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/api/auth"
import { corsHeaders } from "@/lib/api/utils"
import { getSupabaseClient, formatAuthError, formatResponse } from "@/lib/api/supabase"
import type { NclexTimetableEventDTO } from "@/lib/schedule/types"

type CreateNclexEventBody = {
  title: string
  date: string
  time: string
  type: NclexTimetableEventDTO["type"]
  course?: string
  sheet?: string
  meeting_link?: string | null
  recording_link?: string | null
  id?: string
}

function hashString(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex")
}

function makeDeterministicId(body: CreateNclexEventBody) {
  const base = `${body.title}|${body.date}|${body.time}|${body.type}|${body.course || ""}|${body.sheet || ""}`
  return `nclex-${hashString(base)}`
}

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

export async function GET(request: NextRequest) {
  try {
    const access = await canAccessTrainerSchedule(request)
    if (!access.ok) return NextResponse.json(access.response, { status: access.status, headers: corsHeaders })

    const supabase = getSupabaseClient()
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "200", 10), 200)

    const { data, error } = await supabase
      .from("nclex_timetable_events")
      .select("id,title,date,time,type,course,sheet,meeting_link,recording_link")
      .order("date", { ascending: true })
      .limit(limit)

    if (error) {
      return NextResponse.json(formatResponse(false, null, "Failed to fetch events"), { status: 500, headers: corsHeaders })
    }

    return NextResponse.json(formatResponse(true, data ?? [], "Events fetched"), { headers: corsHeaders })
  } catch (err: any) {
    return NextResponse.json(formatResponse(false, null, err?.message || "Internal server error"), {
      status: 500,
      headers: corsHeaders,
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    const access = await canAccessTrainerSchedule(request)
    if (!access.ok) return NextResponse.json(access.response, { status: access.status, headers: corsHeaders })

    const body = (await request.json()) as CreateNclexEventBody
    const { title, date, time, type } = body

    if (!title || !date || !time || !type) {
      return NextResponse.json(formatResponse(false, null, "title, date, time, type are required"), {
        status: 400,
        headers: corsHeaders,
      })
    }

    const id = body.id?.trim() ? body.id.trim() : makeDeterministicId(body)

    const supabase = getSupabaseClient()
    const payload = {
      id,
      title: String(title),
      date: String(date),
      time: String(time),
      type: String(type),
      course: body.course ? String(body.course) : null,
      sheet: body.sheet ? String(body.sheet) : null,
      meeting_link: body.meeting_link ? String(body.meeting_link) : null,
      recording_link: body.recording_link ? String(body.recording_link) : null,
    }

    const { data, error } = await supabase.from("nclex_timetable_events").upsert(payload, { onConflict: "id" }).select("*").maybeSingle()

    if (error) {
      return NextResponse.json(formatResponse(false, null, "Failed to save event"), { status: 500, headers: corsHeaders })
    }

    return NextResponse.json(
      formatResponse(
        true,
        {
          ...data,
          type: data?.type as NclexTimetableEventDTO["type"],
        },
        "Event saved"
      ),
      { status: 201, headers: corsHeaders }
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

