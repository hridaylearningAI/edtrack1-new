/**
 * Course structure loaded from CDN manifest (test/manifest.json).
 * Defines sidebar sections and folder mapping for slides.
 */
export interface ProgramOverviewSection {
  folder: string
  label: string
}

export interface TopicSection {
  id: string
  folder: string
  label: string
  /** Optional mapping: source Practice Q topic number from practice-q.json (1-based). */
  practiceQSourceTopicNum?: number
  /** Optional mapping: source quiz topic number from quiz JSON (1-based). */
  quizSourceTopicNum?: number
  /** Optional mapping: source NGN module/topic number (1-based). */
  ngnSourceTopicNum?: number
}

export interface CourseStructureManifest {
  /** When missing or null, Introduction/Program Overview is not shown and not part of progression. */
  programOverview?: ProgramOverviewSection | null
  topics: TopicSection[]
}

export const DEFAULT_COURSE_STRUCTURE: CourseStructureManifest = {
  programOverview: { folder: "Introduction", label: "Program Overview" },
  topics: [
    { id: "topic-1", folder: "Topic 1", label: "Topic 1" },
    { id: "topic-2", folder: "Topic 2", label: "Topic 2" },
  ],
}

/** All page IDs in progression order (student-learning-note, program-overview, then each topic's slides, practice-q subsections, quiz). */
/** Single case study page ID for the whole course (one case study per course). */
export const COURSE_CASE_STUDY_PAGE_ID = "course-case-study"

export function getProgressionOrder(structure: CourseStructureManifest): string[] {
  const order: string[] = ["student-learning-note"]
  if (structure.programOverview?.folder) order.push("program-overview")
  for (const t of structure.topics) {
    order.push(`${t.id}-slides`, `${t.id}-practice-q`, `${t.id}-quiz`)
  }
  order.push(COURSE_CASE_STUDY_PAGE_ID)
  return order
}

/**
 * Progression order when Practice Q is split by subsection (topic-1-practice-q-1, topic-1-practice-q-2, ...).
 * topicSubsections[topicIdx] = list of subsection numbers (e.g. [1, 2, 3] for Topic 1.1, 1.2, 1.3).
 * learningNotePageIds: when provided, used instead of ["student-learning-note"] (e.g. ["student-learning-note-0", "student-learning-note-1"]).
 */
/**
 * When true (e.g. NCLEX): optional lecture video page before slides; audio (audio.m4a) is embedded on the slides page.
 */
export type ProgressionOrderOptions = {
  includeTopicVideoAndAudio?: boolean
  /** When examPracticeOnly: Practice Q subsections only (topic quizzes hidden). */
  examPracticeOnly?: boolean
}

export function getProgressionOrderWithPracticeQSubsections(
  structure: CourseStructureManifest,
  topicSubsections: number[][],
  learningNotePageIds?: string[],
  options?: ProgressionOrderOptions
): string[] {
  const includeTopicVideoAndAudio = options?.includeTopicVideoAndAudio ?? false
  const examPracticeOnly = options?.examPracticeOnly ?? false
  if (examPracticeOnly) {
    // Exam-only: Practice Q subsections only (topic knowledge-check quizzes hidden for now).
    const order: string[] = []
    structure.topics.forEach((t, topicIdx) => {
      const subs = topicSubsections[topicIdx] ?? []
      subs.forEach((subNum) => order.push(`${t.id}-practice-q-${subNum}`))
    })
    return order
  }
  const learningIds = learningNotePageIds?.length ? learningNotePageIds : ["student-learning-note"]
  const order: string[] = [...learningIds]
  if (structure.programOverview?.folder) {
    // Program overview has no separate video step (NCLEX); topic sections keep optional video before slides.
    order.push("program-overview")
  }
  structure.topics.forEach((t, topicIdx) => {
    if (includeTopicVideoAndAudio) {
      order.push(`${t.id}-video`)
    }
    order.push(`${t.id}-slides`)
    order.push(`${t.id}-flashcards`)
    const subs = topicSubsections[topicIdx] ?? []
    subs.forEach((subNum) => order.push(`${t.id}-practice-q-${subNum}`))
    order.push(`${t.id}-quiz`)
  })
  order.push(COURSE_CASE_STUDY_PAGE_ID)
  return order
}

