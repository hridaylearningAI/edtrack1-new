import { NextRequest, NextResponse } from "next/server"
import { existsSync, readFileSync } from "fs"
import { join } from "path"
import {
  buildH5pContentUrl,
  getFlashcardsUrlForTopicFolder,
  getH5pCompanionFolder,
} from "@/lib/content-url"
import { getSupabaseClient } from "@/lib/api/supabase"

const BSBCRT511_LOCAL_FLASHCARDS_ROOT = join(process.cwd(), "data", "bsbcrt511", "flashcards")

function simplifyTopicFolder(topicFolder: string): string {
  const trimmed = topicFolder.trim()
  return (
    trimmed.match(/^(Topic\s+\d+)/i)?.[1] ??
    (trimmed.toLowerCase().includes("overview")
      ? "Introduction"
      : trimmed.toLowerCase().includes("introduction")
        ? "Topic introduction"
        : trimmed)
  )
}

function readLocalBsbcrt511Flashcards(topicFolder: string): string | null {
  const simple = simplifyTopicFolder(topicFolder)
  const candidates = [
    join(BSBCRT511_LOCAL_FLASHCARDS_ROOT, simple, "flashcards.csv"),
    join(BSBCRT511_LOCAL_FLASHCARDS_ROOT, topicFolder.trim(), "flashcards.csv"),
  ]
  for (const path of candidates) {
    if (existsSync(path)) {
      return readFileSync(path, "utf8")
    }
  }
  return null
}

/**
 * GET /api/flashcards?courseId=45&topicFolder=Topic%201
 * Proxies flashcards.csv from the CDN (avoids CORS).
 * Resolves content_folder from the course, then fetches {base}/{contentFolder}/{topicFolder}/flashcards.csv.
 * LMS BSB units also try the H5P companion pack with a simplified topic folder (e.g. "Topic 1").
 * BSBCRT511 falls back to local NotebookLM-generated packs under data/bsbcrt511/flashcards/.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const courseIdParam = searchParams.get("courseId")
  const topicFolder = searchParams.get("topicFolder")

  if (!topicFolder?.trim()) {
    return NextResponse.json({ error: "topicFolder is required" }, { status: 400 })
  }

  let contentFolder: string | null = null
  let courseCode: string | null = null
  if (courseIdParam) {
    const courseId = parseInt(courseIdParam, 10)
    if (!Number.isNaN(courseId)) {
      const supabase = getSupabaseClient()
      const { data: course } = await supabase
        .from("courses")
        .select("content_folder, course_code")
        .eq("id", courseId)
        .maybeSingle()
      if (course?.content_folder?.trim()) {
        contentFolder = course.content_folder.trim()
      }
      if (course?.course_code?.trim()) {
        courseCode = course.course_code.trim()
      }
    }
  }

  const trimmedTopic = topicFolder.trim()
  const candidateUrls: string[] = []
  const primary = getFlashcardsUrlForTopicFolder(contentFolder, trimmedTopic)
  if (primary) candidateUrls.push(primary)

  const companionFolder = getH5pCompanionFolder(contentFolder)
  if (companionFolder) {
    // ETIA slide folders are deep paths; H5P packs use "Topic 1", "Topic 2", …
    const simpleTopic = simplifyTopicFolder(trimmedTopic)
    const companionUrl = buildH5pContentUrl(companionFolder, `${simpleTopic}/flashcards.csv`)
    if (companionUrl && !candidateUrls.includes(companionUrl)) candidateUrls.push(companionUrl)
  }

  let lastStatus = candidateUrls.length === 0 ? 404 : 404
  for (const url of candidateUrls) {
    try {
      const res = await fetch(url, { next: { revalidate: 60 } })
      if (res.ok) {
        const text = await res.text()
        return new NextResponse(text, {
          headers: { "Content-Type": "text/csv; charset=utf-8" },
        })
      }
      lastStatus = res.status
    } catch (err) {
      console.error("[flashcards] Fetch error:", err)
      lastStatus = 502
    }
  }

  const isBsbcrt511 =
    (courseCode ?? "").toUpperCase().includes("BSBCRT511") ||
    (contentFolder ?? "").toLowerCase().includes("developing critical thinking")
  if (isBsbcrt511) {
    const localCsv = readLocalBsbcrt511Flashcards(trimmedTopic)
    if (localCsv?.trim()) {
      return new NextResponse(localCsv, {
        headers: { "Content-Type": "text/csv; charset=utf-8" },
      })
    }
  }

  if (candidateUrls.length === 0) {
    return NextResponse.json({ error: "Content URL not configured" }, { status: 503 })
  }

  // CloudFront often returns 403 for missing keys — treat as "no flashcards"
  if (lastStatus === 403 || lastStatus === 404) {
    return NextResponse.json({ error: "No flashcards for this topic" }, { status: 404 })
  }
  return NextResponse.json({ error: `Failed to load (${lastStatus})` }, { status: 502 })
}
