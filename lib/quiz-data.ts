/**
 * Load parsed quiz JSON and expose flattened questions for the trial quiz.
 * Regenerate data/quiz-critical-thinking.json with:
 *   node scripts/parse-quiz-from-word.mjs data/quiz-source.txt -o data/quiz-critical-thinking.json
 */
import type { ParsedQuiz, QuizQuestion } from "./types/quiz"
import { flattenQuizQuestions } from "./types/quiz"

import quizJson from "../data/quiz-critical-thinking.json"

const parsed = quizJson as ParsedQuiz
export const parsedQuiz: ParsedQuiz = parsed
export const quizQuestions: QuizQuestion[] = flattenQuizQuestions(parsed)

/** Get questions for a single topic by index (0-based). Topic 1 quiz → index 0. */
export function getQuestionsForTopic(parsed: ParsedQuiz, topicIndex: number): QuizQuestion[] {
  const topic = parsed.topics[topicIndex]
  return topic?.questions ?? []
}

/** Get questions from a range of topics (0-based indices, endInclusive). Topics 1–9 → startIdx 0, endIdx 8. */
export function getQuestionsForTopicsRange(
  parsed: ParsedQuiz,
  startIdx: number,
  endIdx: number
): QuizQuestion[] {
  const questions: QuizQuestion[] = []
  for (let i = startIdx; i <= endIdx && i < (parsed.topics?.length ?? 0); i++) {
    const topic = parsed.topics[i]
    if (topic?.questions?.length) {
      questions.push(...topic.questions)
    }
  }
  return questions
}

/** Fisher–Yates shuffle (mutates array). */
function shuffleInPlace<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
}

/** Return a new array with items shuffled (does not mutate the input). */
export function shuffleArray<T>(items: T[]): T[] {
  const copy = [...items]
  shuffleInPlace(copy)
  return copy
}

/**
 * Pick up to n questions at random from the list and return them in random order.
 * If the list has fewer than n questions, returns all of them shuffled.
 */
export function pickRandomQuestions(questions: QuizQuestion[], n: number): QuizQuestion[] {
  if (questions.length === 0) return []
  const copy = [...questions]
  shuffleInPlace(copy)
  return copy.slice(0, n)
}

const DISPLAY_OPTION_LETTERS = ["A", "B", "C", "D", "E"] as const

/**
 * Build an attempt set: random subset (up to `n`), renumbered 1..k, with option
 * order shuffled per question. Display letters are always A→E in list order;
 * `correctLetter` / `correctKeys` are remapped to the new positions so grading stays valid.
 */
export function prepareRandomQuizAttempt(questions: QuizQuestion[], n: number): QuizQuestion[] {
  return pickRandomQuestions(questions, n).map((q, index) => {
    const shuffled = shuffleArray(q.options ?? [])
    const remapped = shuffled.map((opt, i) => ({
      text: opt.text,
      letter: DISPLAY_OPTION_LETTERS[i] ?? opt.letter,
    }))

    const correctIdx = shuffled.findIndex(
      (opt) => String(opt.letter).toUpperCase() === String(q.correctLetter).toUpperCase()
    )
    const correctLetter =
      remapped[correctIdx >= 0 ? correctIdx : 0]?.letter ?? q.correctLetter

    const correctKeys = q.correctKeys?.map((orig) => {
      const idx = shuffled.findIndex(
        (opt) => String(opt.letter).toUpperCase() === String(orig).toUpperCase()
      )
      return remapped[idx >= 0 ? idx : 0]?.letter ?? orig
    })

    return {
      ...q,
      number: index + 1,
      options: remapped,
      correctLetter,
      ...(correctKeys ? { correctKeys } : {}),
    }
  })
}

// --- NCLEX adaptive quiz logic ---

/** Minimum questions before a pass/fail decision (except time expiry). */
export const NCLEX_MIN_QUESTIONS = 75
/** Hard stop for the adaptive exam. */
export const NCLEX_MAX_QUESTIONS = 150
/** Pass when accuracy reaches this percent after the minimum question count. */
export const NCLEX_PASSING_PERCENT = 75
/** Full mock/exam session length. */
export const NCLEX_EXAM_DURATION_SECONDS = 5 * 60 * 60

/**
 * Legacy difficulty-weighted marks target (module analytics only).
 * Pass/fail for the adaptive exam uses {@link NCLEX_PASSING_PERCENT}, not this value.
 */
export const NCLEX_PASSING_SCORE = 125

export type NclexDifficulty = "easy" | "moderate" | "hard"

export type NclexExamProgressStatus = "continue" | "pass" | "fail"

export type NclexExamProgressResult = {
  status: NclexExamProgressStatus
  accuracyPercent: number
}

/** Accuracy as a 0–100 percent (one decimal avoided; rounded for display separately). */
export function nclexExamAccuracyPercent(correctCount: number, answeredCount: number): number {
  if (answeredCount <= 0) return 0
  return (correctCount / answeredCount) * 100
}

function meetsNclexPassingAccuracy(correctCount: number, answeredCount: number): boolean {
  if (answeredCount <= 0) return false
  // Integer-safe: correct/answered >= 75/100
  return correctCount * 100 >= answeredCount * NCLEX_PASSING_PERCENT
}

