import { NextRequest, NextResponse } from "next/server"
import { existsSync, readFileSync } from "fs"
import { join } from "path"
import { getPracticeQMcqUrl } from "@/lib/content-url"
import { getSupabaseClient } from "@/lib/api/supabase"
import {
  normalizePracticeQMcqBank,
  type PracticeQMcqBank,
} from "@/lib/types/practice-q-mcq"
import { LOCAL_PRACTICE_Q_MCQ_BANK } from "@/lib/practice-q-mcq-local"

const DATA_DIR = join(process.cwd(), "data")

function tryLocalBank(courseId: number | null): PracticeQMcqBank | null {
  const candidates = [
    courseId != null ? join(DATA_DIR, `practice-q-mcq-${courseId}.json`) : null,
    join(DATA_DIR, "practice-q-mcq-45.json"),
    join(DATA_DIR, "practice-q-mcq.json"),
  ].filter((p): p is string => !!p)

  for (const path of candidates) {
    if (!existsSync(path)) continue
    try {
      const raw = JSON.parse(readFileSync(path, "utf-8")) as unknown
      const normalized = normalizePracticeQMcqBank(raw)
      if (normalized) return normalized
    } catch {
      // try next
    }
  }
  return LOCAL_PRACTICE_Q_MCQ_BANK
}

/**
 * GET /api/practice-q-mcq?courseId=… | ?contentFolder=…
 * Loads Practice Q MCQ bank from CDN practice-q-mcq.json, then local data/practice-q-mcq-45.json.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const courseIdParam = searchParams.get("courseId")
  const contentFolderParam = searchParams.get("contentFolder")
  let contentFolder: string | null = contentFolderParam?.trim() ?? null
  let resolvedCourseId: number | null = null

  if (!contentFolder && courseIdParam) {
    const courseId = parseInt(courseIdParam, 10)
    if (!Number.isNaN(courseId)) {
      resolvedCourseId = courseId
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

  // Prefer the extracted local bank so already-processed folders work without a CDN upload.
  const local = tryLocalBank(resolvedCourseId)
  if (local) {
    const response = NextResponse.json(local)
    response.headers.set("X-Practice-Q-Mcq-Source", "local")
    return response
  }

  const cdnUrl = getPracticeQMcqUrl(contentFolder)
  if (cdnUrl) {
    try {
      const res = await fetch(cdnUrl, { next: { revalidate: 60 } })
      if (res.ok) {
        const data = (await res.json()) as unknown
        const normalized = normalizePracticeQMcqBank(data)
        if (normalized) {
          const response = NextResponse.json(normalized)
          response.headers.set("X-Practice-Q-Mcq-Source", "bucket")
          return response
        }
      }
    } catch {
      // fall through
    }
  }

  const empty: PracticeQMcqBank = {
    title: "Practice Q MCQs",
    folders: [],
  }
  const response = NextResponse.json(empty)
  response.headers.set("X-Practice-Q-Mcq-Source", "fallback")
  return response
}
