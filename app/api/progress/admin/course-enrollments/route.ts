import { NextRequest, NextResponse } from "next/server"
import {requireAuth, isAdminRole } from "@/lib/api/auth"
import { getSupabaseClient, formatResponse } from "@/lib/api/supabase"
import { corsHeaders } from "@/lib/api/utils"

/**
 * GET /api/progress/admin/course-enrollments?courseId=X
 * Admin or active trainer. Returns enrollments for a course with student name and email.
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
    const courseIdParam = searchParams.get("courseId")
    const courseId = courseIdParam != null ? parseInt(courseIdParam, 10) : null
    if (courseId == null || Number.isNaN(courseId)) {
      return NextResponse.json(
        formatResponse(false, null, "Missing or invalid courseId"),
        { status: 400, headers: corsHeaders }
      )
    }
    const { data: enrollments, error } = await supabase
      .from("enrollments")
      .select("id, student_id, course_id, progress, status, created_at, plan_id, course_plans(name, plan_key)")
      .eq("course_id", courseId)
      .order("created_at", { ascending: false })
    if (error) throw error
    const studentIds = [...new Set((enrollments ?? []).map((e) => e.student_id).filter(Boolean))]
    let userMap: Record<number, { name: string; email: string }> = {}
    if (studentIds.length > 0) {
      const { data: users } = await supabase
        .from("users")
        .select("id, name, email")
        .in("id", studentIds)
      userMap = (users ?? []).reduce(
        (acc, u) => ({ ...acc, [u.id]: { name: u.name ?? "", email: u.email ?? "" } }),
        {} as Record<number, { name: string; email: string }>
      )
      const { data: students } = await supabase
        .from("students")
        .select("id, name, email")
        .in("id", studentIds)
      for (const s of students ?? []) {
        if (!userMap[s.id]) {
          userMap[s.id] = { name: s.name ?? "", email: s.email ?? "" }
        }
      }
    }
    const withStudent = (enrollments ?? []).map((e: any) => {
      const planObj = Array.isArray(e.course_plans) ? e.course_plans[0] : e.course_plans
      return {
        ...e,
        student_name: userMap[e.student_id]?.name ?? "—",
        student_email: userMap[e.student_id]?.email ?? "—",
        plan_name: typeof planObj?.name === "string" ? planObj.name : null,
        plan_key: typeof planObj?.plan_key === "string" ? planObj.plan_key : null,
      }
    })
    return NextResponse.json(formatResponse(true, withStudent), { headers: corsHeaders })
  } catch (err: unknown) {
    console.error("Error fetching course enrollments:", err)
    return NextResponse.json(
      formatResponse(false, null, err instanceof Error ? err.message : "Failed to fetch"),
      { status: 500, headers: corsHeaders }
    )
  }
}

export async function OPTIONS() {
  return NextResponse.json(null, { status: 200, headers: corsHeaders })
}
