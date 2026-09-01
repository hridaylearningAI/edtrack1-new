/**
 * Learn shell helpers.
 *
 * Three shells:
 * - GNPS mineral (ETHTL / Global Nursing packs)
 * - Exam-only NCLEX mineral
 * - Bold EdTec (BSB / standard VET topic units)
 * Full NCLEX (course 45) stays on the classic adaptive shell.
 */

export function shouldUseImmersiveLearnShell(opts: {
  isNclexFullCourse: boolean
}): boolean {
  return !opts.isNclexFullCourse
}

/** Topic-based VET units — Bold EdTec shell, not GNPS mineral. */
export function isTopicBasedImmersiveShell(opts: {
  useImmersiveLearnShell: boolean
  isGnpsCourse: boolean
  isNclexExamOnlyCourse: boolean
}): boolean {
  return opts.useImmersiveLearnShell && !opts.isGnpsCourse && !opts.isNclexExamOnlyCourse
}

export const TOPIC_UNIT_HOME_PAGE_ID = "unit-home"

export function getImmersiveSeriesKicker(opts: {
  isGnpsCourse: boolean
  isNclexExamOnlyCourse: boolean
  categoryName?: string | null
}): string {
  if (opts.isNclexExamOnlyCourse) return "NCLEX Test Preparation"
  if (opts.isGnpsCourse) return "Global Nursing Professional Series"
  const category = opts.categoryName?.trim()
  if (category) return category
  return "EdTec Vocational Training"
}
