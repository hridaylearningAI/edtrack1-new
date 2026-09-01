import type {
  NclexMockAttemptApiRow,
  NclexMockModuleBreakdown,
} from "@/lib/nclex-mock-analytics"

export type NclexQuizAttemptSummary = {
  id: number
  quiz_identifier: string
  score_percent: number
  passed: boolean
  total_questions: number
  correct_count: number
  attempted_at: string
}

export type NclexTodaySession = {
  pageId: string
  position: number
  title: string
  detail: string
  ctaLabel: string
  isResume: boolean
}

export type NclexReadinessFocusArea = {
  module: number
  label: string
  accuracyPercent: number
  correct: number
  total: number
}

export type NclexReadinessSummary = {
  hasAssessmentData: boolean
  latestMock: {
    marksEarned: number
    passingMarks: number
    accuracyPercent: number
    passed: boolean
    completedAt: string
  } | null
  topicQuizAverage: number | null
  topicQuizzesAttempted: number
  focusAreas: NclexReadinessFocusArea[]
}

type BuildTodaySessionInput = {
  orderedPageIds: readonly string[]
  completedPageIds: ReadonlySet<string>
  savedPageId?: string | null
  savedPosition?: number | null
  isUnlocked: (pageId: string) => boolean
  getLabel: (pageId: string) => string
}

function firstEligiblePage(
  pageIds: readonly string[],
  completedPageIds: ReadonlySet<string>,
  isUnlocked: (pageId: string) => boolean
): string | null {
  return (
    pageIds.find((pageId) => !completedPageIds.has(pageId) && isUnlocked(pageId)) ??
    pageIds.find((pageId) => isUnlocked(pageId)) ??
    null
  )
}

export function buildNclexTodaySession({
  orderedPageIds,
  completedPageIds,
  savedPageId,
  savedPosition,
  isUnlocked,
  getLabel,
}: BuildTodaySessionInput): NclexTodaySession | null {
  const canResume =
    savedPageId != null &&
    orderedPageIds.includes(savedPageId) &&
    !completedPageIds.has(savedPageId) &&
    isUnlocked(savedPageId)
  const pageId = canResume
    ? savedPageId
    : firstEligiblePage(orderedPageIds, completedPageIds, isUnlocked)

  if (!pageId) return null

  const position = canResume ? Math.max(0, savedPosition ?? 0) : 0
  const title = getLabel(pageId)
  const positionHint = position > 0 ? ` · saved at step ${position + 1}` : ""

  return {
    pageId,
    position,
    title,
    detail: canResume
      ? `Pick up where you left off${positionHint}`
      : "Recommended from your current pathway progress",
    ctaLabel: canResume ? `Resume ${title}` : `Start ${title}`,
    isResume: canResume,
  }
}

function attemptedBreakdowns(
  breakdown: readonly NclexMockModuleBreakdown[]
): NclexMockModuleBreakdown[] {
  return breakdown.filter(
    (item) =>
      Number.isFinite(item.module) &&
      item.module >= 1 &&
      item.module <= 9 &&
      Number.isFinite(item.total) &&
      item.total > 0
  )
}

export function buildNclexReadiness({
  mockAttempts,
  quizAttempts,
  topicLabelsByQuizId,
  topicLabelsByModule,
}: {
  mockAttempts: readonly NclexMockAttemptApiRow[]
  quizAttempts: readonly NclexQuizAttemptSummary[]
  topicLabelsByQuizId: Readonly<Record<string, string>>
  topicLabelsByModule: Readonly<Record<number, string>>
}): NclexReadinessSummary {
  const latestMock = mockAttempts[0] ?? null
  const latestTopicAttempts = new Map<string, NclexQuizAttemptSummary>()

  for (const attempt of quizAttempts) {
    if (!topicLabelsByQuizId[attempt.quiz_identifier]) continue
    const existing = latestTopicAttempts.get(attempt.quiz_identifier)
    if (
      !existing ||
      new Date(attempt.attempted_at).getTime() > new Date(existing.attempted_at).getTime()
    ) {
      latestTopicAttempts.set(attempt.quiz_identifier, attempt)
    }
  }

  const topicAttemptRows = Array.from(latestTopicAttempts.values())
  const topicQuizAverage =
    topicAttemptRows.length > 0
      ? Math.round(
          topicAttemptRows.reduce((sum, attempt) => sum + attempt.score_percent, 0) /
            topicAttemptRows.length
        )
      : null

  const focusAreas = latestMock
    ? attemptedBreakdowns(latestMock.breakdown_by_module ?? [])
        .map((item) => ({
          module: item.module,
          label: topicLabelsByModule[item.module] ?? item.label ?? `Module ${item.module}`,
          accuracyPercent: Math.round((item.correct / item.total) * 100),
          correct: item.correct,
          total: item.total,
        }))
        .sort(
          (a, b) =>
            a.accuracyPercent - b.accuracyPercent ||
            b.total - a.total ||
            a.module - b.module
        )
        .slice(0, 3)
    : []

  return {
    hasAssessmentData: latestMock != null || topicAttemptRows.length > 0,
    latestMock: latestMock
      ? {
          marksEarned: latestMock.marks_earned,
          passingMarks: latestMock.passing_marks,
          accuracyPercent:
            latestMock.total_questions_in_sequence > 0
              ? Math.round(
                  (latestMock.correct_count / latestMock.total_questions_in_sequence) * 100
                )
              : 0,
          passed: latestMock.passed,
          completedAt: latestMock.completed_at,
        }
      : null,
    topicQuizAverage,
    topicQuizzesAttempted: topicAttemptRows.length,
    focusAreas,
  }
}
