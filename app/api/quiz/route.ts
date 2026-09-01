import { NextRequest, NextResponse } from "next/server"
import { readFileSync, existsSync } from "fs"
import { join } from "path"
import type { ParsedQuiz } from "@/lib/types/quiz"
import {
  buildH5pContentUrl,
  getH5pCompanionFolder,
  getQuizUrlForContentFolder,
  QUIZ_PATH_UNDER_FOLDER,
} from "@/lib/content-url"
import { getSupabaseClient } from "@/lib/api/supabase"
import { fetchCourseContentOverrides, normalizeToParsedQuiz } from "@/lib/course-content-overrides"

const DATA_DIR = join(process.cwd(), "data")
const GENERIC_QUIZ_PATH = join(DATA_DIR, "quiz-critical-thinking.json")

/** Load quiz from a local JSON file path. Returns null if file missing or invalid. */
function tryLocalQuizAt(path: string): ParsedQuiz | null {
  if (!existsSync(path)) return null
  try {
    const raw = readFileSync(path, "utf-8")
    const data = JSON.parse(raw) as unknown
    return normalizeToParsedQuiz(data)
  } catch {
    // ignore
  }
  return null
}

/** Course-specific local quiz file: data/quiz-{courseId}.json (e.g. quiz-45.json for NCLEX). */
function getCourseLocalQuizPath(courseId: number): string {
  return join(DATA_DIR, `quiz-${courseId}.json`)
}

/**
 * GET /api/quiz
 * Fetches quiz JSON for optional courseId.
 * - With courseId: verifies course exists; then bucket for that course, then data/quiz-{courseId}.json only. Never returns another course's quiz.
 * - Without courseId: tries bucket root, then data/quiz-critical-thinking.json.
 * Auth temporarily disabled - will be re-enabled later.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const courseIdParam = searchParams.get("courseId")
  const source = searchParams.get("source")
  const forceCdn = source === "cdn"
  let contentFolder: string | null = null
  let courseExists = false
  let resolvedCourseId: number | null = null

  if (courseIdParam) {
    const courseId = parseInt(courseIdParam, 10)
    if (!Number.isNaN(courseId)) {
      resolvedCourseId = courseId
      const supabase = getSupabaseClient()
      if (!forceCdn) {
        const overrides = await fetchCourseContentOverrides(supabase, courseId)
        const fromDb = normalizeToParsedQuiz(overrides?.quiz_json ?? null)
        if (fromDb) {
          const response = NextResponse.json(fromDb)
          response.headers.set("X-Quiz-Source", "db")
          return response
        }
      }
      const { data: course } = await supabase
        .from("courses")
        .select("content_folder")
        .eq("id", courseId)
        .maybeSingle()
      courseExists = !!course
      if (course?.content_folder?.trim()) {
        contentFolder = course.content_folder.trim()
      }
    }
  }

  // When course not in DB: proceed with contentFolder=null and try fallbacks (base CDN, local quiz)
  // This allows courses that exist in portfolio but not yet synced to SMS to still load
  const quizCandidates: string[] = []
  const primaryQuizUrl = contentFolder ? getQuizUrlForContentFolder(contentFolder) : getQuizUrlForContentFolder(null)
  if (primaryQuizUrl) quizCandidates.push(primaryQuizUrl)
  // LMS BSB units: quiz JSON still lives on the H5P companion pack
  const companionFolder = getH5pCompanionFolder(contentFolder)
  if (companionFolder) {
    const companionQuizUrl = buildH5pContentUrl(companionFolder, QUIZ_PATH_UNDER_FOLDER)
    if (companionQuizUrl && !quizCandidates.includes(companionQuizUrl)) {
      quizCandidates.push(companionQuizUrl)
    }
  }

  for (const quizUrl of quizCandidates) {
    try {
      const res = await fetch(quizUrl, { next: { revalidate: 60 } })
      if (res.ok) {
        const data = (await res.json()) as unknown
        const parsed = normalizeToParsedQuiz(data)
        if (parsed) {
          const response = NextResponse.json(parsed)
          response.headers.set("X-Quiz-Source", "bucket")
          response.headers.set("X-Quiz-URL", quizUrl)
          return response
        }
      }
    } catch (err) {
      console.log("[quiz] Bucket fetch error:", err instanceof Error ? err.message : err)
    }
  }

  // With courseId and course in DB: try course-specific local file (e.g. data/quiz-45.json)
  if (resolvedCourseId != null && courseExists) {
    const courseLocal = tryLocalQuizAt(getCourseLocalQuizPath(resolvedCourseId))
    if (courseLocal) {
      const response = NextResponse.json(courseLocal)
      response.headers.set("X-Quiz-Source", "local")
      return response
    }
    // Fall through to generic/minimal - never 404
  }

  // No courseId, or course not in DB: allow generic local fallback so page loads
  const genericLocal = tryLocalQuizAt(GENERIC_QUIZ_PATH)
  if (genericLocal) {
    const response = NextResponse.json(genericLocal)
    response.headers.set("X-Quiz-Source", "local")
    return response
  }

  // Minimal fallback - never 404, so course page always loads
  const minimalQuiz: ParsedQuiz = {
    title: "Quiz",
    topics: [],
  }
  const response = NextResponse.json(minimalQuiz)
  response.headers.set("X-Quiz-Source", "fallback")
  return response
}
