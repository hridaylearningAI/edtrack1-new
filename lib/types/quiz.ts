/**
 * Structured quiz format (parsed from Word / text source).
 * Use scripts/parse-quiz-from-word.mjs to convert Word-paste text into this JSON.
 */
export type QuizOptionLetter = "A" | "B" | "C" | "D" | "E"

export interface QuizOption {
  letter: QuizOptionLetter
  text: string
}

/** Difficulty for NCLEX-style adaptive quizzing. Defaults to "easy" when missing. */
export type QuizDifficulty = "easy" | "moderate" | "hard"

export interface QuizQuestion {
  number: number
  question: string
  options: QuizOption[]
  /** Single-select correct option (standard NCLEX items). */
  correctLetter: QuizOptionLetter
  /** Optional explanation shown after answering (from module-based quiz format). */
  rationale?: string
  /** NCLEX difficulty: easy=1pt, moderate=2pt, hard=3pt. Default "easy" when missing. */
  difficulty?: QuizDifficulty
  /** GNPS / question-bank program area label (where the item comes from). */
  programArea?: string
  /** GNPS / question-bank section label (topic within the program). */
  sectionLabel?: string
  /** Numeric section index when sourced from a sectioned bank (1–4). */
  section?: number
  /** When set, question came from NGN JSON (mock test pool); used for stable IDs. */
  _ngn?: { module: number; case: number; q: number }
  /** When set, the question belongs to an NGN case study; used for mock/test UI context. */
  ngnCaseStudy?: { title: string; narrative: string }
  /** Topic index 0–8 for Topics 1–9 (set by initNclexPoolsWithIndices). */
  _topicIdx?: number
  /** NGN mock: use drag/drop + click UI like the NGN case study viewer. */
  ngnInteraction?: "dragdrop"
  /** NGN mock: select all that apply; use `correctKeys` for grading. */
  ngnMultiSelect?: boolean
  /** Correct option letters for NGN multi-select (order-independent). */
  correctKeys?: QuizOptionLetter[]
}

export interface QuizTopic {
  number: number
  title: string
  questions: QuizQuestion[]
}

export interface ParsedQuiz {
  title: string
  code?: string
  topics: QuizTopic[]
}

/** Flatten all questions in order for a simple "question index" view (e.g. trial quiz). */
export function flattenQuizQuestions(quiz: ParsedQuiz): QuizQuestion[] {
  return quiz.topics.flatMap((t) => t.questions)
}

// --- Module-based quiz format (alternative structure) ---

export interface ModuleQuizOption {
  letter: "A" | "B" | "C" | "D"
  text: string
}

export interface ModuleQuestion {
  number: number
  question: string
  options: ModuleQuizOption[]
  correctAnswer: string
  rationale?: string
  difficulty?: QuizDifficulty
}

export interface QuizModule {
  title: string
  questions: ModuleQuestion[]
}

export interface ModuleBasedQuiz {
  title: string
  code?: string
  modules: QuizModule[]
}

const LETTERS = ["A", "B", "C", "D"] as const
const DIFFICULTIES: QuizDifficulty[] = ["easy", "moderate", "hard"]

function normalizeDifficulty(d: unknown): QuizDifficulty {
  if (typeof d !== "string") return "easy"
  const v = String(d).toLowerCase()
  if (DIFFICULTIES.includes(v as QuizDifficulty)) return v as QuizDifficulty
  if (v.includes("moderate")) return "moderate"
  if (v.includes("hard") || v.includes("complex")) return "hard"
  return "easy"
}

function normalizeCorrectAnswer(
  correctAnswer: string,
  options: { letter: string; text: string }[]
): "A" | "B" | "C" | "D" {
  const normalized = String(correctAnswer ?? "").trim().toUpperCase()
  if (LETTERS.includes(normalized as (typeof LETTERS)[number])) return normalized as "A" | "B" | "C" | "D"
  const byLetter = options.find((o) => o.letter?.toUpperCase() === normalized)
  if (byLetter) return byLetter.letter as "A" | "B" | "C" | "D"
  const byText = options.find((o) => o.text?.trim() === (correctAnswer ?? "").trim())
  if (byText) return byText.letter as "A" | "B" | "C" | "D"
  return options[0]?.letter as "A" | "B" | "C" | "D" ?? "A"
}

/** Detect if raw quiz JSON is in module-based format (modules array, correctAnswer, etc.). */
export function isModuleBasedQuiz(data: unknown): data is ModuleBasedQuiz {
  if (typeof data !== "object" || data === null) return false
  const d = data as Record<string, unknown>
  if (typeof d.title !== "string") return false
  if (!Array.isArray(d.modules)) return false
  for (const m of d.modules as unknown[]) {
    if (typeof m !== "object" || m === null) return false
    const mod = m as Record<string, unknown>
    if (typeof mod.title !== "string") return false
    if (!Array.isArray(mod.questions)) return false
    for (const q of mod.questions as unknown[]) {
      if (typeof q !== "object" || q === null) return false
      const qu = q as Record<string, unknown>
      if (typeof qu.question !== "string" || !Array.isArray(qu.options)) return false
      if (typeof qu.correctAnswer !== "string" && qu.correctAnswer != null) return false
    }
  }
  return true
}

/** Convert module-based quiz to the standard ParsedQuiz (topics) format. */
export function normalizeModuleBasedQuiz(quiz: ModuleBasedQuiz): ParsedQuiz {
  const topics: QuizTopic[] = quiz.modules.map((mod, idx) => ({
    number: idx + 1,
    title: mod.title,
    questions: mod.questions.map((q) => ({
      number: q.number,
      question: q.question,
      options: q.options.map((o) => ({ letter: o.letter, text: o.text })),
      correctLetter: normalizeCorrectAnswer(q.correctAnswer, q.options),
      rationale: q.rationale,
      difficulty: normalizeDifficulty(q.difficulty),
    })),
  }))
  return { title: quiz.title, code: quiz.code, topics }
}
