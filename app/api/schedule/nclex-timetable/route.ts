import { NextResponse } from "next/server"
import { readFile } from "fs/promises"
import path from "path"
import crypto from "crypto"
import { parseNclexTimetableXlsx } from "@/lib/schedule/parse-nclex-timetable"
import { corsHeaders } from "@/lib/api/utils"
import { getSupabaseClient } from "@/lib/api/supabase"
import type { NclexTimetableEventDTO } from "@/lib/schedule/types"

export const runtime = "nodejs"

const FILENAME = "EdTec - NCLEX-OSCE - All Intake timetable 2026 - 2027 .xlsx"

function ensureEventArrayShape(events: unknown): NclexTimetableEventDTO[] {
  if (!Array.isArray(events)) return []
  return events as NclexTimetableEventDTO[]
}

function hashString(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex")
}

function normalizeParsedEventId(ev: NclexTimetableEventDTO) {
  // If xlsx parsing already produced an id, keep it.
  if (typeof ev.id === "string" && ev.id.trim()) return ev.id
  // Fallback: deterministic id derived from core fields.
  return `nclex-${hashString(`${ev.title}|${ev.date}|${ev.time}|${ev.type}`)}`
}

/**
 * GET /api/schedule/nclex-timetable
 * Parses the public schedule xlsx and returns calendar events (JSON).
 * Auth optional — timetable is not secret; students use it for planning.
 */
export async function GET() {
  try {
    const supabase = getSupabaseClient()

    // 1) Try DB first (dynamic schedule).
    const { data: dbEvents, error: dbError } = await supabase
      .from("nclex_timetable_events")
      .select("id,title,date,time,type,course,sheet,meeting_link,recording_link")
      .order("date", { ascending: true })

    // If DB query succeeds, trust DB as source of truth (including intentional empty state).
    if (!dbError && Array.isArray(dbEvents)) {
      return NextResponse.json(
        {
          success: true,
          events: dbEvents.map((e: any) => ({
            id: String(e.id),
            title: String(e.title),
            course: String(e.course ?? "NCLEX–OSCE Trainer-led TestPrep"),
            date: String(e.date),
            time: String(e.time),
            type: e.type as NclexTimetableEventDTO["type"],
            sheet: String(e.sheet ?? "db"),
            meeting_link: e.meeting_link ? String(e.meeting_link) : null,
            recording_link: e.recording_link ? String(e.recording_link) : null,
          })),
          source: "database:nclex_timetable_events",
          sheetNames: ["DB"],
        },
        { headers: corsHeaders }
      )
    }

    // 2) If table is missing/unavailable, fallback to XLSX and attempt one-time seed.
    const filePath = path.join(process.cwd(), "public", "schedule", FILENAME)
    const buffer = await readFile(filePath)
    const parsed = ensureEventArrayShape(parseNclexTimetableXlsx(buffer))
    const events = parsed.map((ev) => ({
      ...ev,
      id: normalizeParsedEventId(ev),
      // ensure stable string fields
      title: String(ev.title),
      course: String(ev.course),
      date: String(ev.date),
      time: String(ev.time),
      type: ev.type,
      sheet: String(ev.sheet ?? "xlsx"),
    }))

    // Upsert into DB so the calendar becomes dynamic.
    // If migration hasn't been applied yet, this will fail and we'll return XLSX data.
    try {
      await supabase.from("nclex_timetable_events").upsert(events, { onConflict: "id" })
    } catch (seedErr) {
      console.warn("[nclex-timetable] Seed into DB failed; returning XLSX-only events.", seedErr)
    }

    return NextResponse.json(
      {
        success: true,
        events,
        source: dbError ? `/schedule/${encodeURIComponent(FILENAME)}` : `seeded-from-xlsx:${encodeURIComponent(FILENAME)}`,
        sheetNames: ["NCLEX Calender", "OSCE Calender"],
      },
      { headers: corsHeaders }
    )
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to load timetable"
    console.error("[nclex-timetable]", message)
    return NextResponse.json(
      { success: false, events: [], error: message },
      { status: 500, headers: corsHeaders }
    )
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}
