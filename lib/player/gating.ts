/**
 * Course player gating rules.
 *
 * Moved verbatim out of the course player so the unified player and the current one share exactly
 * one implementation of unlocking, progression and completion. Changing anything here changes what
 * learners can open — lib/player/gating.check.ts covers the cases that matter.
 */
import { NCLEX_EXAM_HOME_PAGE_ID } from "@/lib/nclex-exam-only"
import { TOPIC_UNIT_HOME_PAGE_ID } from "@/lib/learn/immersive-shell"
import {
  isEthtl115ActivityUnlocked,
  isEthtl115PageId,
  migrateEthtl115CompletedSectionIds,
} from "@/lib/gnps/ethtl115"
import { getTopicIndexForPageId, type CourseStructureManifest } from "@/lib/types/course-structure"

export type PageId = string


export const NCLEX_COURSE_ID = 45

export const NCLEX_OPEN_MODULES_COUNT = 9

export const NCLEX_ORIENTATION_TOP_ID: PageId = "nclex-orientation"

export const GNPS_UNIT_HOME_PAGE_ID: PageId = "gnps-unit-home"

export const NCLEX_EXAM_UNIT_HOME_PAGE_ID: PageId = NCLEX_EXAM_HOME_PAGE_ID

export const VET_UNIT_HOME_PAGE_ID: PageId = TOPIC_UNIT_HOME_PAGE_ID


export /** Practice Q pages are optional; progress and unlock use only "required" sections (non–practice-Q). */
function isPracticeQPageId(id: PageId): boolean {
  return id.endsWith("-practice-q") || /-practice-q-\d+$/.test(id)
}

export /** Flashcards pages are optional for completion (like Practice Q). */
function isFlashcardsPageId(id: PageId): boolean {
  return id.endsWith("-flashcards")
}

export function isNclexOrientationPageId(id: PageId): boolean {
  return id === NCLEX_ORIENTATION_TOP_ID || id.startsWith("nclex-orientation-")
}

export /** NGN case study pages are optional (module-wise, NCLEX only). */
function isNgnPageId(id: PageId): boolean {
  return id.endsWith("-ngn")
}

export function getTopicIndexForNgnPageId(pageId: PageId, structure: CourseStructureManifest): number {
  // pageId format: `${topic.id}-ngn`
  const topicId = pageId.replace(/-ngn$/, "")
  return structure.topics.findIndex((t) => t.id === topicId)
}

export /** Required section IDs (excludes optional practice Q and flashcards) for progress % and completion. */
function getRequiredProgressionOrder(progressionOrder: PageId[]): PageId[] {
  // ETHTL115 section pathway: every stage is required (notes → video → flashcards → quiz).
  if (progressionOrder.some((id) => isEthtl115PageId(id))) {
    return progressionOrder
  }
  return progressionOrder.filter(
    (id) =>
      id !== GNPS_UNIT_HOME_PAGE_ID &&
      id !== NCLEX_EXAM_UNIT_HOME_PAGE_ID &&
      id !== VET_UNIT_HOME_PAGE_ID &&
      !isPracticeQPageId(id) &&
      !isFlashcardsPageId(id) &&
      !isNclexOrientationPageId(id)
  )
}

export /**
 * GNPS visible learning pathway: includes optional flashcards + Practice Q so learners can open them,
 * while progress % still uses getRequiredProgressionOrder.
 */
function getGnpsPathwayOrder(progressionOrder: PageId[]): PageId[] {
  if (progressionOrder.some((id) => isEthtl115PageId(id))) {
    return progressionOrder
  }
  return progressionOrder.filter(
    (id) => !isNclexOrientationPageId(id) && !isNgnPageId(id)
  )
}

export function isGnpsOptionalPathwayPageId(id: PageId): boolean {
  if (isEthtl115PageId(id)) return false
  return isPracticeQPageId(id) || isFlashcardsPageId(id)
}

export /**
 * A page is unlocked if the previous *required* (non–practice-Q, non–flashcards) page is completed.
 * Practice Q and flashcards are skipped when walking backward, so they never block quiz/module progress.
 * For NCLEX (course 45), modules 10+ (topic index >= 9) require admin approval when no paid tier applies.
 * Partial-payment tiers: topic index above the purchased stage is locked; within the stage, sequential
 * progression still applies (so Stage 1 cannot advance to Module 2 after finishing Module 1).
 */
