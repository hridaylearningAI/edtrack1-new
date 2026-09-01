import { NextRequest, NextResponse } from "next/server"
import { corsHeaders } from "@/lib/api/utils"
import { formatResponse } from "@/lib/api/supabase"
import {requireAuth, isAdminRole } from "@/lib/api/auth"

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
 * GET /api/admin/course-content-overrides/preview-cdn?courseId=123&kind=practice_q|quiz|slides
 * Uses public APIs with source=cdn to bypass DB override and fetch bucket files.
 */
export async function GET(request: NextRequest) {
  const adminCheck = await requireAdmin(request)
  if (!adminCheck.ok) return adminCheck.response

  const { searchParams } = new URL(request.url)
  const courseIdParam = searchParams.get("courseId")
  const kind = searchParams.get("kind")
  const courseId = courseIdParam ? parseInt(courseIdParam, 10) : NaN
  if (!Number.isFinite(courseId) || courseId <= 0) {
    return NextResponse.json(formatResponse(false, null, "courseId is required"), { status: 400, headers: corsHeaders })
  }
  if (kind !== "practice_q" && kind !== "quiz" && kind !== "slides") {
    return NextResponse.json(formatResponse(false, null, "kind must be practice_q, quiz, or slides"), {
      status: 400,
      headers: corsHeaders,
    })
  }

  const pathname =
    kind === "practice_q" ? "/api/practice-q-manifest" : kind === "slides" ? "/api/slides-manifest" : "/api/quiz"
  const internalUrl = new URL(pathname, request.url)
  internalUrl.searchParams.set("courseId", String(courseId))
  internalUrl.searchParams.set("source", "cdn")

  try {
    const resp = await fetch(internalUrl.toString(), { cache: "no-store" })
    const data = await resp.json()
    if (!resp.ok) {
      return NextResponse.json(formatResponse(false, null, `Fetch failed (${resp.status})`), { status: 502, headers: corsHeaders })
    }
    return NextResponse.json(formatResponse(true, { kind, data }, "Loaded from CDN"), { headers: corsHeaders })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Fetch failed"
    return NextResponse.json(formatResponse(false, null, msg), { status: 502, headers: corsHeaders })
  }
}
