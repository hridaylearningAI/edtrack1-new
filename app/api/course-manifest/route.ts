import { NextRequest, NextResponse } from "next/server"
import { readFileSync, existsSync } from "fs"
import { join } from "path"
import { DEFAULT_COURSE_STRUCTURE } from "@/lib/types/course-structure"
import type { CourseStructureManifest } from "@/lib/types/course-structure"
import { getContentBaseUrlForFolder } from "@/lib/content-url"
import { getSupabaseClient } from "@/lib/api/supabase"
import { fetchCourseStructureFromDatabase } from "@/lib/course-content-sections"

function isValidManifestShape(data: CourseStructureManifest): boolean {
  const poOk =
    data.programOverview == null ||
    (typeof data.programOverview === "object" &&
      typeof data.programOverview.folder === "string" &&
      data.programOverview.folder.length > 0)
  return Array.isArray(data?.topics) && poOk
}

/**
 * GET /api/course-manifest
 * Optional ?courseId= uses that course's content_folder for CDN URLs.
 * If the course has rows in course_content_sections, that order is used instead of manifest.json.
 * Otherwise proxies manifest.json from the CDN, then local data/manifest.json, then default.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const courseIdParam = searchParams.get("courseId")
  let contentFolder: string | null = null

  if (courseIdParam) {
    const courseId = parseInt(courseIdParam, 10)
    if (!Number.isNaN(courseId)) {
      const supabase = getSupabaseClient()
      const { data: course } = await supabase
        .from("courses")
        .select("content_folder")
        .eq("id", courseId)
        .maybeSingle()
      if (course?.content_folder?.trim()) {
        contentFolder = course.content_folder.trim()
      }

      const fromDb = await fetchCourseStructureFromDatabase(supabase, courseId)
      if (fromDb && isValidManifestShape(fromDb)) {
        return NextResponse.json(fromDb)
      }
    }
  }

  const base = getContentBaseUrlForFolder(contentFolder) || (process.env.NEXT_PUBLIC_H5P_CONTENT_BASE_URL || "").replace(/\/$/, "")
  const manifestUrl = base ? `${base}/manifest.json` : null

  if (manifestUrl) {
    try {
      const res = await fetch(manifestUrl, { next: { revalidate: 60 } })
      if (res.ok) {
        const data = (await res.json()) as CourseStructureManifest
        if (Array.isArray(data?.topics) && (data.programOverview == null || (typeof data.programOverview === "object" && data.programOverview.folder))) {
          return NextResponse.json(data)
        }
      }
    } catch {
      // Fall through to local or default
    }
  }

  const localPath = join(process.cwd(), "data", "manifest.json")
  if (existsSync(localPath)) {
    try {
      const raw = readFileSync(localPath, "utf-8")
      const data = JSON.parse(raw) as CourseStructureManifest
      if (Array.isArray(data?.topics) && (data.programOverview == null || (typeof data.programOverview === "object" && data.programOverview.folder))) {
        return NextResponse.json(data)
      }
    } catch {
      // Fall through to default
    }
  }

  return NextResponse.json(DEFAULT_COURSE_STRUCTURE)
}
