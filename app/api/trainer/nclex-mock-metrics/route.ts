import { NextRequest, NextResponse } from "next/server"
import {requireAuth, isAdminRole } from "@/lib/api/auth"
import { getSupabaseClient, formatResponse } from "@/lib/api/supabase"
import { corsHeaders } from "@/lib/api/utils"
import {
  NCLEX_EXAM_ONLY_COURSE_CODE,
  NCLEX_EXAM_ONLY_COURSE_ID,
  NCLEX_FULL_COURSE_ID,
  NCLEX_PROCTORING_COURSE_IDS,
} from "@/lib/nclex-exam-only"

type ProctoringSummaryJson = {
  terminated?: boolean
  terminateReason?: string | null
  warningCount?: number
  lookAwayCount?: number
  noFaceCount?: number
  multipleFacesCount?: number
  tabHiddenCount?: number
  focusLeaveCount?: number
  fullscreenExitCount?: number
  screenshotAttemptCount?: number
}

type AttemptRow = {
  enrollment_id: number
  student_id: number
  course_id: number
  marks_earned: number
  passing_marks: number
  passed: boolean
  correct_count: number
  total_questions_in_sequence: number
  completed_at: string
  proctoring_terminated?: boolean | null
  proctoring_terminate_reason?: string | null
  proctoring_summary?: ProctoringSummaryJson | null
}

function summaryWarningCount(summary: ProctoringSummaryJson | null | undefined): number {
  if (!summary || typeof summary !== "object") return 0
  return typeof summary.warningCount === "number" ? summary.warningCount : 0
}

function parseCourseIds(searchParams: URLSearchParams): number[] | "all" | null {
  const multi = searchParams.get("courseIds")
  if (multi != null && multi.trim() !== "") {
    if (multi.trim().toLowerCase() === "all") return "all"
    const ids = multi
      .split(",")
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !Number.isNaN(n))
    return ids.length > 0 ? ids : null
  }
  const single = searchParams.get("courseId")
  if (single != null && single.trim() !== "") {
    if (single.trim().toLowerCase() === "all") return "all"
    const id = parseInt(single, 10)
    return Number.isNaN(id) ? null : [id]
  }
  return "all"
}

