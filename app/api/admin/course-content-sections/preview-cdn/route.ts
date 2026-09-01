import { NextRequest, NextResponse } from "next/server"
import { corsHeaders } from "@/lib/api/utils"
import { getSupabaseClient, formatResponse } from "@/lib/api/supabase"
import {requireAuth, isAdminRole } from "@/lib/api/auth"
import { getContentBaseUrlForFolder } from "@/lib/content-url"
import type { CourseStructureManifest } from "@/lib/types/course-structure"
import type { SectionInput } from "@/lib/course-content-sections"

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
 * GET /api/admin/course-content-sections/preview-cdn?courseId=123
 * Returns manifest.json from CDN (not DB) as section inputs for the admin form.
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
  const { data: course, error } = await supabase.from("courses").select("content_folder").eq("id", courseId).maybeSingle()
  if (error || !course) {
    return NextResponse.json(formatResponse(false, null, "Course not found"), { status: 404, headers: corsHeaders })
  }

  const folder = course.content_folder?.trim()
  const base = getContentBaseUrlForFolder(folder || null) || (process.env.NEXT_PUBLIC_H5P_CONTENT_BASE_URL || "").replace(/\/$/, "")
  const manifestUrl = base ? `${base}/manifest.json` : null
  if (!manifestUrl) {
    return NextResponse.json(formatResponse(false, null, "No content base URL for this course."), { status: 400, headers: corsHeaders })
  }

  try {
    const res = await fetch(manifestUrl, { next: { revalidate: 0 } })
    if (!res.ok) {
      return NextResponse.json(formatResponse(false, null, `CDN returned ${res.status}`), { status: 502, headers: corsHeaders })
    }
    const data = (await res.json()) as CourseStructureManifest
    if (!Array.isArray(data?.topics)) {
      return NextResponse.json(formatResponse(false, null, "Invalid manifest.json shape"), { status: 422, headers: corsHeaders })
    }

    const sections: SectionInput[] = []
    if (data.programOverview?.folder) {
      sections.push({
        section_kind: "program_overview",
        topic_slug: null,
        folder: data.programOverview.folder,
        label: data.programOverview.label,
      })
    }
    for (const t of data.topics) {
      sections.push({
        section_kind: "topic",
        topic_slug: t.id,
        folder: t.folder,
        label: t.label,
      })
    }

    return NextResponse.json(formatResponse(true, { sections, manifestUrl }, "Loaded from CDN manifest.json"), { headers: corsHeaders })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Fetch failed"
    return NextResponse.json(formatResponse(false, null, msg), { status: 502, headers: corsHeaders })
  }
}
