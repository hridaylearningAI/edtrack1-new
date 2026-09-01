import { NextRequest, NextResponse } from "next/server"
import { corsHeaders } from "@/lib/api/utils"
import { getSupabaseClient, formatResponse } from "@/lib/api/supabase"
import {requireAuth, isAdminRole } from "@/lib/api/auth"
import { normalizePracticeQManifest, normalizeSlidesManifest, normalizeToParsedQuiz } from "@/lib/course-content-overrides"

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

export async function GET(request: NextRequest) {
  const adminCheck = await requireAdmin(request)
  if (!adminCheck.ok) return adminCheck.response

  const courseIdParam = new URL(request.url).searchParams.get("courseId")
  const courseId = courseIdParam ? parseInt(courseIdParam, 10) : NaN
  if (!Number.isFinite(courseId) || courseId <= 0) {
    return NextResponse.json(formatResponse(false, null, "courseId is required"), { status: 400, headers: corsHeaders })
  }

  const includeData = new URL(request.url).searchParams.get("includeData") === "1"
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from("course_content_overrides")
    .select("course_id, practice_q_manifest, slides_manifest, quiz_json, updated_at")
    .eq("course_id", courseId)
    .maybeSingle()

  if (error) {
    return NextResponse.json(formatResponse(false, null, error.message), { status: 500, headers: corsHeaders })
  }

  const normalizedPractice = normalizePracticeQManifest(data?.practice_q_manifest ?? null)
  const normalizedSlides = normalizeSlidesManifest(data?.slides_manifest ?? null)
  const normalizedQuiz = normalizeToParsedQuiz(data?.quiz_json ?? null)
  return NextResponse.json(
    formatResponse(
      true,
      {
        hasPracticeQOverride: !!normalizedPractice,
        hasSlidesOverride: !!normalizedSlides,
        hasQuizOverride: !!normalizedQuiz,
        updated_at: data?.updated_at ?? null,
        ...(includeData
          ? {
              practice_q_manifest: normalizedPractice,
              slides_manifest: normalizedSlides,
              quiz_json: normalizedQuiz,
            }
          : {}),
      },
      "OK"
    ),
    { headers: corsHeaders }
  )
}

type PutBody = {
  course_id: number
  practice_q_manifest?: unknown
  slides_manifest?: unknown
  quiz_json?: unknown
}

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

  const nextPractice = body.practice_q_manifest === undefined ? undefined : normalizePracticeQManifest(body.practice_q_manifest)
  if (body.practice_q_manifest !== undefined && !nextPractice) {
    return NextResponse.json(
      formatResponse(false, null, "practice_q_manifest must match { folders: [{ folder, slides[] }] }"),
      { status: 400, headers: corsHeaders }
    )
  }
  const nextSlides = body.slides_manifest === undefined ? undefined : normalizeSlidesManifest(body.slides_manifest)
  if (body.slides_manifest !== undefined && !nextSlides) {
    return NextResponse.json(
      formatResponse(false, null, "slides_manifest must match { folders: [{ folder, slides[] }] }"),
      { status: 400, headers: corsHeaders }
    )
  }
  const nextQuiz = body.quiz_json === undefined ? undefined : normalizeToParsedQuiz(body.quiz_json)
  if (body.quiz_json !== undefined && !nextQuiz) {
    return NextResponse.json(formatResponse(false, null, "quiz_json is invalid"), { status: 400, headers: corsHeaders })
  }

  const supabase = getSupabaseClient()
  const payload: Record<string, unknown> = {
    course_id: courseId,
    updated_at: new Date().toISOString(),
  }
  if (body.practice_q_manifest !== undefined) payload.practice_q_manifest = nextPractice
  if (body.slides_manifest !== undefined) payload.slides_manifest = nextSlides
  if (body.quiz_json !== undefined) payload.quiz_json = nextQuiz

  const { data, error } = await supabase
    .from("course_content_overrides")
    .upsert(payload, { onConflict: "course_id" })
    .select("course_id, practice_q_manifest, slides_manifest, quiz_json, updated_at")
    .maybeSingle()

  if (error) {
    return NextResponse.json(formatResponse(false, null, error.message), { status: 500, headers: corsHeaders })
  }

  return NextResponse.json(
    formatResponse(
      true,
      {
        hasPracticeQOverride: !!normalizePracticeQManifest(data?.practice_q_manifest ?? null),
        hasSlidesOverride: !!normalizeSlidesManifest(data?.slides_manifest ?? null),
        hasQuizOverride: !!normalizeToParsedQuiz(data?.quiz_json ?? null),
        updated_at: data?.updated_at ?? null,
      },
      "Saved course content overrides."
    ),
    { headers: corsHeaders }
  )
}

type DeleteBody = {
  course_id: number
  target: "practice_q_manifest" | "slides_manifest" | "quiz_json" | "both"
}

export async function DELETE(request: NextRequest) {
  const adminCheck = await requireAdmin(request)
  if (!adminCheck.ok) return adminCheck.response

  let body: DeleteBody
  try {
    body = (await request.json()) as DeleteBody
  } catch {
    return NextResponse.json(formatResponse(false, null, "Invalid JSON"), { status: 400, headers: corsHeaders })
  }
  const courseId = typeof body.course_id === "number" ? body.course_id : parseInt(String(body.course_id), 10)
  if (!Number.isFinite(courseId) || courseId <= 0) {
    return NextResponse.json(formatResponse(false, null, "course_id is required"), { status: 400, headers: corsHeaders })
  }
  const target = body.target || "both"
  const supabase = getSupabaseClient()

  if (target === "both") {
    const { error } = await supabase.from("course_content_overrides").delete().eq("course_id", courseId)
    if (error) {
      return NextResponse.json(formatResponse(false, null, error.message), { status: 500, headers: corsHeaders })
    }
    return NextResponse.json(
      formatResponse(true, { hasPracticeQOverride: false, hasSlidesOverride: false, hasQuizOverride: false }, "Cleared all overrides."),
      { headers: corsHeaders }
    )
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  patch[target] = null
  const { error } = await supabase.from("course_content_overrides").upsert({ course_id: courseId, ...patch }, { onConflict: "course_id" })
  if (error) {
    return NextResponse.json(formatResponse(false, null, error.message), { status: 500, headers: corsHeaders })
  }
  return NextResponse.json(formatResponse(true, null, "Cleared override."), { headers: corsHeaders })
}
