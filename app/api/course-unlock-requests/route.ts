import { NextRequest, NextResponse } from "next/server"
import {requireAuth, isAdminRole } from "@/lib/api/auth"
import { getSupabaseClient, formatResponse } from "@/lib/api/supabase"
import { corsHeaders } from "@/lib/api/utils"

/** POST /api/course-unlock-requests - Student: create a request to unlock extended modules (e.g. NCLEX) */
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json(formatResponse(false, null, "Unauthorized"), {
        status: 401,
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
    const { data: existing } = await supabase
      .from("course_unlock_requests")
      .select("id, status")
      .eq("enrollment_id", enrollmentId)
      .eq("course_id", courseId)
      .maybeSingle()
    if (existing) {
      if (existing.status === "approved") {
        return NextResponse.json(
          formatResponse(true, { id: existing.id, status: "approved", message: "Already approved" }),
          { headers: corsHeaders }
        )
      }
      if (existing.status === "pending") {
        return NextResponse.json(
          formatResponse(true, { id: existing.id, status: "pending", message: "Request already pending" }),
          { headers: corsHeaders }
        )
      }
      if (existing.status === "rejected") {
        const { data: updated, error: updateError } = await supabase
          .from("course_unlock_requests")
          .update({ status: "pending", reviewed_at: null, reviewed_by: null, updated_at: new Date().toISOString() })
          .eq("id", existing.id)
          .select("id, status")
          .single()
        if (updateError) throw updateError
        return NextResponse.json(
          formatResponse(true, { id: updated.id, status: updated.status, message: "Request resubmitted" }),
          { headers: corsHeaders }
        )
      }
    }
    const { data: inserted, error: insertError } = await supabase
      .from("course_unlock_requests")
      .insert({
        enrollment_id: enrollmentId,
        course_id: courseId,
        status: "pending",
      })
      .select("id, status")
      .single()
    if (insertError) throw insertError
    return NextResponse.json(
      formatResponse(true, { id: inserted.id, status: inserted.status }),
      { headers: corsHeaders }
    )
  } catch (err: unknown) {
    console.error("Error creating course unlock request:", err)
    return NextResponse.json(
      formatResponse(false, null, err instanceof Error ? err.message : "Failed to create request"),
      { status: 500, headers: corsHeaders }
    )
  }
}

/** GET /api/course-unlock-requests?courseId=45&status=pending - Admin: list requests with student/course info */
export async function GET(request: NextRequest) {
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
    const { searchParams } = new URL(request.url)
    const courseIdParam = searchParams.get("courseId")
    const statusParam = searchParams.get("status") || "pending"
    const courseId = courseIdParam != null ? parseInt(courseIdParam, 10) : null
    const supabase = getSupabaseClient()
    let query = supabase
      .from("course_unlock_requests")
      .select(`
        id,
        enrollment_id,
        course_id,
        status,
        requested_at,
        reviewed_at,
        reviewed_by,
        enrollments ( id, student_id, course_id ),
        courses ( id, name )
      `)
      .order("requested_at", { ascending: false })
    if (statusParam) query = query.eq("status", statusParam)
    if (courseId != null && !Number.isNaN(courseId)) query = query.eq("course_id", courseId)
    const { data: rows, error } = await query
    if (error) throw error
    const list = (rows ?? []) as Array<{ id: number; enrollment_id: number; course_id: number; status: string; requested_at: string; enrollments?: { student_id: number } | null; courses?: { name: string } | null }>
    const studentIds = [...new Set(list.map((r) => r.enrollments?.student_id).filter(Boolean) as number[])]
    let userMap: Record<number, { name: string; email: string }> = {}
    if (studentIds.length > 0) {
      const { data: users } = await supabase.from("users").select("id, name, email").in("id", studentIds)
      userMap = (users ?? []).reduce((acc, u) => ({ ...acc, [u.id]: { name: u.name ?? "", email: u.email ?? "" } }), {} as Record<number, { name: string; email: string }>)
    }
    const withStudent = list.map((r) => ({
      ...r,
      student_name: r.enrollments?.student_id != null ? userMap[r.enrollments.student_id]?.name ?? "—" : "—",
      student_email: r.enrollments?.student_id != null ? userMap[r.enrollments.student_id]?.email ?? "—" : "—",
      course_name: r.courses?.name ?? "—",
    }))
    return NextResponse.json(formatResponse(true, withStudent), { headers: corsHeaders })
  } catch (err: unknown) {
    console.error("Error listing course unlock requests:", err)
    return NextResponse.json(
      formatResponse(false, null, err instanceof Error ? err.message : "Failed to list"),
      { status: 500, headers: corsHeaders }
    )
  }
}
