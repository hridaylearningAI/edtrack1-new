import { NextRequest, NextResponse } from "next/server"
import { readFileSync, existsSync } from "fs"
import { join } from "path"
import type { StudentLearningNotes, LearningNotesManifest, TopicLearningNotes } from "@/lib/types/learning-notes"
import type { CourseStructureManifest } from "@/lib/types/course-structure"
import {
  buildH5pContentUrl,
  CONTENT_PATHS,
  getContentBaseUrlForFolder,
  getH5pCompanionFolder,
  getLearningNotesManifestUrl,
  getLearningNotesTopicUrl,
  getLearningNotesUrlInSectionFolder,
} from "@/lib/content-url"
import { getSupabaseClient } from "@/lib/api/supabase"
import { fetchCourseStructureFromDatabase } from "@/lib/course-content-sections"

function isValidNotes(data: unknown): data is StudentLearningNotes {
  return (
    typeof data === "object" &&
    data !== null &&
    "title" in data &&
    typeof (data as StudentLearningNotes).title === "string" &&
    "sections" in data &&
    Array.isArray((data as StudentLearningNotes).sections)
  )
}

function isValidManifest(data: unknown): data is LearningNotesManifest {
  return (
    typeof data === "object" &&
    data !== null &&
    "topics" in data &&
    Array.isArray((data as LearningNotesManifest).topics) &&
    (data as LearningNotesManifest).topics.every(
      (t) => typeof t === "object" && t !== null && "id" in t && "label" in t
    )
  )
}

function isValidCourseStructure(data: unknown): data is CourseStructureManifest {
  if (typeof data !== "object" || data === null || !("topics" in data) || !Array.isArray((data as CourseStructureManifest).topics)) return false
  const d = data as CourseStructureManifest
  if (!d.topics.every((t) => typeof t === "object" && t !== null && "id" in t && "folder" in t && "label" in t)) return false
  if (d.programOverview != null) {
    if (typeof d.programOverview !== "object" || !("folder" in d.programOverview) || !("label" in d.programOverview)) return false
  }
  return true
}

