import { NextRequest, NextResponse } from "next/server"
import { getSlidesManifestUrl } from "@/lib/content-url"
import { getSupabaseClient } from "@/lib/api/supabase"
import { fetchCourseContentOverrides, normalizeSlidesManifest } from "@/lib/course-content-overrides"

/**
 * GET /api/slides-manifest?courseId=1 | ?contentFolder=MyCourse
 * DB override first, then CDN slides-manifest.json, else { folders: [] }.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const courseIdParam = searchParams.get("courseId")
  const contentFolderParam = searchParams.get("contentFolder")
  const source = searchParams.get("source")
  const forceCdn = source === "cdn"
  let contentFolder: string | null = contentFolderParam?.trim() ?? null

  if (!contentFolder && courseIdParam) {
    const courseId = parseInt(courseIdParam, 10)
    if (!Number.isNaN(courseId)) {
      const supabase = getSupabaseClient()
      if (!forceCdn) {
        const overrides = await fetchCourseContentOverrides(supabase, courseId)
        const fromDb = normalizeSlidesManifest(overrides?.slides_manifest ?? null)
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

  const manifestUrl = getSlidesManifestUrl(contentFolder)
  if (!manifestUrl) {
    return NextResponse.json({ folders: [] })
  }

  try {
    const res = await fetch(manifestUrl, { next: { revalidate: 60 } })
    if (!res.ok) {
      return NextResponse.json({ folders: [] })
    }
    const data = (await res.json()) as unknown
    const normalized = normalizeSlidesManifest(data)
    if (!normalized) {
      return NextResponse.json({ folders: [] })
    }
    return NextResponse.json(normalized)
  } catch {
    return NextResponse.json({ folders: [] })
  }
}
