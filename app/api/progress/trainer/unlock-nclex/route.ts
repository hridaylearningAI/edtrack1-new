import { NextRequest, NextResponse } from "next/server"
import {requireAuth, isAdminRole } from "@/lib/api/auth"
import { getSupabaseClient, formatResponse } from "@/lib/api/supabase"
import { corsHeaders } from "@/lib/api/utils"
import { buildProgressionOrderForCourse } from "@/lib/services/unlock-all-sections"

const NCLEX_COURSE_ID = 45

/**
 * POST /api/progress/trainer/unlock-nclex
 * Unlocks all NCLEX sections for the current authenticated user's own enrollment.
 *
 * Used by the trainer portal so the trainer can open the full NCLEX course experience.
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

    const studentId =
      typeof authResult.user.id === "number" ? authResult.user.id : parseInt(String(authResult.user.id), 10)
    if (Number.isNaN(studentId)) {
      return NextResponse.json(formatResponse(false, null, "Invalid user id"), {
        status: 400,
        headers: corsHeaders,
      })
    }

    const supabase = getSupabaseClient()

    // Enforce trainer portal access:
    // - Admins can unlock
    // - Active trainers (by email in `trainers` table) can unlock their own NCLEX enrollment
    if (!isAdminRole(authResult.user.role)) {
      const email = authResult.user.email
      if (!email) {
        return NextResponse.json(formatResponse(false, null, "Trainer access denied"), {
          status: 403,
          headers: corsHeaders,
        })
      }
      const { data: trainer } = await supabase
        .from("trainers")
        .select("id, status")
        .ilike("email", email)
        .maybeSingle()

      if (!trainer || trainer.status !== "Active") {
        return NextResponse.json(formatResponse(false, null, "Trainer access denied"), {
          status: 403,
          headers: corsHeaders,
        })
      }
    }

    // Ensure we only unlock the authenticated user's own enrollment.
    const { data: enrollment } = await supabase
      .from("enrollments")
      .select("id, student_id, course_id")
      .eq("student_id", studentId)
      .eq("course_id", NCLEX_COURSE_ID)
      .maybeSingle()

    if (!enrollment) {
      return NextResponse.json(formatResponse(false, null, "NCLEX enrollment not found for this trainer"), {
        status: 404,
        headers: corsHeaders,
      })
    }

    const enrollmentId = (enrollment as { id: number }).id

    const baseUrl = new URL(request.url).origin
    const sectionIds = await buildProgressionOrderForCourse({ baseUrl, courseId: NCLEX_COURSE_ID })
    if (sectionIds.length === 0) {
      return NextResponse.json(formatResponse(false, null, "Could not determine course structure"), {
        status: 400,
        headers: corsHeaders,
      })
    }

    const now = new Date().toISOString()
    const rows = sectionIds.map((section_id) => ({
      enrollment_id: enrollmentId,
      course_id: NCLEX_COURSE_ID,
      section_id,
      completed_at: now,
      updated_at: now,
    }))

    const { error: upsertError } = await supabase
      .from("course_trial_progress")
      .upsert(rows, { onConflict: "enrollment_id,section_id", ignoreDuplicates: false })
    if (upsertError) throw upsertError

    await supabase.from("enrollments").update({ progress: 100, updated_at: now }).eq("id", enrollmentId)

    // For NCLEX, ensure course_unlock_requests is approved so modules 10+ are accessible.
    {
      const { data: existing } = await supabase
        .from("course_unlock_requests")
        .select("id, status")
        .eq("enrollment_id", enrollmentId)
        .eq("course_id", NCLEX_COURSE_ID)
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
          course_id: NCLEX_COURSE_ID,
          status: "approved",
          reviewed_at: now,
          reviewed_by: authResult.user.id,
          updated_at: now,
        })
      }
    }

    return NextResponse.json(
      formatResponse(true, { enrollmentId, sectionsUnlocked: sectionIds.length, progressPercent: 100 }, "NCLEX unlocked"),
      { headers: corsHeaders }
    )
  } catch (err: unknown) {
    console.error("Error unlocking NCLEX for trainer:", err)
    return NextResponse.json(
      formatResponse(false, null, err instanceof Error ? err.message : "Failed to unlock NCLEX"),
      { status: 500, headers: corsHeaders }
    )
  }
}

export async function OPTIONS() {
  return NextResponse.json(null, { status: 200, headers: corsHeaders })
}

