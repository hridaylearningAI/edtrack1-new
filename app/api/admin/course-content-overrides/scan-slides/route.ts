import { NextRequest, NextResponse } from "next/server"
import { corsHeaders } from "@/lib/api/utils"
import { formatResponse, getSupabaseClient } from "@/lib/api/supabase"
import {requireAuth, isAdminRole } from "@/lib/api/auth"
import { fetchCourseStructureFromDatabase } from "@/lib/course-content-sections"
import { discoverSlidesInFolder } from "@/lib/slide-folder-discovery"
import { naturalSortFilenames, normalizeSlidesManifest } from "@/lib/course-content-overrides"
import type { SlidesManifest } from "@/lib/types/slides-manifest"

async function requireAdmin(request: NextRequest) {
  const authResult = await requireAuth(request)
  if (!authResult.authenticated || !authResult.user) {
    return {
      ok: false as const,
      response: NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401, headers: corsHeaders }),
    }
  }
  if (!isAdminRole(authResult.user.role)) {
    return {
      ok: false as const,
      response: NextResponse.json({ success: false, error: "Access denied. Admin only." }, { status: 403, headers: corsHeaders }),
    }
  }
  return { ok: true as const }
}

type ScanBody = {
  course_id: number
  /** When omitted, scans all lecture folders from course_content_sections (or CDN manifest structure). */
  folders?: string[]
  /** When true, upserts result into course_content_overrides.slides_manifest */
  save?: boolean
}

/**
 * POST /api/admin/course-content-overrides/scan-slides
 * Probes CDN folders for slide images and returns (optionally saves) a slides manifest.
 */
export async function POST(request: NextRequest) {
  const adminCheck = await requireAdmin(request)
  if (!adminCheck.ok) return adminCheck.response

  let body: ScanBody
  try {
    body = (await request.json()) as ScanBody
  } catch {
    return NextResponse.json(formatResponse(false, null, "Invalid JSON"), { status: 400, headers: corsHeaders })
  }

  const courseId = typeof body.course_id === "number" ? body.course_id : parseInt(String(body.course_id), 10)
  if (!Number.isFinite(courseId) || courseId <= 0) {
    return NextResponse.json(formatResponse(false, null, "course_id is required"), { status: 400, headers: corsHeaders })
  }

  const supabase = getSupabaseClient()
  const { data: course, error: courseErr } = await supabase
    .from("courses")
    .select("content_folder")
    .eq("id", courseId)
    .maybeSingle()

  if (courseErr || !course) {
    return NextResponse.json(formatResponse(false, null, "Course not found"), { status: 404, headers: corsHeaders })
  }

  const contentFolder = course.content_folder?.trim() || null
  if (!contentFolder) {
    return NextResponse.json(
      formatResponse(false, null, "Course has no content_folder set. Set it on the course before scanning slides."),
      { status: 400, headers: corsHeaders }
    )
  }

  let foldersToScan: string[] = []
  if (Array.isArray(body.folders) && body.folders.length > 0) {
    foldersToScan = body.folders.map((f) => String(f).trim()).filter(Boolean)
  } else {
    const structure = await fetchCourseStructureFromDatabase(supabase, courseId)
    if (structure?.programOverview?.folder) {
      foldersToScan.push(structure.programOverview.folder.trim())
    }
    for (const t of structure?.topics ?? []) {
      if (t.folder?.trim()) foldersToScan.push(t.folder.trim())
    }
    foldersToScan = [...new Set(foldersToScan)]
  }

  if (foldersToScan.length === 0) {
    return NextResponse.json(
      formatResponse(false, null, "No folders to scan. Save course sections first or pass folders in the request body."),
      { status: 400, headers: corsHeaders }
    )
  }

  const manifest: SlidesManifest = { folders: [] }
  const errors: { folder: string; message: string }[] = []

  for (const folder of foldersToScan) {
    try {
      const slides = await discoverSlidesInFolder(folder, contentFolder)
      if (slides.length === 0) {
        errors.push({ folder, message: "No slides found" })
      }
      manifest.folders.push({ folder, slides: naturalSortFilenames(slides) })
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Scan failed"
      errors.push({ folder, message: msg })
      manifest.folders.push({ folder, slides: [] })
    }
  }

  const normalized = normalizeSlidesManifest(manifest)
  if (!normalized) {
    return NextResponse.json(formatResponse(false, null, "Scan produced invalid manifest"), { status: 500, headers: corsHeaders })
  }

  if (body.save) {
    const { error: upsertErr } = await supabase.from("course_content_overrides").upsert(
      {
        course_id: courseId,
        slides_manifest: normalized,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "course_id" }
    )
    if (upsertErr) {
      return NextResponse.json(formatResponse(false, null, upsertErr.message), { status: 500, headers: corsHeaders })
    }
  }

  return NextResponse.json(
    formatResponse(
      true,
      {
        manifest: normalized,
        scannedFolders: foldersToScan.length,
        errors: errors.length ? errors : undefined,
        saved: !!body.save,
      },
      body.save ? "Scanned and saved slides manifest." : "Scan complete."
    ),
    { headers: corsHeaders }
  )
}
