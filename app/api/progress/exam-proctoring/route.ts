import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/api/auth"
import { getSupabaseClient, formatResponse } from "@/lib/api/supabase"
import { corsHeaders } from "@/lib/api/utils"

const MAX_EVENTS_PER_REQUEST = 100

const ALLOWED_EVENT_TYPES = new Set([
  "CAMERA_READY",
  "CAMERA_DENIED",
  "CAMERA_LOST",
  "LOOK_AWAY",
  "LOOK_AWAY_CLEARED",
  "NO_FACE",
  "NO_FACE_CLEARED",
  "MULTIPLE_FACES",
  "TAB_HIDDEN",
  "TAB_VISIBLE",
  "WINDOW_BLUR",
  "WINDOW_FOCUS",
  "FULLSCREEN_ENTERED",
  "FULLSCREEN_EXITED",
  "FULLSCREEN_DENIED",
  "APP_SWITCH",
  "PAGE_FREEZE",
  "SCREENSHOT_ATTEMPT",
  "CONTENT_COPY_BLOCKED",
  "WARNING",
  "EXAM_TERMINATED",
])

const ALLOWED_SEVERITIES = new Set(["info", "warning", "critical"])

type IncomingEvent = {
  eventType?: string
  severity?: string
  timestamp?: string
  message?: string
  metadata?: Record<string, unknown>
}

/**
 * POST /api/progress/exam-proctoring
 * Body: { enrollmentId, courseId, attemptId?, events: ProctoringEvent[] }
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json(formatResponse(false, null, "Unauthorized"), {
        status: 401,
        headers: corsHeaders,
      })
    }

    const body = await request.json()
    const { enrollmentId, courseId, attemptId, events } = body as {
      enrollmentId?: number
      courseId?: number
      attemptId?: number | null
      events?: IncomingEvent[]
    }

    if (
      enrollmentId == null ||
      courseId == null ||
      !Array.isArray(events) ||
      events.length === 0
    ) {
      return NextResponse.json(
        formatResponse(false, null, "Missing or invalid: enrollmentId, courseId, events"),
        { status: 400, headers: corsHeaders }
      )
    }

    if (events.length > MAX_EVENTS_PER_REQUEST) {
      return NextResponse.json(
        formatResponse(false, null, `Too many events (max ${MAX_EVENTS_PER_REQUEST})`),
        { status: 400, headers: corsHeaders }
      )
    }

    const supabase = getSupabaseClient()

    const { data: enrollment, error: enrollmentError } = await supabase
      .from("enrollments")
      .select("id, student_id, course_id")
      .eq("id", enrollmentId)
      .eq("student_id", authResult.user.id)
      .eq("course_id", courseId)
      .maybeSingle()

    if (enrollmentError || !enrollment) {
      return NextResponse.json(
        formatResponse(false, null, "Enrollment not found or access denied"),
        { status: 404, headers: corsHeaders }
      )
    }

    const rows = []
    for (const event of events) {
      const eventType = String(event.eventType ?? "")
      const severity = String(event.severity ?? "info")
      if (!ALLOWED_EVENT_TYPES.has(eventType) || !ALLOWED_SEVERITIES.has(severity)) {
        continue
      }
      let clientTimestamp: string | null = null
      if (typeof event.timestamp === "string") {
        const parsed = Date.parse(event.timestamp)
        if (!Number.isNaN(parsed)) clientTimestamp = new Date(parsed).toISOString()
      }
      rows.push({
        enrollment_id: enrollmentId,
        course_id: courseId,
        student_id: authResult.user.id,
        attempt_id: typeof attemptId === "number" ? attemptId : null,
        event_type: eventType,
        severity,
        message: typeof event.message === "string" ? event.message.slice(0, 500) : null,
        metadata: event.metadata && typeof event.metadata === "object" ? event.metadata : {},
        client_timestamp: clientTimestamp,
      })
    }

    if (rows.length === 0) {
      return NextResponse.json(
        formatResponse(false, null, "No valid proctoring events"),
        { status: 400, headers: corsHeaders }
      )
    }

    const { error: insertError } = await supabase.from("exam_proctoring_events").insert(rows)
    if (insertError) throw insertError

    return NextResponse.json(
      formatResponse(true, { inserted: rows.length }, "Proctoring events saved"),
      { headers: corsHeaders }
    )
  } catch (err: unknown) {
    console.error("Error saving exam proctoring events:", err)
    return NextResponse.json(
      formatResponse(
        false,
        null,
        err instanceof Error ? err.message : "Failed to save proctoring events"
      ),
      { status: 500, headers: corsHeaders }
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders })
}
