import { NextRequest, NextResponse } from "next/server"
import {requireAuth, isAdminRole } from "@/lib/api/auth"
import { getSupabaseClient, formatResponse } from "@/lib/api/supabase"
import { corsHeaders } from "@/lib/api/utils"
import { buildProgressionOrderForCourse } from "@/lib/services/unlock-all-sections"

const NCLEX_COURSE_ID = 45

/**
 * POST /api/progress/admin/unlock-all-sections
 * Admin only. Unlocks all sections for an enrollment by:
 * 1. Building the full progression order for the course
 *    (ETHTL115 uses the GNPS level pathway including cases + decisions)
 * 2. Inserting all section IDs into course_trial_progress
 * 3. Updating enrollment progress to 100%
 * 4. For NCLEX (course 45), ensuring course_unlock_requests is approved
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
    if (!isAdminRole(authResult.user.role)) {
      return NextResponse.json(formatResponse(false, null, "Forbidden"), {
        status: 403,
        headers: corsHeaders,
      })
    }
    const body = await request.json().catch(() => ({}))
    const enrollmentId = body.enrollmentId != null ? parseInt(String(body.enrollmentId), 10) : NaN
    const courseId = body.courseId != null ? parseInt(String(body.courseId), 10) : NaN
    if (Number.isNaN(enrollmentId) || Number.isNaN(courseId)) {
      return NextResponse.json(
        formatResponse(false, null, "Missing or invalid enrollmentId or courseId"),
        { status: 400, headers: corsHeaders }
      )
    }

    const supabase = getSupabaseClient()

    // Verify enrollment exists and belongs to this course
    const { data: enrollment, error: enrollmentError } = await supabase
      .from("enrollments")
      .select("id, student_id, course_id")
      .eq("id", enrollmentId)
      .eq("course_id", courseId)
      .maybeSingle()
    if (enrollmentError || !enrollment) {
      return NextResponse.json(
        formatResponse(false, null, "Enrollment not found"),
        { status: 404, headers: corsHeaders }
      )
    }

    const { data: courseRow } = await supabase
      .from("courses")
      .select("id, course_code, name")
      .eq("id", courseId)
      .maybeSingle()

    // Prefer course_code; fall back to code embedded in the course name (e.g. "ETHTL115 · …").
    let courseCode = (courseRow?.course_code ?? "").trim()
    if (!courseCode && typeof courseRow?.name === "string") {
      const fromName = courseRow.name.toUpperCase().match(/ETHTL1(?:1[5-9]|2[0-4])/)
      if (fromName) courseCode = fromName[0]
    }

    const baseUrl = new URL(request.url).origin
    const sectionIds = await buildProgressionOrderForCourse({
      baseUrl,
      courseId,
      courseCode,
    })
    if (sectionIds.length === 0) {
      return NextResponse.json(
        formatResponse(
          false,
          null,
          courseCode
            ? `Could not determine course structure for ${courseCode}`
            : "Could not determine course structure (missing course_code)"
        ),
        { status: 400, headers: corsHeaders }
      )
    }

    const now = new Date().toISOString()
    const rows = sectionIds.map((section_id) => ({
      enrollment_id: enrollmentId,
      course_id: courseId,
      section_id,
      completed_at: now,
      updated_at: now,
    }))

    const { error: upsertError } = await supabase
      .from("course_trial_progress")
      .upsert(rows, { onConflict: "enrollment_id,section_id", ignoreDuplicates: false })
    if (upsertError) throw upsertError

    const totalSections = sectionIds.length
    const progressPercent = 100

    await supabase
      .from("enrollments")
      .update({ progress: progressPercent, updated_at: now })
      .eq("id", enrollmentId)

    // For NCLEX, ensure course_unlock_requests is approved so modules 10+ are accessible
    if (courseId === NCLEX_COURSE_ID) {
      const { data: existing } = await supabase
        .from("course_unlock_requests")
        .select("id, status")
        .eq("enrollment_id", enrollmentId)
        .eq("course_id", courseId)
        .maybeSingle()

      if (existing) {
        if (existing.status !== "approved") {
          await supabase
            .from("course_unlock_requests")
            .update({
              status: "approved",
              reviewed_at: now,
              reviewed_by: authResult.user.id,
              updated_at: now,
            })
            .eq("id", existing.id)
        }
      } else {
        await supabase.from("course_unlock_requests").insert({
          enrollment_id: enrollmentId,
          course_id: courseId,
          status: "approved",
          reviewed_at: now,
          reviewed_by: authResult.user.id,
          updated_at: now,
        })
      }
    }

    return NextResponse.json(
      formatResponse(true, {
        enrollmentId,
        courseId,
        sectionsUnlocked: totalSections,
        progressPercent,
      }, "All sections unlocked successfully"),
      { headers: corsHeaders }
    )
  } catch (err: unknown) {
    console.error("Error unlocking all sections:", err)
    return NextResponse.json(
      formatResponse(false, null, err instanceof Error ? err.message : "Failed to unlock sections"),
      { status: 500, headers: corsHeaders }
    )
  }
}

export async function OPTIONS() {
  return NextResponse.json(null, { status: 200, headers: corsHeaders })
}
