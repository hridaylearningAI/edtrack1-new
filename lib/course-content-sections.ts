import type { SupabaseClient } from "@supabase/supabase-js"
import type { CourseStructureManifest } from "@/lib/types/course-structure"

export type CourseContentSectionKind = "program_overview" | "topic"

export type CourseContentSectionRow = {
  id: number
  course_id: number
  sort_order: number
  section_kind: CourseContentSectionKind
  topic_slug: string | null
  folder: string
  label: string
  practice_q_source_topic_num?: number | null
  quiz_source_topic_num?: number | null
  ngn_source_topic_num?: number | null
  created_at?: string
  updated_at?: string
}

export function rowsToCourseStructureManifest(rows: CourseContentSectionRow[]): CourseStructureManifest | null {
  if (!rows.length) return null
  const sorted = [...rows].sort((a, b) => a.sort_order - b.sort_order)
  let programOverview: CourseStructureManifest["programOverview"] = undefined
  const topics: CourseStructureManifest["topics"] = []

  for (const row of sorted) {
    if (row.section_kind === "program_overview") {
      programOverview = { folder: row.folder.trim(), label: row.label.trim() }
    } else if (row.section_kind === "topic" && row.topic_slug) {
      topics.push({
        id: row.topic_slug.trim(),
        folder: row.folder.trim(),
        label: row.label.trim(),
        practiceQSourceTopicNum:
          typeof row.practice_q_source_topic_num === "number" && row.practice_q_source_topic_num > 0
            ? row.practice_q_source_topic_num
            : undefined,
        quizSourceTopicNum:
          typeof row.quiz_source_topic_num === "number" && row.quiz_source_topic_num > 0
            ? row.quiz_source_topic_num
            : undefined,
        ngnSourceTopicNum:
          typeof row.ngn_source_topic_num === "number" && row.ngn_source_topic_num > 0
            ? row.ngn_source_topic_num
            : undefined,
      })
    }
  }

  if (topics.length === 0 && !programOverview?.folder) {
    return null
  }

  return {
    programOverview: programOverview ?? null,
    topics,
  }
}

export async function fetchCourseStructureFromDatabase(
  supabase: SupabaseClient,
  courseId: number
): Promise<CourseStructureManifest | null> {
  const { data, error } = await supabase
    .from("course_content_sections")
    .select(
      "id, course_id, sort_order, section_kind, topic_slug, folder, label, practice_q_source_topic_num, quiz_source_topic_num, ngn_source_topic_num, created_at, updated_at"
    )
    .eq("course_id", courseId)
    .order("sort_order", { ascending: true })

  if (error) {
    console.error("fetchCourseStructureFromDatabase:", error.message)
    return null
  }

  const rows = (data || []) as CourseContentSectionRow[]
  return rowsToCourseStructureManifest(rows)
}

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/i

export type SectionInput = {
  section_kind: CourseContentSectionKind
  topic_slug?: string | null
  folder: string
  label: string
  practice_q_source_topic_num?: number | null
  quiz_source_topic_num?: number | null
  ngn_source_topic_num?: number | null
}

export function validateSectionInputs(sections: SectionInput[]): string | null {
  let programCount = 0
  const slugs = new Set<string>()
  for (const s of sections) {
    const folder = s.folder?.trim() ?? ""
    const label = s.label?.trim() ?? ""
    if (!folder || !label) return "Each section must have a folder and label."
    if (s.section_kind === "program_overview") {
      programCount += 1
      if (programCount > 1) return "Only one Program Overview section is allowed."
      if (s.topic_slug != null && String(s.topic_slug).trim() !== "") {
        return "Program Overview must not have a topic slug."
      }
    } else {
      const slug = (s.topic_slug ?? "").trim()
      if (!slug) return "Each topic must have a topic slug (e.g. topic-1)."
      if (!SLUG_RE.test(slug)) return `Invalid topic slug: ${slug}`
      if (slugs.has(slug)) return `Duplicate topic slug: ${slug}`
      slugs.add(slug)
      if (s.practice_q_source_topic_num != null && s.practice_q_source_topic_num <= 0) {
        return `Invalid practice_q_source_topic_num for ${slug}`
      }
      if (s.quiz_source_topic_num != null && s.quiz_source_topic_num <= 0) {
        return `Invalid quiz_source_topic_num for ${slug}`
      }
      if (s.ngn_source_topic_num != null && s.ngn_source_topic_num <= 0) {
        return `Invalid ngn_source_topic_num for ${slug}`
      }
    }
  }
  return null
}
