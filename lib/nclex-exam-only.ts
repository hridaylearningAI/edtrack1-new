/** Brand-new exam-only NCLEX product (separate from full NCLEX course id 45). */
export const NCLEX_EXAM_ONLY_COURSE_CODE = "ETP-NCLEX-TP"

/** Full NCLEX course id in SMS (strategies hub + orientation historically gated here). */
export const NCLEX_FULL_COURSE_ID = 45

/** Exam-only NCLEX Test Prep course id (`ETP-NCLEX-TP`). */
export const NCLEX_EXAM_ONLY_COURSE_ID = 60

/** Courses that run proctored NCLEX mocks (trainer dashboards). */
export const NCLEX_PROCTORING_COURSE_IDS = [NCLEX_FULL_COURSE_ID, NCLEX_EXAM_ONLY_COURSE_ID] as const

/** Always-unlocked hub page for exam-only learn UI (GNPS-style unit home). */
export const NCLEX_EXAM_HOME_PAGE_ID = "nclex-exam-home"

/** Always-unlocked Topics 1–9 unit list hub. */
export const NCLEX_TOPICS_HOME_PAGE_ID = "nclex-topics-home"

const NCLEX_TOPIC_HOME_PREFIX = "nclex-topic-home-"

export function getNclexTopicHomePageId(topicId: string): string {
  return `${NCLEX_TOPIC_HOME_PREFIX}${topicId}`
}

export function isNclexTopicsHomePageId(pageId?: string | null): boolean {
  return pageId === NCLEX_TOPICS_HOME_PAGE_ID
}

export function isNclexTopicHomePageId(pageId?: string | null): boolean {
  return typeof pageId === "string" && pageId.startsWith(NCLEX_TOPIC_HOME_PREFIX)
}

export function parseNclexTopicHomePageId(pageId?: string | null): string | null {
  if (!isNclexTopicHomePageId(pageId) || !pageId) return null
  const topicId = pageId.slice(NCLEX_TOPIC_HOME_PREFIX.length).trim()
  return topicId || null
}

/** Course overview, topics list, and per-topic hubs — not required progression pages. */
export function isNclexExamHubPageId(pageId?: string | null): boolean {
  return (
    pageId === NCLEX_EXAM_HOME_PAGE_ID ||
    isNclexTopicsHomePageId(pageId) ||
    isNclexTopicHomePageId(pageId)
  )
}

export function isNclexExamOnlyCourseCode(code?: string | null): boolean {
  return (code ?? "").trim().toUpperCase() === NCLEX_EXAM_ONLY_COURSE_CODE
}

/**
 * Full NCLEX and exam-only Test Prep both get the strategies hub, 72-hour plan,
 * traps list, and orientation / test-strategy content.
 */
export function courseAllowsNclexPrepResources(
  courseId?: number | null,
  courseCode?: string | null,
): boolean {
  if (courseId === NCLEX_FULL_COURSE_ID) return true
  return isNclexExamOnlyCourseCode(courseCode)
}

/** Mineral immersive shell shared with GNPS learn pages (exam-only product only). */
export function usesGnpsStyleLearnShell(
  isGnpsCourse: boolean,
  courseCode?: string | null,
): boolean {
  return isGnpsCourse || isNclexExamOnlyCourseCode(courseCode)
}
