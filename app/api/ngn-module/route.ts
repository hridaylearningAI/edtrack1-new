import { NextRequest, NextResponse } from "next/server"
import { existsSync, readFileSync } from "fs"
import { join } from "path"
import { getSupabaseClient } from "@/lib/api/supabase"
import { getNgnModuleUrl } from "@/lib/content-url"

/**
 * GET /api/ngn-module?courseId=45&module=1
 * Proxies NGN module JSON from content bucket/CDN to avoid browser CORS issues.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const courseIdParam = searchParams.get("courseId")
  const moduleParam = searchParams.get("module")

  const moduleNumber = moduleParam ? parseInt(moduleParam, 10) : NaN
  if (!Number.isFinite(moduleNumber) || moduleNumber < 1) {
    return NextResponse.json({ error: "Invalid module number" }, { status: 400 })
  }

  // Dev-first fallback: read NGN JSON from public/ so feature can move forward even if bucket paths
  // are still being validated. Source path: public/sample_ngn/out_json_ngn/module{n}.json
  const localJsonPath = join(
    process.cwd(),
    "public",
    "sample_ngn",
    "out_json_ngn",
    `module${moduleNumber}.json`
  )
  if (existsSync(localJsonPath)) {
    try {
      const raw = readFileSync(localJsonPath, "utf-8")
      const data = JSON.parse(raw) as unknown
      return NextResponse.json(data)
    } catch {
      // Ignore and continue to bucket fetch below.
    }
  }

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
    }
  }

  const url = getNgnModuleUrl(contentFolder, moduleNumber)
  if (!url) {
    return NextResponse.json({ error: "Content URL is not configured" }, { status: 500 })
  }

  try {
    const res = await fetch(url, { next: { revalidate: 60 } })
    if (!res.ok) {
      return NextResponse.json(
        { error: `NGN module not found (${res.status})`, url },
        { status: res.status }
      )
    }
    const data = await res.json()
    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to fetch NGN module", url },
      { status: 500 }
    )
  }
}

