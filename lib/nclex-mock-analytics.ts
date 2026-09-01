import type { QuizQuestion } from "@/lib/types/quiz"
import {
  getQuestionDifficulty,
  getQuestionId,
  NCLEX_MARKS,
  type NclexDifficulty,
} from "@/lib/quiz-data"

/** Grade one attempt (radio, or NGN drag/drop single or multi encoded as "A" or "A,B,C"). */
export function nclexGradeAnswer(qu: QuizQuestion, raw: string | undefined): boolean {
  if (raw == null || String(raw).trim() === "") return false
  if (qu.ngnMultiSelect && qu.correctKeys && qu.correctKeys.length > 0) {
    const sel = String(raw)
      .split(",")
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean)
      .sort()
      .join(",")
    const cor = [...qu.correctKeys]
      .map((c) => String(c).toUpperCase())
      .sort()
      .join(",")
    return sel === cor
  }
  return String(raw).trim().toUpperCase() === String(qu.correctLetter).trim().toUpperCase()
}

export function getNclexQuestionModule(q: QuizQuestion): number {
  if (q._ngn?.module != null && q._ngn.module >= 1 && q._ngn.module <= 9) return q._ngn.module
  const t = q._topicIdx
  if (typeof t === "number" && t >= 0 && t < 9) return t + 1
  return 0
}

export type NclexMockModuleBreakdown = {
  module: number
  label: string
  correct: number
  total: number
  marksEarned: number
}

export type NclexMockQuestionItem = {
  order: number
  module: number | null
  source: "topic" | "ngn"
  difficulty: NclexDifficulty
  correct: boolean
  questionId: string
  marksEarned: number
  /** Stem shown to the student. */
  question: string
  /** Raw selected key(s), e.g. "B" or "A,C". Null if unanswered. */
  selectedAnswer: string | null
  /** Correct key(s) for grading, e.g. "B" or "A,C". */
  correctAnswer: string
  /** Human-readable selected option text(s), when resolvable. */
  selectedAnswerText: string | null
  /** Human-readable correct option text(s). */
  correctAnswerText: string
  /** Option snapshot at attempt time (letter + text). */
  options: Array<{ letter: string; text: string }>
}

export type NclexMockAnalyticsPayload = {
  breakdownByModule: NclexMockModuleBreakdown[]
  questionItems: NclexMockQuestionItem[]
  correctCount: number
}

/** Row shape from GET /api/progress/nclex-mock (Supabase snake_case). */
export type NclexMockAttemptApiRow = {
  id: number
  marks_earned: number
  passing_marks: number
  passed: boolean
  total_questions_in_sequence: number
  correct_count: number
  breakdown_by_module: NclexMockModuleBreakdown[]
  question_items?: NclexMockQuestionItem[]
  completed_at: string
  proctoring_terminated?: boolean
  proctoring_terminate_reason?: string | null
  proctoring_summary?: unknown
}

function resolveAnswerKeys(qu: QuizQuestion): string {
  if (qu.ngnMultiSelect && qu.correctKeys && qu.correctKeys.length > 0) {
    return [...qu.correctKeys]
      .map((c) => String(c).toUpperCase())
      .sort()
      .join(",")
  }
  return String(qu.correctLetter ?? "").trim().toUpperCase()
}

function normalizeSelectedAnswer(raw: string | undefined): string | null {
  if (raw == null || String(raw).trim() === "") return null
  const parts = String(raw)
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean)
  if (parts.length === 0) return null
  if (parts.length === 1) return parts[0]
  return [...parts].sort().join(",")
}

function answerKeysToText(qu: QuizQuestion, keysEncoded: string | null): string | null {
  if (!keysEncoded) return null
  const keys = keysEncoded.split(",").map((k) => k.trim().toUpperCase()).filter(Boolean)
  if (keys.length === 0) return null
  const texts = keys.map((letter) => {
    const opt = qu.options?.find((o) => String(o.letter).toUpperCase() === letter)
    return opt?.text?.trim() || letter
  })
  return texts.join("; ")
}

export function buildNclexMockAnalyticsPayload(
  sequence: QuizQuestion[],
  answers: Record<number, string>
): NclexMockAnalyticsPayload {
  const byModule = new Map<number, { correct: number; total: number; marksEarned: number }>()
  for (let m = 1; m <= 9; m++) {
    byModule.set(m, { correct: 0, total: 0, marksEarned: 0 })
  }

  const questionItems: NclexMockQuestionItem[] = []
  let correctCount = 0

  sequence.forEach((qu, i) => {
    const raw = answers[i + 1]
    const selectedAnswer = normalizeSelectedAnswer(raw)
    const correctAnswer = resolveAnswerKeys(qu)
    const correct = nclexGradeAnswer(qu, raw)
    // Only count answered items toward the correct tally when grading; unanswered stay incorrect.
    if (correct) correctCount += 1
    const diff = getQuestionDifficulty(qu)
    const marksEarned = correct ? NCLEX_MARKS[diff] : 0
    const mod = getNclexQuestionModule(qu)
    const source: "topic" | "ngn" = qu._ngn ? "ngn" : "topic"
    const options = (qu.options ?? []).map((o) => ({
      letter: String(o.letter).toUpperCase(),
      text: String(o.text ?? "").trim(),
    }))
    const item: NclexMockQuestionItem = {
      order: i,
      module: mod >= 1 && mod <= 9 ? mod : null,
      source,
      difficulty: diff,
      correct,
      questionId: getQuestionId(qu),
      marksEarned,
      question: String(qu.question ?? "").trim(),
      selectedAnswer,
      correctAnswer,
      selectedAnswerText: answerKeysToText(qu, selectedAnswer),
      correctAnswerText: answerKeysToText(qu, correctAnswer) ?? correctAnswer,
      options,
    }
    questionItems.push(item)

    if (mod >= 1 && mod <= 9) {
      const agg = byModule.get(mod)!
      agg.total += 1
      if (correct) agg.correct += 1
      agg.marksEarned += marksEarned
    }
  })

  const breakdownByModule: NclexMockModuleBreakdown[] = []
  for (let m = 1; m <= 9; m++) {
    const agg = byModule.get(m)!
    breakdownByModule.push({
      module: m,
      label: `Module ${m}`,
      correct: agg.correct,
      total: agg.total,
      marksEarned: agg.marksEarned,
    })
  }

  return { breakdownByModule, questionItems, correctCount }
}
