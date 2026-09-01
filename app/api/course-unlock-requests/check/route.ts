import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/api/auth"
import { getSupabaseClient, formatResponse } from "@/lib/api/supabase"
import { corsHeaders } from "@/lib/api/utils"

/** GET /api/course-unlock-requests/check?enrollmentId=&courseId= - Student: check if enrollment has approved or pending request */
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
    const enrollmentIdParam = searchParams.get("enrollmentId")
    const courseIdParam = searchParams.get("courseId")
    if (!enrollmentIdParam || !courseIdParam) {
      return NextResponse.json(
        formatResponse(false, null, "Missing enrollmentId or courseId"),
        { status: 400, headers: corsHeaders }
      )
    }
    const enrollmentId = parseInt(enrollmentIdParam, 10)
    const courseId = parseInt(courseIdParam, 10)
    if (Number.isNaN(enrollmentId) || Number.isNaN(courseId)) {
      return NextResponse.json(
        formatResponse(false, null, "Invalid enrollmentId or courseId"),
        { status: 400, headers: corsHeaders }
      )
    }
    const supabase = getSupabaseClient()
    const { data: enrollment, error: enrollmentError } = await supabase
      .from("enrollments")
      .select("id, student_id, course_id")
      .eq("id", enrollmentId)
      .eq("course_id", courseId)
      .eq("student_id", authResult.user.id)
      .maybeSingle()
    if (enrollmentError || !enrollment) {
      return NextResponse.json(
        formatResponse(false, null, "Enrollment not found or access denied"),
        { status: 404, headers: corsHeaders }
      )
    }
    const { data: row, error } = await supabase
      .from("course_unlock_requests")
      .select("status")
      .eq("enrollment_id", enrollmentId)
      .eq("course_id", courseId)
      .maybeSingle()
    if (error) throw error
    const approved = row?.status === "approved"
    const pending = row?.status === "pending"
    return NextResponse.json(
      formatResponse(true, { approved, pending }),
      { headers: corsHeaders }
    )
  } catch (err: unknown) {
    console.error("Error checking course unlock:", err)
    return NextResponse.json(
      formatResponse(false, null, err instanceof Error ? err.message : "Failed to check"),
      { status: 500, headers: corsHeaders }
    )
  }
}
