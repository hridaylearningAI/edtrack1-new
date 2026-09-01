import { NextRequest, NextResponse } from "next/server"
import { corsHeaders } from "@/lib/api/utils"
import { getSupabaseClient, formatResponse } from "@/lib/api/supabase"
import {requireAuth, isAdminRole } from "@/lib/api/auth"
import type { CourseContentSectionRow, SectionInput } from "@/lib/course-content-sections"
import { validateSectionInputs } from "@/lib/course-content-sections"

async function requireAdmin(request: NextRequest) {
  const authResult = await requireAuth(request)
  if (!authResult.authenticated || !authResult.user) {
    return { ok: false as const, response: NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401, headers: corsHeaders }) }
  }
  if (!isAdminRole(authResult.user.role)) {
    return {
      ok: false as const,
      response: NextResponse.json({ success: false, error: "Access denied. Admin only." }, { status: 403, headers: corsHeaders }),
    }
  }
  return { ok: true as const, user: authResult.user }
}

/**
 * GET /api/admin/course-content-sections?courseId=123
 */
export async function GET(request: NextRequest) {
  const adminCheck = await requireAdmin(request)
  if (!adminCheck.ok) return adminCheck.response

  const courseIdParam = new URL(request.url).searchParams.get("courseId")
  const courseId = courseIdParam ? parseInt(courseIdParam, 10) : NaN
  if (!Number.isFinite(courseId) || courseId <= 0) {
    return NextResponse.json(formatResponse(false, null, "courseId is required"), { status: 400, headers: corsHeaders })
  }

  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from("course_content_sections")
    .select(
      "id, course_id, sort_order, section_kind, topic_slug, folder, label, practice_q_source_topic_num, quiz_source_topic_num, ngn_source_topic_num, created_at, updated_at"
    )
    .eq("course_id", courseId)
    .order("sort_order", { ascending: true })

  if (error) {
    return NextResponse.json(formatResponse(false, null, error.message), { status: 500, headers: corsHeaders })
  }

  return NextResponse.json(formatResponse(true, { sections: (data || []) as CourseContentSectionRow[] }, "OK"), { headers: corsHeaders })
}

type PutBody = {
  course_id: number
  sections: SectionInput[]
}

/**
 * PUT /api/admin/course-content-sections
 * Replaces all sections for the course (full save).
 */
export async function PUT(request: NextRequest) {
  const adminCheck = await requireAdmin(request)
  if (!adminCheck.ok) return adminCheck.response

  let body: PutBody
  try {
    body = (await request.json()) as PutBody
  } catch {
    return NextResponse.json(formatResponse(false, null, "Invalid JSON"), { status: 400, headers: corsHeaders })
  }

  const courseId = typeof body.course_id === "number" ? body.course_id : parseInt(String(body.course_id), 10)
  if (!Number.isFinite(courseId) || courseId <= 0) {
    return NextResponse.json(formatResponse(false, null, "course_id is required"), { status: 400, headers: corsHeaders })
  }

  const sections = Array.isArray(body.sections) ? body.sections : []
  const err = validateSectionInputs(sections)
  if (err) {
    return NextResponse.json(formatResponse(false, null, err), { status: 400, headers: corsHeaders })
  }

  const supabase = getSupabaseClient()

  const { error: delErr } = await supabase.from("course_content_sections").delete().eq("course_id", courseId)
  if (delErr) {
    return NextResponse.json(formatResponse(false, null, delErr.message), { status: 500, headers: corsHeaders })
  }

  if (sections.length === 0) {
    return NextResponse.json(
      formatResponse(true, { sections: [] }, "Cleared course structure; learn page will fall back to CDN manifest.json."),
      { headers: corsHeaders }
    )
  }

  const rows = sections.map((s, index) => ({
    course_id: courseId,
    sort_order: index,
    section_kind: s.section_kind,
    topic_slug: s.section_kind === "topic" ? (s.topic_slug ?? "").trim() : null,
    folder: s.folder.trim(),
    label: s.label.trim(),
    practice_q_source_topic_num:
      s.section_kind === "topic" && s.practice_q_source_topic_num != null && s.practice_q_source_topic_num > 0
        ? s.practice_q_source_topic_num
        : null,
    quiz_source_topic_num:
      s.section_kind === "topic" && s.quiz_source_topic_num != null && s.quiz_source_topic_num > 0
        ? s.quiz_source_topic_num
        : null,
    ngn_source_topic_num:
      s.section_kind === "topic" && s.ngn_source_topic_num != null && s.ngn_source_topic_num > 0
        ? s.ngn_source_topic_num
        : null,
    updated_at: new Date().toISOString(),
  }))

  const { data: inserted, error: insErr } = await supabase.from("course_content_sections").insert(rows).select()

  if (insErr) {
    return NextResponse.json(formatResponse(false, null, insErr.message), { status: 500, headers: corsHeaders })
  }

  return NextResponse.json(
    formatResponse(true, { sections: inserted as CourseContentSectionRow[] }, "Saved course content order."),
    { headers: corsHeaders }
  )
}
