import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/api/auth"
import { getSupabaseClient, formatResponse } from "@/lib/api/supabase"
import { corsHeaders } from "@/lib/api/utils"

/** GET /api/course-forums?courseId=&enrollmentId= - List forums for course (general + personal for this enrollment). Creates general/personal if missing. */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json(formatResponse(false, null, "Unauthorized"), {
        status: 401,
        headers: corsHeaders,
      })
    }
    const { searchParams } = new URL(request.url)
    const courseIdParam = searchParams.get("courseId")
    const enrollmentIdParam = searchParams.get("enrollmentId")
    const courseId = courseIdParam != null ? parseInt(courseIdParam, 10) : null
    const enrollmentId = enrollmentIdParam != null ? parseInt(enrollmentIdParam, 10) : null
    if (courseId == null || Number.isNaN(courseId)) {
      return NextResponse.json(
        formatResponse(false, null, "Missing or invalid courseId"),
        { status: 400, headers: corsHeaders }
      )
    }
    const supabase = getSupabaseClient()

    const { data: enrollment } = enrollmentId != null && !Number.isNaN(enrollmentId)
      ? await supabase
          .from("enrollments")
          .select("id, student_id, course_id")
          .eq("id", enrollmentId)
          .eq("course_id", courseId)
          .eq("student_id", authResult.user.id)
          .maybeSingle()
      : { data: null }
    if (enrollmentId != null && !enrollment) {
      return NextResponse.json(
        formatResponse(false, null, "Enrollment not found or access denied"),
        { status: 404, headers: corsHeaders }
      )
    }

    let { data: generalForum } = await supabase
      .from("course_forums")
      .select("id, course_id, type, enrollment_id, created_at")
      .eq("course_id", courseId)
      .eq("type", "general")
      .is("enrollment_id", null)
      .maybeSingle()
    if (!generalForum) {
      const { data: inserted } = await supabase
        .from("course_forums")
        .insert({ course_id: courseId, type: "general", enrollment_id: null })
        .select("id, course_id, type, enrollment_id, created_at")
        .single()
      generalForum = inserted ?? null
    }

    let personalForum = null
    if (enrollment?.id) {
      const { data: existing } = await supabase
        .from("course_forums")
        .select("id, course_id, type, enrollment_id, created_at")
        .eq("course_id", courseId)
        .eq("type", "personal")
        .eq("enrollment_id", enrollment.id)
        .maybeSingle()
      if (existing) {
        personalForum = existing
      } else {
        const { data: inserted } = await supabase
          .from("course_forums")
          .insert({ course_id: courseId, type: "personal", enrollment_id: enrollment.id })
          .select("id, course_id, type, enrollment_id, created_at")
          .single()
        personalForum = inserted ?? null
      }
    }

    const forums = [generalForum, personalForum].filter(Boolean)
    return NextResponse.json(formatResponse(true, forums), { headers: corsHeaders })
  } catch (err: unknown) {
    console.error("Error listing course forums:", err)
    return NextResponse.json(
      formatResponse(false, null, err instanceof Error ? err.message : "Failed to list forums"),
      { status: 500, headers: corsHeaders }
    )
  }
}
