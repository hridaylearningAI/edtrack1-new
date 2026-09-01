import type { CourseStructureManifest } from "@/lib/types/course-structure"
import type { TopicLearningNotes } from "@/lib/types/learning-notes"
import {
  getProgressionOrderWithNotesInSections,
  getProgressionOrderWithPracticeQSubsections,
} from "@/lib/types/course-structure"
import { parsePracticeQFolderName } from "@/lib/types/practice-q-manifest"
import { isNclexExamOnlyCourseCode } from "@/lib/nclex-exam-only"
import {
  buildEthtl115ProgressionOrder,
  isGnpsThreeLevelCourse,
} from "@/lib/gnps/ethtl115"

const NCLEX_COURSE_ID = 45
const NCLEX_OPEN_MODULES_COUNT = 9
const NCLEX_TOPICS_1_9_QUIZ = "nclex-topics-1-9-quiz"

export interface BuildProgressionOrderInput {
  baseUrl: string
  courseId: number
  /** When known (preferred), skips an unauthenticated /api/courses lookup. */
  courseCode?: string | null
}

/**
 * Fetches course manifest, learning notes, practice Q manifest and builds the full progression order
 * (section IDs) for a course. Matches the logic used in the student trial page.
 */
export async function buildProgressionOrderForCourse(
  input: BuildProgressionOrderInput
): Promise<string[]> {
  const { baseUrl, courseId } = input

  let courseCode = (input.courseCode ?? "").trim()
  if (!courseCode) {
    try {
      const courseRes = await fetch(`${baseUrl}/api/courses/${courseId}`, { cache: "no-store" })
      if (courseRes.ok) {
        const courseJson = (await courseRes.json()) as {
          course_code?: string
          data?: { course_code?: string }
        }
        courseCode = courseJson.course_code ?? courseJson.data?.course_code ?? ""
      }
    } catch {
      // ignore — fall back to id-based NCLEX detection
    }
  }

  // ETHTL115–124 use a code-driven three-level pathway (not the generic course manifest).
  if (isGnpsThreeLevelCourse(courseCode)) {
    return buildEthtl115ProgressionOrder()
  }

  const manifestRes = await fetch(`${baseUrl}/api/course-manifest?courseId=${courseId}`, {
    cache: "no-store",
  })
  if (!manifestRes.ok) return []
  const structure = (await manifestRes.json()) as CourseStructureManifest
  if (!structure?.topics?.length) return []

  const isExamOnly = isNclexExamOnlyCourseCode(courseCode)
  const isFullNclex = courseId === NCLEX_COURSE_ID
  const isAdaptiveShell = isFullNclex || isExamOnly

  const numTopics = structure.topics.length

  // Fetch learning notes
  let notesList: TopicLearningNotes[] = []
  try {
    const notesRes = await fetch(`${baseUrl}/api/learning-notes?courseId=${courseId}`, {
      cache: "no-store",
    })
    if (notesRes.ok) {
      const notesData = (await notesRes.json()) as { notes?: TopicLearningNotes[] } | TopicLearningNotes
      if (notesData && "notes" in notesData && Array.isArray((notesData as { notes?: TopicLearningNotes[] }).notes)) {
        notesList = (notesData as { notes: TopicLearningNotes[] }).notes
      } else if (notesData && typeof notesData === "object" && "title" in notesData && Array.isArray((notesData as { sections?: unknown }).sections)) {
        notesList = [{ ...(notesData as TopicLearningNotes), topicId: "default", topicLabel: (notesData as { title?: string }).title || "Learning notes" }]
      }
    }
  } catch {
    // ignore
  }

  // Fetch practice Q manifest and build topicSubsections
  const topicSubsections: number[][] = Array.from({ length: numTopics }, () => [])
  try {
    const pqRes = await fetch(`${baseUrl}/api/practice-q-manifest?courseId=${courseId}`, {
      cache: "no-store",
    })
    if (pqRes.ok) {
      const pqData = (await pqRes.json()) as { folders?: { folder: string; slides: string[] }[] }
      const folders = Array.isArray(pqData?.folders) ? pqData.folders : []
      for (const entry of folders) {
        const parsed = parsePracticeQFolderName(entry.folder)
        if (parsed && parsed.topicIdx >= 0 && parsed.topicIdx < numTopics) {
          if (!topicSubsections[parsed.topicIdx].includes(parsed.subNum)) {
            topicSubsections[parsed.topicIdx].push(parsed.subNum)
          }
          topicSubsections[parsed.topicIdx].sort((a, b) => a - b)
        }
      }
    }
  } catch {
    // ignore
  }

  const hasNotesInSections = notesList.length > 1 && notesList.every((n) => n.topicId != null && n.topicId !== "")
  const learningNotePageIds = notesList.length <= 1 ? ["student-learning-note"] : notesList.map((_, i) => `student-learning-note-${i}`)

  const includeNclexTopicMedia = isFullNclex
  let baseOrder: string[]
  if (hasNotesInSections) {
    baseOrder = getProgressionOrderWithNotesInSections(structure, topicSubsections, notesList, {
      includeTopicVideoAndAudio: includeNclexTopicMedia,
      examPracticeOnly: isExamOnly,
    })
  } else {
    baseOrder = getProgressionOrderWithPracticeQSubsections(structure, topicSubsections, learningNotePageIds, {
      includeTopicVideoAndAudio: includeNclexTopicMedia,
      examPracticeOnly: isExamOnly,
    })
  }

  // For full NCLEX, inject NGN pages after each topic quiz to match trial progression.
  if (isFullNclex) {
    const withNgn = [...baseOrder]
    for (const t of structure.topics) {
      const quizId = `${t.id}-quiz`
      const ngnId = `${t.id}-ngn`
      if (withNgn.includes(quizId) && !withNgn.includes(ngnId)) {
        const idx = withNgn.indexOf(quizId)
        if (idx >= 0) withNgn.splice(idx + 1, 0, ngnId)
      }
    }
    baseOrder = withNgn
  }

  // Adaptive shell: inject Topics 1–9 quiz after topic 9.
  if (isAdaptiveShell && structure.topics[NCLEX_OPEN_MODULES_COUNT - 1]) {
    const topic9QuizId = `${structure.topics[NCLEX_OPEN_MODULES_COUNT - 1].id}-quiz`
    const topic9NgnId = `${structure.topics[NCLEX_OPEN_MODULES_COUNT - 1].id}-ngn`
    const idx =
      isFullNclex && baseOrder.indexOf(topic9NgnId) >= 0
        ? baseOrder.indexOf(topic9NgnId)
        : baseOrder.indexOf(topic9QuizId)
    if (idx >= 0) {
      const out = [...baseOrder]
      out.splice(idx + 1, 0, NCLEX_TOPICS_1_9_QUIZ)
      return out
    }
  }

  return baseOrder
}