/** Note with topicId used to place learning notes inside section progression. */
export type NoteWithTopicId = { topicId: string }

/**
 * Progression order when learning notes are nested per section: each topic (and program overview)
 * has its note first, then slides/practice/quiz. Use when notesList has multiple notes keyed by topicId.
 */
export function getProgressionOrderWithNotesInSections(
  structure: CourseStructureManifest,
  topicSubsections: number[][],
  notesList: NoteWithTopicId[],
  options?: ProgressionOrderOptions
): string[] {
  const includeTopicVideoAndAudio = options?.includeTopicVideoAndAudio ?? false
  const examPracticeOnly = options?.examPracticeOnly ?? false
  if (examPracticeOnly) {
    return getProgressionOrderWithPracticeQSubsections(
      structure,
      topicSubsections,
      undefined,
      { examPracticeOnly: true }
    )
  }
  const order: string[] = []

  // Program overview: note (if any) → slides (no separate video tab; topic sections may have video before slides)
  if (structure.programOverview?.folder) {
    const programNoteIdx = notesList.findIndex((n) => n.topicId === "program-overview")
    if (programNoteIdx >= 0) order.push(`student-learning-note-${programNoteIdx}`)
    order.push("program-overview")
  }

  // Each topic: note → optional video → slides (audio on same page as slides) → …
  structure.topics.forEach((t, topicIdx) => {
    const noteIdx = notesList.findIndex((n) => n.topicId === t.id)
    if (noteIdx >= 0) order.push(`student-learning-note-${noteIdx}`)
    if (includeTopicVideoAndAudio) {
      order.push(`${t.id}-video`)
    }
    order.push(`${t.id}-slides`)
    order.push(`${t.id}-flashcards`)
    const subs = topicSubsections[topicIdx] ?? []
    subs.forEach((subNum) => order.push(`${t.id}-practice-q-${subNum}`))
    order.push(`${t.id}-quiz`)
  })
  order.push(COURSE_CASE_STUDY_PAGE_ID)

  return order
}

/** Page IDs that show the slides view (program-overview + each topic slides). */
export function getSlidePageIds(structure: CourseStructureManifest): string[] {
  const ids: string[] = []
  if (structure.programOverview?.folder) ids.push("program-overview")
  for (const t of structure.topics) {
    ids.push(`${t.id}-slides`)
  }
  return ids
}

/** Resolve slide folder name for a given page ID (for slides view). */
export function getSlideFolderForPageId(
  pageId: string,
  structure: CourseStructureManifest
): string | null {
  if (structure.programOverview?.folder && pageId === "program-overview") {
    return structure.programOverview.folder
  }
  for (const t of structure.topics) {
    if (pageId === `${t.id}-slides` || pageId === `${t.id}-video`) return t.folder
  }
  return null
}

/** Human-readable title for topic video-only pages (NCLEX; audio is on the slides page). Program overview has no video tab. */
export function getTopicMediaPageLabel(pageId: string, structure: CourseStructureManifest): string {
  for (const t of structure.topics) {
    if (pageId === `${t.id}-video`) return `${t.label} – Video`
  }
  return pageId
}

/** Whether this page ID is a topic lecture video step (before slides; not used for program overview). */
export function isTopicVideoPageId(pageId: string): boolean {
  return pageId.endsWith("-video") && pageId !== "program-overview-video"
}

/** Resolve topic folder name for a flashcards page ID (e.g. topic-1-flashcards → Topic 1 folder). */
export function getFlashcardsFolderForPageId(
  pageId: string,
  structure: CourseStructureManifest
): string | null {
  if (!pageId.endsWith("-flashcards")) return null
  const topicId = pageId.replace(/-flashcards$/, "")
  const topic = structure.topics.find((t) => t.id === topicId)
  return topic?.folder ?? null
}

/** Resolve section label for a slides page (e.g. "Program Overview", "Topic 1"). */
export function getSlideSectionLabel(
  pageId: string,
  structure: CourseStructureManifest
): string {
  if (pageId === "program-overview" && structure.programOverview?.label) return structure.programOverview.label
  const topic = structure.topics.find((t) => pageId === `${t.id}-slides`)
  return topic?.label ?? pageId
}

