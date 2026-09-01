import { NextRequest, NextResponse } from "next/server"
import {
  buildH5pContentUrl,
  getCaseStudyUrl,
  getH5pCompanionFolder,
  CONTENT_PATHS,
} from "@/lib/content-url"
import { getSupabaseClient } from "@/lib/api/supabase"
import { requireCourseAccess } from "@/lib/api/auth"

/**
 * GET /api/case-study?courseId=
 * Fetches the single case-study.md from the course content folder (one per course).
 * LMS BSB units also try the H5P companion pack.
 * Returns { success, data: { markdown } } or 404 if file not found.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const courseIdParam = searchParams.get("courseId")

  if (!courseIdParam) {
    return NextResponse.json(
      { success: false, message: "courseId is required" },
      { status: 400 }
    )
  }

  let contentFolder: string | null = null
  const courseId = parseInt(courseIdParam, 10)
  if (!Number.isNaN(courseId)) {
    const access = await requireCourseAccess(request, courseId)
    if (!access.allowed) {
      return NextResponse.json(
        { success: false, message: access.error ?? "Access denied" },
        { status: access.status }
      )
    }
    const supabase = getSupabaseClient()
    const { data: course } = await supabase
      .from("courses")
      .select("content_folder")
      .eq("id", courseId)
      .maybeSingle()
    if (course?.content_folder?.trim()) {
      contentFolder = course.content_folder.trim()
    }
  }

  const candidateUrls: string[] = []
  const primary = getCaseStudyUrl(contentFolder)
  if (primary) candidateUrls.push(primary)
  const companionFolder = getH5pCompanionFolder(contentFolder)
  if (companionFolder) {
    const companionUrl = buildH5pContentUrl(companionFolder, CONTENT_PATHS.caseStudyFileName)
    if (companionUrl && !candidateUrls.includes(companionUrl)) candidateUrls.push(companionUrl)
  }

  if (candidateUrls.length === 0) {
    return NextResponse.json(
      { success: false, message: "Content URL not configured" },
      { status: 503 }
    )
  }

  for (const caseStudyUrl of candidateUrls) {
    try {
      const res = await fetch(caseStudyUrl, { next: { revalidate: 60 } })
      if (res.ok) {
        const markdown = await res.text()
        return NextResponse.json({ success: true, data: { markdown } })
      }
    } catch {
      // try next candidate
    }
  }

  return NextResponse.json(
    { success: false, message: "Case study not found" },
    { status: 404 }
  )
}