/**
 * Evaluate after each answered question.
 * - Before {@link NCLEX_MIN_QUESTIONS}: always continue (unless somehow over max).
 * - At/after min: pass immediately if accuracy ≥ {@link NCLEX_PASSING_PERCENT}.
 * - At {@link NCLEX_MAX_QUESTIONS}: pass if accuracy met, otherwise fail.
 */
export function evaluateNclexExamProgress(
  answeredCount: number,
  correctCount: number
): NclexExamProgressResult {
  const accuracyPercent = nclexExamAccuracyPercent(correctCount, answeredCount)
  if (answeredCount <= 0) {
    return { status: "continue", accuracyPercent }
  }
  if (answeredCount >= NCLEX_MAX_QUESTIONS) {
    return {
      status: meetsNclexPassingAccuracy(correctCount, answeredCount) ? "pass" : "fail",
      accuracyPercent,
    }
  }
  if (answeredCount < NCLEX_MIN_QUESTIONS) {
    return { status: "continue", accuracyPercent }
  }
  if (meetsNclexPassingAccuracy(correctCount, answeredCount)) {
    return { status: "pass", accuracyPercent }
  }
  return { status: "continue", accuracyPercent }
}

/**
 * When the exam timer expires: pass only if ≥ min questions and ≥ passing accuracy.
 */
export function evaluateNclexExamOnTimeExpiry(
  answeredCount: number,
  correctCount: number
): NclexExamProgressResult {
  const accuracyPercent = nclexExamAccuracyPercent(correctCount, answeredCount)
  if (
    answeredCount >= NCLEX_MIN_QUESTIONS &&
    meetsNclexPassingAccuracy(correctCount, answeredCount)
  ) {
    return { status: "pass", accuracyPercent }
  }
  return { status: "fail", accuracyPercent }
}

/** Get difficulty from question; default "easy" when missing. */
export function getQuestionDifficulty(q: QuizQuestion): NclexDifficulty {
  const d = (q as { difficulty?: string }).difficulty
  if (d === "moderate" || d === "hard") return d
  return "easy"
}

/** Marks per correct answer by difficulty. Wrong = 0. */
export const NCLEX_MARKS: Record<NclexDifficulty, number> = {
  easy: 1,
  moderate: 2,
  hard: 3,
}

/** Build pools by difficulty from flattened questions. */
export function buildNclexPools(questions: QuizQuestion[]): Record<NclexDifficulty, QuizQuestion[]> {
  const easy: QuizQuestion[] = []
  const moderate: QuizQuestion[] = []
  const hard: QuizQuestion[] = []
  for (const q of questions) {
    const d = getQuestionDifficulty(q)
    if (d === "moderate") moderate.push(q)
    else if (d === "hard") hard.push(q)
    else easy.push(q)
  }
  return { easy, moderate, hard }
}

/** Pick one random question from pool, excluding usedIds. Returns null if none left. */
export function pickOneFromPool(
  pool: QuizQuestion[],
  usedIds: Set<string>
): QuizQuestion | null {
  const available = pool.filter((q) => !usedIds.has(getQuestionId(q)))
  if (available.length === 0) return null
  const idx = Math.floor(Math.random() * available.length)
  return available[idx] ?? null
}

/** Stable id for deduplication. Export for tracking used questions. */
export function getQuestionId(q: QuizQuestion): string {
  const bankId = (q as QuizQuestion & { _bankId?: string })._bankId
  if (bankId) return bankId
  const ngn = (q as { _ngn?: { module: number; case: number; q: number } })._ngn
  if (ngn && Number.isFinite(ngn.module)) {
    return `ngn-m${ngn.module}-c${ngn.case}-q${ngn.q}`
  }
  return `${(q as { _topicIdx?: number })._topicIdx ?? 0}-${q.number}-${q.question.slice(0, 80)}`
}

/** Get next difficulty after answering. Easy->M; M correct->H, M wrong->E; H->M; E correct/wrong->M. */
export function getNextNclexDifficulty(
  currentDifficulty: NclexDifficulty,
  wasCorrect: boolean
): NclexDifficulty {
  if (wasCorrect) {
    if (currentDifficulty === "easy") return "moderate"
    if (currentDifficulty === "moderate") return "hard"
    return "moderate" // hard correct -> cycle back to moderate
  }
  // wrong answers
  if (currentDifficulty === "easy") return "easy" // easy wrong -> stay on easy
  if (currentDifficulty === "moderate") return "easy" // moderate wrong -> back to easy
  return "moderate" // hard wrong -> moderate
}

/** Initialize NCLEX pools with _topicIdx for questionId. */
export function initNclexPoolsWithIndices(
  parsed: ParsedQuiz,
  startIdx: number,
  endIdx: number
): Record<NclexDifficulty, QuizQuestion[]> {
  const all: QuizQuestion[] = []
  for (let i = startIdx; i <= endIdx && i < (parsed.topics?.length ?? 0); i++) {
    const topic = parsed.topics[i]
    for (const q of topic?.questions ?? []) {
      ;(q as QuizQuestion & { _topicIdx: number })._topicIdx = i
      all.push(q)
    }
  }
  return buildNclexPools(all)
}
