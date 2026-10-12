/**
 * Which questions an attempt shows, and the mark needed to pass.
 *
 * Extracted verbatim from the legacy learn page so both players select identically — these numbers
 * decide whether a learner passes, so they must not drift.
 */
import {
  ethtl115QuizToQuestions,
  getEthtl115QuizPassingPercent,
  getEthtl115SectionQuizSlice,
  type Ethtl115LevelNumber,
  type Ethtl115SectionNumber,
} from "@/lib/gnps/ethtl115"
import { getQuestionsForTopic, prepareRandomQuizAttempt } from "@/lib/quiz-data"
import type { ParsedQuiz } from "@/lib/types/quiz"
import {
  getPracticeQSubsectionFromPageId,
  getTopicIndexForPracticeQPage,
  getTopicIndexForQuizPage,
  type CourseStructureManifest,
} from "@/lib/types/course-structure"
import type { QuizQuestion } from "@/lib/types/quiz"
import { NCLEX_COURSE_ID, NCLEX_OPEN_MODULES_COUNT } from "@/lib/player/gating"
import type { Activity } from "@/lib/player/model"

export const QUIZ_QUESTIONS_PER_ATTEMPT = 10
export const NCLEX_TOPIC_QUIZ_PASSING_PERCENT = 90
/** Every other course: half marks to pass. */
export const DEFAULT_QUIZ_PASSING_PERCENT = 50

export type QuizSelectionInput = {
  activity: Activity
  courseId: number | null
  courseCode: string
  structure: CourseStructureManifest
  parsedQuiz: ParsedQuiz
  quizSourceByTopicIdx: number[]
  practiceQSourceByTopicIdx: number[]
  getPracticeQMcqQuestions: (pageId: string, folderHint?: string | null) => QuizQuestion[]
  isNclexAdaptiveShell: boolean
  isNclexExamOnly: boolean
}

export function selectQuizQuestions(input: QuizSelectionInput): QuizQuestion[] {
  const { activity, structure, courseCode } = input

  // Only exam-only courses answer Practice Q as MCQs; elsewhere they are slide decks (see resolver).
  if (activity.kind === "practice-q") {
    if (!input.isNclexExamOnly) return []
    const topicIdx = getTopicIndexForPracticeQPage(activity.id, structure)
    const sourceTopicNum =
      topicIdx >= 0 ? (input.practiceQSourceByTopicIdx[topicIdx] ?? topicIdx + 1) : null
    const folderHint =
      sourceTopicNum != null
        ? `Topic ${sourceTopicNum}.${getPracticeQSubsectionFromPageId(activity.id)}`
        : null
    const pool = input.getPracticeQMcqQuestions(activity.id, folderHint)
    // Keep extracted order (matches slide sequence); take a full set for the subsection.
    return pool.map((q, i) => ({ ...q, number: i + 1 }))
  }

  if (activity.source.from === "gnps" && activity.source.section != null) {
    const sectionPool = ethtl115QuizToQuestions(
      getEthtl115SectionQuizSlice(
        activity.source.level as Ethtl115LevelNumber,
        activity.source.section as Ethtl115SectionNumber,
        courseCode
      )
    )
    // GNPS section checks: 10 random items, shuffled option order each attempt.
    return prepareRandomQuizAttempt(sectionPool, QUIZ_QUESTIONS_PER_ATTEMPT)
  }

  const topicIndex = getTopicIndexForQuizPage(activity.id, structure)
  const sourceTopicIndex =
    topicIndex >= 0 ? Math.max(0, (input.quizSourceByTopicIdx[topicIndex] ?? topicIndex + 1) - 1) : -1
  const allForTopic = sourceTopicIndex >= 0 ? getQuestionsForTopic(input.parsedQuiz, sourceTopicIndex) : []
  const isNclexModule9Quiz = input.isNclexAdaptiveShell && sourceTopicIndex === NCLEX_OPEN_MODULES_COUNT - 1
  const limit = isNclexModule9Quiz ? allForTopic.length : QUIZ_QUESTIONS_PER_ATTEMPT
  return prepareRandomQuizAttempt(allForTopic, limit)
}

export function quizPassingPercent(activity: Activity, courseId: number | null, courseCode: string): number {
  if (activity.source.from === "gnps") {
    return getEthtl115QuizPassingPercent(activity.source.level as Ethtl115LevelNumber, courseCode)
  }
  if (courseId === NCLEX_COURSE_ID) return NCLEX_TOPIC_QUIZ_PASSING_PERCENT
  return DEFAULT_QUIZ_PASSING_PERCENT
}