/**
 * Get the topic index (0-based) for any topic-scoped page ID (slides, practice-q, quiz).
 * Returns -1 for non-topic pages (e.g. program-overview, student-learning-note).
 */
export function getTopicIndexForPageId(
  pageId: string,
  structure: CourseStructureManifest
): number {
  if (pageId.endsWith("-quiz")) {
    const topicId = pageId.replace(/-quiz$/, "")
    return structure.topics.findIndex((t) => t.id === topicId)
  }
  if (pageId.endsWith("-slides")) {
    const topicId = pageId.replace(/-slides$/, "")
    return structure.topics.findIndex((t) => t.id === topicId)
  }
  if (pageId.endsWith("-video")) {
    const topicId = pageId.replace(/-video$/, "")
    if (topicId === "program-overview") return -1
    return structure.topics.findIndex((t) => t.id === topicId)
  }
  if (pageId.endsWith("-flashcards")) {
    const topicId = pageId.replace(/-flashcards$/, "")
    return structure.topics.findIndex((t) => t.id === topicId)
  }
  if (pageId.endsWith("-ngn")) {
    const topicId = pageId.replace(/-ngn$/, "")
    return structure.topics.findIndex((t) => t.id === topicId)
  }
  const practiceQMatch = pageId.match(/^(.+)-practice-q(-\d+)?$/)
  if (practiceQMatch) {
    const topicId = practiceQMatch[1]
    return structure.topics.findIndex((t) => t.id === topicId)
  }
  return -1
}

/** Whether the page is the single course case study (one per course). */
export function isCourseCaseStudyPageId(pageId: string): boolean {
  return pageId === COURSE_CASE_STUDY_PAGE_ID
}

/**
 * Get the topic index (0-based) for a quiz page ID (e.g. "topic-1-quiz" → 0).
 * Returns -1 if not a topic quiz or not found in structure.
 */
export function getTopicIndexForQuizPage(
  pageId: string,
  structure: CourseStructureManifest
): number {
  if (!pageId.endsWith("-quiz")) return -1
  const topicId = pageId.replace(/-quiz$/, "")
  return structure.topics.findIndex((t) => t.id === topicId)
}

const PRACTICE_Q_BASE = "Practice Q"

/**
 * Get topic index (0-based) from a practice-q page ID.
 * Supports "topic-1-practice-q" (legacy) and "topic-1-practice-q-1", "topic-1-practice-q-2", etc.
 */
export function getTopicIndexForPracticeQPage(
  pageId: string,
  structure: CourseStructureManifest
): number {
  const withSub = pageId.match(/^(.+)-practice-q-\d+$/)
  const topicId = withSub ? withSub[1] : pageId.endsWith("-practice-q") ? pageId.replace(/-practice-q$/, "") : null
  if (!topicId) return -1
  return structure.topics.findIndex((t) => t.id === topicId)
}

/**
 * Get subsection number from a practice-q page ID (e.g. "topic-1-practice-q-2" → 2). Returns 1 for legacy "topic-1-practice-q".
 */
export function getPracticeQSubsectionFromPageId(pageId: string): number {
  const m = pageId.match(/-practice-q-(\d+)$/)
  return m ? parseInt(m[1], 10) : 1
}

/**
 * Get the slide folder path for Practice Q slides.
 * Accepts quiz pageId (topic-1-quiz) or practice-q pageId (topic-1-practice-q or topic-1-practice-q-2).
 * Returns e.g. "Practice Q/Topic 1.2" for topic-1-practice-q-2.
 */
export function getPracticeQSlideFolder(
  pageId: string,
  structure: CourseStructureManifest,
  subsection?: number
): string | null {
  let topicIdx = getTopicIndexForQuizPage(pageId, structure)
  if (topicIdx < 0) topicIdx = getTopicIndexForPracticeQPage(pageId, structure)
  if (topicIdx < 0) return null
  const topicNum = topicIdx + 1
  const subNum = subsection ?? getPracticeQSubsectionFromPageId(pageId)
  const folderName = `Topic ${topicNum}.${subNum}`
  return `${PRACTICE_Q_BASE}/${folderName}`
}
