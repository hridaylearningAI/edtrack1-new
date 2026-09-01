import type { SupabaseClient } from "@supabase/supabase-js"
import type { PracticeQManifest } from "@/lib/types/practice-q-manifest"
import type { SlidesManifest } from "@/lib/types/slides-manifest"
import type { ParsedQuiz } from "@/lib/types/quiz"
import { isModuleBasedQuiz, normalizeModuleBasedQuiz } from "@/lib/types/quiz"

export type CourseContentOverrideRow = {
  id: number
  course_id: number
  practice_q_manifest: unknown | null
  slides_manifest: unknown | null
  quiz_json: unknown | null
  created_at?: string
  updated_at?: string
}

export function naturalSortFilenames(files: string[]): string[] {
  return [...files].sort((a, b) => {
    const aNum = a.match(/(\d+)/g)
    const bNum = b.match(/(\d+)/g)
    if (!aNum?.length || !bNum?.length) return a.localeCompare(b, undefined, { numeric: true })
    for (let i = 0; i < Math.max(aNum.length, bNum.length); i++) {
      const na = i < aNum.length ? parseInt(aNum[i], 10) : 0
      const nb = i < bNum.length ? parseInt(bNum[i], 10) : 0
      if (na !== nb) return na - nb
    }
    return a.localeCompare(b, undefined, { numeric: true })
  })
}

/** Shared shape for practice-q.json and slides-manifest.json */
export function normalizeFoldersSlideManifest(data: unknown): PracticeQManifest | null {
  if (!data || typeof data !== "object" || !Array.isArray((data as { folders?: unknown }).folders)) {
    return null
  }
  const raw = (data as { folders: { folder?: string; slides?: unknown }[] }).folders
  const folders = raw
    .filter((entry) => entry && typeof entry.folder === "string" && entry.folder.trim() !== "")
    .map((entry) => {
      const folder = (entry.folder as string).trim()
      let slides: string[] = []
      if (Array.isArray(entry.slides)) {
        slides = entry.slides.filter((s): s is string => typeof s === "string" && s.trim() !== "")
      }
      return { folder, slides: naturalSortFilenames(slides) }
    })
  return { folders }
}

export function normalizePracticeQManifest(data: unknown): PracticeQManifest | null {
  return normalizeFoldersSlideManifest(data)
}

export function normalizeSlidesManifest(data: unknown): SlidesManifest | null {
  return normalizeFoldersSlideManifest(data)
}

function isValidTopicsQuiz(data: unknown): data is ParsedQuiz {
  if (typeof data !== "object" || data === null) return false
  const d = data as Record<string, unknown>
  if (typeof d.title !== "string") return false
  if (!Array.isArray(d.topics)) return false
  for (const t of d.topics as unknown[]) {
    if (typeof t !== "object" || t === null) return false
    const topic = t as Record<string, unknown>
    if (!Array.isArray(topic.questions)) return false
  }
  return true
}

export function normalizeToParsedQuiz(data: unknown): ParsedQuiz | null {
  if (isValidTopicsQuiz(data)) return data
  if (isModuleBasedQuiz(data)) return normalizeModuleBasedQuiz(data)
  return null
}

export async function fetchCourseContentOverrides(
  supabase: SupabaseClient,
  courseId: number
): Promise<CourseContentOverrideRow | null> {
  const { data, error } = await supabase
    .from("course_content_overrides")
    .select("id, course_id, practice_q_manifest, slides_manifest, quiz_json, created_at, updated_at")
    .eq("course_id", courseId)
    .maybeSingle()
  if (error) {
    console.error("fetchCourseContentOverrides:", error.message)
    return null
  }
  return (data || null) as CourseContentOverrideRow | null
}