/**
 * GET /api/trainer/nclex-mock-metrics?courseId=45
 * GET /api/trainer/nclex-mock-metrics?courseIds=45,60
 * GET /api/trainer/nclex-mock-metrics?courseId=all
 * Admin or active trainer. Per-enrollment NCLEX mock test metrics.
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json(formatResponse(false, null, "Unauthorized"), {
        status: 401,
        headers: corsHeaders,
      })
    }

    const supabase = getSupabaseClient()
    if (!isAdminRole(authResult.user.role)) {
      const email = authResult.user.email
      const { data: trainer } =
        email != null
          ? await supabase.from("trainers").select("id, status").ilike("email", email).maybeSingle()
          : { data: null }
      if (!trainer || trainer.status !== "Active") {
        return NextResponse.json(formatResponse(false, null, "Forbidden"), {
          status: 403,
          headers: corsHeaders,
        })
      }
    }

    const { searchParams } = new URL(request.url)
    const parsed = parseCourseIds(searchParams)
    if (parsed == null) {
      return NextResponse.json(formatResponse(false, null, "Missing or invalid courseId(s)"), {
        status: 400,
        headers: corsHeaders,
      })
    }

    // Resolve exam-only id from DB when possible (fallback to known id).
    let examOnlyId = NCLEX_EXAM_ONLY_COURSE_ID
    const { data: examOnlyRow } = await supabase
      .from("courses")
      .select("id, name, course_code")
      .ilike("course_code", NCLEX_EXAM_ONLY_COURSE_CODE)
      .maybeSingle()
    if (examOnlyRow?.id != null) examOnlyId = examOnlyRow.id

    const defaultIds = [...new Set([...NCLEX_PROCTORING_COURSE_IDS, examOnlyId, NCLEX_FULL_COURSE_ID])]
    const courseIds = parsed === "all" ? defaultIds : parsed

    const { data: courseRows } = await supabase
      .from("courses")
      .select("id, name, course_code")
      .in("id", courseIds)
    const courseMap = (courseRows ?? []).reduce(
      (acc, c) => {
        acc[c.id] = {
          name: (c.name ?? "").trim() || `Course ${c.id}`,
          code: (c.course_code ?? "").trim() || String(c.id),
        }
        return acc
      },
      {} as Record<number, { name: string; code: string }>
    )

    const { data: enrollments, error: enrErr } = await supabase
      .from("enrollments")
      .select("id, student_id, course_id")
      .in("course_id", courseIds)

    if (enrErr) throw enrErr

    const enrollmentList = enrollments ?? []
    const studentIds = [...new Set(enrollmentList.map((e) => e.student_id).filter(Boolean))]

    let userMap: Record<number, { name: string; email: string }> = {}
    if (studentIds.length > 0) {
      const { data: users } = await supabase.from("users").select("id, name, email").in("id", studentIds)
      userMap = (users ?? []).reduce(
        (acc, u) => ({ ...acc, [u.id]: { name: u.name ?? "", email: u.email ?? "" } }),
        {} as Record<number, { name: string; email: string }>
      )
      const { data: students } = await supabase.from("students").select("id, name, email").in("id", studentIds)
      for (const s of students ?? []) {
        if (!userMap[s.id]) userMap[s.id] = { name: s.name ?? "", email: s.email ?? "" }
      }
    }

    const { data: attempts, error: attErr } = await supabase
      .from("nclex_mock_attempts")
      .select(
        "enrollment_id, student_id, course_id, marks_earned, passing_marks, passed, correct_count, total_questions_in_sequence, completed_at, proctoring_terminated, proctoring_terminate_reason, proctoring_summary"
      )
      .in("course_id", courseIds)
      .order("completed_at", { ascending: false })
      .limit(5000)

    if (attErr) throw attErr

    const byEnrollment = new Map<number, AttemptRow[]>()
    for (const a of (attempts ?? []) as AttemptRow[]) {
      const list = byEnrollment.get(a.enrollment_id) ?? []
      list.push(a)
      byEnrollment.set(a.enrollment_id, list)
    }

    let courseTerminatedAttempts = 0
    let courseStudentsWithFlags = 0

    const metrics = enrollmentList.map((e) => {
      const list = byEnrollment.get(e.id) ?? []
      const sorted = [...list].sort(
        (x, y) => new Date(y.completed_at).getTime() - new Date(x.completed_at).getTime()
      )
      const last = sorted[0]
      const bestMarks = sorted.length ? Math.max(...sorted.map((x) => x.marks_earned)) : null
      const passCount = sorted.filter((x) => x.passed).length
      const terminatedCount = sorted.filter((x) => !!x.proctoring_terminated).length
      const flaggedCount = sorted.filter(
        (x) => !!x.proctoring_terminated || summaryWarningCount(x.proctoring_summary) > 0
      ).length
      courseTerminatedAttempts += terminatedCount
      if (flaggedCount > 0) courseStudentsWithFlags += 1

      const lastSummary = last?.proctoring_summary ?? null
      const u = userMap[e.student_id]
      const courseMeta = courseMap[e.course_id]
      return {
        enrollment_id: e.id,
        student_id: e.student_id,
        course_id: e.course_id,
        course_name: courseMeta?.name ?? `Course ${e.course_id}`,
        course_code: courseMeta?.code ?? String(e.course_id),
        student_name: u?.name ?? "—",
        student_email: u?.email ?? "—",
        attempt_count: sorted.length,
        last_completed_at: last?.completed_at ?? null,
        last_passed: last?.passed ?? null,
        last_marks_earned: last?.marks_earned ?? null,
        last_passing_marks: last?.passing_marks ?? null,
        last_correct_count: last?.correct_count ?? null,
        last_total_questions: last?.total_questions_in_sequence ?? null,
        best_marks_earned: bestMarks,
        pass_count: passCount,
        last_proctoring_terminated: last?.proctoring_terminated ?? false,
        last_proctoring_terminate_reason: last?.proctoring_terminate_reason ?? null,
        last_proctoring_warning_count: summaryWarningCount(lastSummary),
        last_proctoring_look_away_count:
          typeof lastSummary?.lookAwayCount === "number" ? lastSummary.lookAwayCount : 0,
        last_proctoring_multiple_faces_count:
          typeof lastSummary?.multipleFacesCount === "number" ? lastSummary.multipleFacesCount : 0,
        last_proctoring_tab_hidden_count:
          typeof lastSummary?.tabHiddenCount === "number" ? lastSummary.tabHiddenCount : 0,
        last_proctoring_focus_leave_count:
          typeof lastSummary?.focusLeaveCount === "number" ? lastSummary.focusLeaveCount : 0,
        last_proctoring_fullscreen_exit_count:
          typeof lastSummary?.fullscreenExitCount === "number"
            ? lastSummary.fullscreenExitCount
            : 0,
        last_proctoring_screenshot_attempt_count:
          typeof lastSummary?.screenshotAttemptCount === "number"
            ? lastSummary.screenshotAttemptCount
            : 0,
        proctoring_terminated_attempt_count: terminatedCount,
        proctoring_flagged_attempt_count: flaggedCount,
      }
    })

    metrics.sort((a, b) => {
      if (a.proctoring_terminated_attempt_count !== b.proctoring_terminated_attempt_count) {
        return b.proctoring_terminated_attempt_count - a.proctoring_terminated_attempt_count
      }
      if (a.attempt_count === 0 && b.attempt_count > 0) return 1
      if (b.attempt_count === 0 && a.attempt_count > 0) return -1
      const ta = a.last_completed_at ? new Date(a.last_completed_at).getTime() : 0
      const tb = b.last_completed_at ? new Date(b.last_completed_at).getTime() : 0
      return tb - ta
    })

    return NextResponse.json(
      formatResponse(
        true,
        {
          courseIds,
          courses: courseIds.map((id) => ({
            id,
            name: courseMap[id]?.name ?? `Course ${id}`,
            code: courseMap[id]?.code ?? String(id),
          })),
          metrics,
          proctoringOverview: {
            terminated_attempt_count: courseTerminatedAttempts,
            students_with_flags: courseStudentsWithFlags,
          },
        },
        "NCLEX mock metrics retrieved"
      ),
      {
        headers: corsHeaders,
      }
    )
  } catch (err: unknown) {
    console.error("Error fetching NCLEX mock metrics:", err)
    return NextResponse.json(
      formatResponse(false, null, err instanceof Error ? err.message : "Failed to fetch mock metrics"),
      { status: 500, headers: corsHeaders }
    )
  }
}

export async function OPTIONS() {
  return NextResponse.json(null, { status: 200, headers: corsHeaders })
}