function isUnlocked(
  pageId: PageId,
  completedSections: Set<PageId>,
  progressionOrder: PageId[],
  opts?: {
    structure: CourseStructureManifest
    courseId: number | null
    nclexExtendedApproved: boolean
    /** Guide NCLEX: maximum topic index unlocked by partial-payment stage (inclusive). */
    nclexPaidMaxTopicIdx?: number | null
    /** Trainer NCLEX mode: bypass all sequential gating. */
    forceFullyUnlocked?: boolean
  }
): boolean {
  if (opts?.forceFullyUnlocked) return true

  // ETHTL115: section pathway is sequential; cases + decisions unlock in parallel after sections.
  if (isEthtl115PageId(pageId)) {
    return isEthtl115ActivityUnlocked(pageId, completedSections)
  }

  if (opts?.courseId === NCLEX_COURSE_ID && opts?.structure) {
    const topicIdx = getTopicIndexForPageId(pageId, opts.structure)
    if (topicIdx >= 0 && opts.nclexPaidMaxTopicIdx != null) {
      if (topicIdx > opts.nclexPaidMaxTopicIdx) return false
      // Within the paid tier: use sequential unlock below (do NOT bypass — that allowed
      // Stage 1 users to reach Module 2 after Module 1 because optional pages + linear fallback).
    }
    if (topicIdx >= NCLEX_OPEN_MODULES_COUNT) return opts.nclexExtendedApproved
  }

  // NCLEX-specific: when the user reaches/completes topic `slides`, unlock NGN for that same topic
  // alongside the topic quiz. This prevents NGN from being blocked until after the quiz is completed.
  if (isNgnPageId(pageId)) {
    const topicId = pageId.replace(/-ngn$/, "")
    const slidesId = `${topicId}-slides` as PageId
    if (completedSections.has(slidesId)) return true
    return false
  }

  const idx = progressionOrder.indexOf(pageId)
  if (idx <= 0) return true
  /** NCLEX: orientation is optional for module unlock (matches getRequiredProgressionOrder), but orientation items still gate each other. */
  const skipOrientationBlockers = !isNclexOrientationPageId(pageId)
  let i = idx - 1
  while (i >= 0) {
    const prev = progressionOrder[i] as PageId
    if (
      !isPracticeQPageId(prev) &&
      !isFlashcardsPageId(prev) &&
      !(skipOrientationBlockers && isNclexOrientationPageId(prev))
    ) {
      return completedSections.has(prev)
    }
    i -= 1
  }
  return true
}

export /** Map saved section IDs to progression IDs so "student-learning-note" matches "student-learning-note-0" when progression uses indexed IDs */
function normalizeSavedSectionIdsToProgression(savedIds: string[], progressionOrder: PageId[]): Set<PageId> {
  const migrated = progressionOrder.some((id) => isEthtl115PageId(id))
    ? migrateEthtl115CompletedSectionIds(savedIds)
    : savedIds
  const set = new Set<PageId>(migrated as PageId[])
  const firstNoteInProgression = progressionOrder.find(
    (id) => id === "student-learning-note" || /^student-learning-note-\d+$/.test(id)
  )
  if (migrated.includes("student-learning-note")) {
    // Backward compatibility:
    // older progress rows may only contain the legacy single note id.
    // When progression uses per-section notes (student-learning-note-0..N),
    // treat legacy completion as completed for all indexed note pages.
    progressionOrder.forEach((id) => {
      if (/^student-learning-note-\d+$/.test(id)) set.add(id)
    })
    if (firstNoteInProgression && firstNoteInProgression !== "student-learning-note") {
      set.add(firstNoteInProgression)
    }
  }
  if (firstNoteInProgression === "student-learning-note") {
    progressionOrder.forEach((id) => {
      if (/^student-learning-note-\d+$/.test(id) && migrated.includes(id)) set.add("student-learning-note" as PageId)
    })
  }
  return set
}
