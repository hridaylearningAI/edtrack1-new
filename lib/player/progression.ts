/**
 * What order a learner walks a course in.
 *
 * Moved verbatim out of the course player so the unified player and the current one compute one
 * order. Order drives gating, progress and resume, so behaviour must not change:
 * scripts/check-player-gating.mjs covers it.
 */
import {
  getProgressionOrderWithNotesInSections,
  getProgressionOrderWithPracticeQSubsections,
  getSlideFolderForPageId,
  type CourseStructureManifest,
  type NoteWithTopicId,
} from "@/lib/types/course-structure"
import { NCLEX_OPEN_MODULES_COUNT, type PageId } from "@/lib/player/gating"

export const NCLEX_TOPICS_1_9_QUIZ: PageId = "nclex-topics-1-9-quiz"

export type SlidesManifestState = {
  hasManifest: boolean
  isLoading: boolean
  segmentByFolder: Record<string, { slides: unknown[] } | undefined>
}

export type StandardProgressionInput = {
  structure: CourseStructureManifest
  notesList: NoteWithTopicId[]
  /** Practice-question subsection numbers per topic. */
  topicSubsections: number[][]
  learningNotePageIds: string[]
  hasNotesInSections: boolean
  includeTopicVideoAndAudio: boolean
  isNclexExamOnly: boolean
  isNclexFull: boolean
  isNclexAdaptiveShell: boolean
  slidesManifest: SlidesManifestState
}

/** Base order for manifest-driven courses, minus empty slide pages, plus NCLEX-only extras. */
export function buildStandardProgressionOrder(input: StandardProgressionInput): PageId[] {
  const {
    structure,
    notesList,
    topicSubsections: topicSubsectionsResolved,
    learningNotePageIds,
    hasNotesInSections,
    includeTopicVideoAndAudio: includeNclexTopicMedia,
    isNclexExamOnly: isNclexExamOnlyCourse,
    isNclexFull: isNclexFullCourse,
    isNclexAdaptiveShell,
    slidesManifest,
  } = input

    const baseProgressionOrder = hasNotesInSections
      ? getProgressionOrderWithNotesInSections(structure, topicSubsectionsResolved, notesList, {
          includeTopicVideoAndAudio: includeNclexTopicMedia,
          examPracticeOnly: isNclexExamOnlyCourse,
        })
      : getProgressionOrderWithPracticeQSubsections(structure, topicSubsectionsResolved, learningNotePageIds, {
          includeTopicVideoAndAudio: includeNclexTopicMedia,
          examPracticeOnly: isNclexExamOnlyCourse,
        })

    // When slides-manifest is known, drop slide pages with no files (e.g. Topic introduction is video-only).
    // Avoids CDN probing of 01.png…25.png → mass 403s on ETIA packs.
    const withoutEmptySlides =
      slidesManifest.hasManifest && !slidesManifest.isLoading
        ? baseProgressionOrder.filter((pageId) => {
            const isSlidesPage =
              pageId === "program-overview" ||
              (pageId.endsWith("-slides") && !pageId.includes("practice-q"))
            if (!isSlidesPage) return true
            const folder = getSlideFolderForPageId(pageId, structure)
            if (!folder) return false
            const seg = slidesManifest.segmentByFolder[folder]
            return !!(seg && seg.slides.length > 0)
          })
        : baseProgressionOrder

    // NCLEX adaptive shell: include NGN pages after each topic quiz (full NCLEX only).
    const withNgn = (() => {
      if (!isNclexFullCourse) return withoutEmptySlides
      if (!structure?.topics?.length) return withoutEmptySlides
      const out = [...withoutEmptySlides]
      for (const t of structure.topics) {
        const quizId = `${t.id}-quiz`
        const ngnId = `${t.id}-ngn`
        if (out.includes(quizId) && !out.includes(ngnId)) {
          const idx = out.indexOf(quizId)
          if (idx >= 0) out.splice(idx + 1, 0, ngnId)
        }
      }
      return out
    })()

    const topic9QuizId =
      isNclexAdaptiveShell && structure.topics[NCLEX_OPEN_MODULES_COUNT - 1]
        ? `${structure.topics[NCLEX_OPEN_MODULES_COUNT - 1].id}-quiz`
        : null
    if (topic9QuizId != null) {
      const topic9NgnId =
        isNclexFullCourse && structure.topics[NCLEX_OPEN_MODULES_COUNT - 1]
          ? `${structure.topics[NCLEX_OPEN_MODULES_COUNT - 1].id}-ngn`
          : null
      const idx = withNgn.indexOf(topic9QuizId)
      if (idx < 0) return withNgn
      const out = [...withNgn]
      const insertIdx = topic9NgnId && out.includes(topic9NgnId) ? out.indexOf(topic9NgnId) + 1 : idx + 1
      out.splice(insertIdx, 0, NCLEX_TOPICS_1_9_QUIZ)
      return out
    }
    return withNgn
}

/** NCLEX prep courses start with Orientation so the first video is open and resume lands there. */
export function withNclexOrientation(
  order: PageId[],
  orientationIds: PageId[],
  enabled: boolean,
  hasTopics: boolean
): PageId[] {
  if (!enabled || !hasTopics || orientationIds.length === 0) return order
  const out = [...order]
  const dedup = orientationIds.filter((id) => !out.includes(id))
  out.splice(0, 0, ...dedup)
  return out
}
