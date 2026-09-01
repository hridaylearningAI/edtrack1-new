import { NextRequest, NextResponse } from "next/server"
import { getPracticeQManifestUrl } from "@/lib/content-url"
import { getSupabaseClient } from "@/lib/api/supabase"
import { fetchCourseContentOverrides, normalizePracticeQManifest } from "@/lib/course-content-overrides"

/**
 * GET /api/practice-q-manifest?courseId=1 | ?contentFolder=MyCourse
 * Fetches practice-q.json from the course content folder (CDN).
 * Returns { folders: [{ folder: string, slides: string[] }] }. Sorts slides naturally.
 * If manifest is missing or invalid, returns { folders: [] }.
 * Auth temporarily disabled - will be re-enabled later.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const courseIdParam = searchParams.get("courseId")
  const contentFolderParam = searchParams.get("contentFolder")
  const source = searchParams.get("source")
  const forceCdn = source === "cdn"
  let contentFolder: string | null = contentFolderParam?.trim() ?? null

  let courseIdNum: number | null = null
  if (!contentFolder && courseIdParam) {
    const courseId = parseInt(courseIdParam, 10)
    if (!Number.isNaN(courseId)) {
      courseIdNum = courseId
      const supabase = getSupabaseClient()
      if (!forceCdn) {
        const overrides = await fetchCourseContentOverrides(supabase, courseId)
        const fromDb = normalizePracticeQManifest(overrides?.practice_q_manifest ?? null)
        if (fromDb) {
          return NextResponse.json(fromDb)
        }
      }
      const { data: course } = await supabase
        .from("courses")
        .select("content_folder")
        .eq("id", courseId)
        .maybeSingle()
      if (course?.content_folder?.trim()) {
        contentFolder = course.content_folder.trim()
      }
    }
  }

  if (courseIdNum == null && !forceCdn && courseIdParam) {
    // Invalid courseId format, no DB override and no CDN content folder.
    return NextResponse.json({ folders: [] })
  }

  const manifestUrl = getPracticeQManifestUrl(contentFolder)
  if (!manifestUrl) {
    return NextResponse.json({ folders: [] })
  }

  try {
    const res = await fetch(manifestUrl, { next: { revalidate: 60 } })
    if (!res.ok) {
      return NextResponse.json({ folders: [] })
    }
    const data = (await res.json()) as unknown
    const normalized = normalizePracticeQManifest(data)
    if (!normalized) {
      return NextResponse.json({ folders: [] })
    }
    return NextResponse.json(normalized)
  } catch {
    return NextResponse.json({ folders: [] })
  }
}