/**
 * GET /api/learning-notes
 * Fetches student learning notes from the bucket.
 * Multi-topic: {folder}/student-learning-notes/manifest.json lists topics;
 * each note at {folder}/student-learning-notes/{TopicLabel}/student-learning-notes.json.
 * Section-based (folder per section): course manifest defines sections (Introduction, Topic 1, ...);
 * each note at {folder}/{sectionFolder}/student-learning-notes.json (e.g. Introduction/, Topic 1/).
 * Single (legacy): {folder}/student-learning-notes.json.
 * LMS BSB units: try H5P companion pack (notes still live on the older CDN) before slow ETIA probes.
 * Falls back to local data/student-learning-notes.json if CDN fetch fails.
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
    }
  }

  const base = getContentBaseUrlForFolder(contentFolder) || (process.env.NEXT_PUBLIC_H5P_CONTENT_BASE_URL || "").replace(/\/$/, "")
  const isLmsBsbPack = Boolean(contentFolder && /^BSB/i.test(contentFolder.trim()))
  const companionFolder = getH5pCompanionFolder(contentFolder)

  const fetchWithTimeout = async (url: string, ms = 8000) => {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), ms)
    try {
      return await fetch(url, { next: { revalidate: 60 }, signal: controller.signal })
    } finally {
      clearTimeout(timer)
    }
  }

  const trySingleNotesUrl = async (url: string | null): Promise<StudentLearningNotes | null> => {
    if (!url) return null
    try {
      const res = await fetchWithTimeout(url)
      if (!res.ok) return null
      const data = (await res.json()) as unknown
      return isValidNotes(data) ? data : null
    } catch {
      return null
    }
  }

  // LMS BSB: notes live on the H5P companion pack — fetch that first (fast, known-good).
  if (companionFolder) {
    const companionNotesUrl = buildH5pContentUrl(companionFolder, CONTENT_PATHS.learningNotes)
    const companionNotes = await trySingleNotesUrl(companionNotesUrl)
    if (companionNotes && companionNotes.sections.length > 0) {
      return NextResponse.json(companionNotes)
    }
  }

  // 1) Try multi-topic: manifest at student-learning-notes/manifest.json
  // Skip for LMS BSB packs (ETIA layout has no notes JSON; probing only adds latency/403s).
  const manifestUrl = !isLmsBsbPack ? getLearningNotesManifestUrl(contentFolder) : null
  if (manifestUrl) {
    try {
      const manifestRes = await fetchWithTimeout(manifestUrl)
      if (manifestRes.ok) {
        const manifestData = (await manifestRes.json()) as unknown
        if (isValidManifest(manifestData)) {
          const noteRows = await Promise.all(
            manifestData.topics.map(async (topic) => {
              const topicUrl = getLearningNotesTopicUrl(contentFolder, topic.label)
              try {
                const noteRes = await fetchWithTimeout(topicUrl)
                if (!noteRes.ok) return null
                const noteData = (await noteRes.json()) as unknown
                if (!isValidNotes(noteData)) return null
                return {
                  ...noteData,
                  topicId: topic.id,
                  topicLabel: topic.label,
                } satisfies TopicLearningNotes
              } catch {
                return null
              }
            })
          )
          const notes = noteRows.filter((n): n is TopicLearningNotes => n != null)
          if (notes.length > 0) {
            return NextResponse.json({ notes })
          }
        }
      }
    } catch {
      // Fall through to section-based or single-file
    }
  }

  // 2) Try section-based: one learning note per section folder (Introduction/, Topic 1/, ...)
  // Prefer DB-defined structure when courseId is set (same as /api/course-manifest).
  // Skip for LMS BSB — section folders are slide paths, not notes JSON.
  let structDataFromDb: CourseStructureManifest | null = null
  if (!isLmsBsbPack && courseIdParam) {
    const courseId = parseInt(courseIdParam, 10)
    if (!Number.isNaN(courseId)) {
      const supabase = getSupabaseClient()
      structDataFromDb = await fetchCourseStructureFromDatabase(supabase, courseId)
    }
  }

  const loadSectionNotesFromStructure = async (structData: CourseStructureManifest) => {
    const sections: Array<{ id: string; folder: string; label: string }> = [
      ...(structData.programOverview?.folder
        ? [{ id: "program-overview", folder: structData.programOverview.folder, label: structData.programOverview.label }]
        : []),
      ...structData.topics.map((t) => ({ id: t.id, folder: t.folder, label: t.label })),
    ]
    const results = await Promise.all(
      sections.map(async (section) => {
        const sectionUrl = getLearningNotesUrlInSectionFolder(contentFolder, section.folder)
        try {
          const noteRes = await fetchWithTimeout(sectionUrl, 4000)
          if (!noteRes.ok) return null
          const noteData = (await noteRes.json()) as unknown
          if (!isValidNotes(noteData)) return null
          return {
            ...noteData,
            topicId: section.id,
            topicLabel: section.label,
          } satisfies TopicLearningNotes
        } catch {
          return null
        }
      })
    )
    return results.filter((n): n is TopicLearningNotes => n != null)
  }

  if (!isLmsBsbPack && structDataFromDb && isValidCourseStructure(structDataFromDb)) {
    try {
      const sectionNotes = await loadSectionNotesFromStructure(structDataFromDb)
      if (sectionNotes.length > 0) {
        return NextResponse.json({ notes: sectionNotes })
      }
    } catch {
      // Fall through to CDN manifest
    }
  }

  const manifestCourseUrl = !isLmsBsbPack && base ? `${base}/manifest.json` : null
  if (manifestCourseUrl) {
    try {
      const structRes = await fetchWithTimeout(manifestCourseUrl, 4000)
      if (structRes.ok) {
        const structData = (await structRes.json()) as unknown
        if (isValidCourseStructure(structData)) {
          const sectionNotes = await loadSectionNotesFromStructure(structData)
          if (sectionNotes.length > 0) {
            return NextResponse.json({ notes: sectionNotes })
          }
        }
      }
    } catch {
      // Fall through to single-file or local
    }
  }

  // 3) Try single file at root: student-learning-notes.json (legacy)
  const notesUrl = !isLmsBsbPack && base ? `${base}/${CONTENT_PATHS.learningNotes}` : null
  const single = await trySingleNotesUrl(notesUrl)
  if (single && single.sections.length > 0) {
    return NextResponse.json(single)
  }

  // 4) Course-specific local fallback: data/student-learning-notes-{contentFolder}.json
  if (contentFolder) {
    const safe = contentFolder.replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-|-$/g, "")
    const courseLocalPath = join(process.cwd(), "data", `student-learning-notes-${safe}.json`)
    if (existsSync(courseLocalPath)) {
      try {
        const raw = readFileSync(courseLocalPath, "utf-8")
        const data = JSON.parse(raw) as unknown
        if (isValidNotes(data) && data.sections.length > 0) {
          return NextResponse.json(data)
        }
      } catch {
        // Fall through
      }
    }
  }

  // 5) Generic local fallback — only when no course folder (avoid wrong-unit notes for BSBCRT511)
  if (!contentFolder) {
    const localPath = join(process.cwd(), "data", "student-learning-notes.json")
    if (existsSync(localPath)) {
      try {
        const raw = readFileSync(localPath, "utf-8")
        const data = JSON.parse(raw) as unknown
        if (isValidNotes(data)) {
          return NextResponse.json(data)
        }
      } catch {
        // Fall through
      }
    }
  }

  // 6) Minimal fallback - never 404, so course page always loads
  const minimalNotes: StudentLearningNotes = {
    title: "Learning Notes",
    sections: [],
  }
  return NextResponse.json(minimalNotes)
}
