import { NextRequest, NextResponse } from "next/server"
import {requireAuth, isAdminRole } from "@/lib/api/auth"
import { getSupabaseClient, formatResponse } from "@/lib/api/supabase"
import { corsHeaders } from "@/lib/api/utils"

/** GET /api/course-forums/admin - List general forums (admin only). Query: courseId (optional). */
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
    const courseId = courseIdParam != null ? parseInt(courseIdParam, 10) : null

    const supabase = getSupabaseClient()
    let query = supabase
      .from("course_forums")
      .select("id, course_id, type, created_at")
      .eq("type", "general")
      .is("enrollment_id", null)
    if (courseId != null && !Number.isNaN(courseId)) {
      query = query.eq("course_id", courseId)
    }
    const { data: forums, error } = await query.order("course_id", { ascending: true })
    if (error) throw error
    const list = forums ?? []
    const courseIds = [...new Set((list as { course_id: number }[]).map((f) => f.course_id))]
    let courseMap: Record<number, string> = {}
    if (courseIds.length > 0) {
      const { data: courses } = await supabase.from("courses").select("id, name").in("id", courseIds)
      courseMap = (courses ?? []).reduce(
        (acc, c) => ({ ...acc, [c.id]: (c.name && c.name.trim()) ? c.name.trim() : `Course ${c.id}` }),
        {} as Record<number, string>
      )
    }
    const withCourseName = list.map((f: { course_id: number; [k: string]: unknown }) => ({
      ...f,
      course_name: courseMap[f.course_id] ?? `Course ${f.course_id}`,
    }))
    return NextResponse.json(formatResponse(true, withCourseName), { headers: corsHeaders })
  } catch (err: unknown) {
    console.error("Error listing admin course forums:", err)
    return NextResponse.json(
      formatResponse(false, null, err instanceof Error ? err.message : "Failed to list forums"),
      { status: 500, headers: corsHeaders }
    )
  }
}
