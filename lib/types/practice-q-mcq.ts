/**
 * Extracted Practice Q MCQ bank (from slide images via Gemini).
 * Served from data/practice-q-mcq-45.json or CDN practice-q-mcq.json.
 */

import type { QuizOptionLetter, QuizQuestion } from "@/lib/types/quiz"
import { parsePracticeQFolderName } from "@/lib/types/practice-q-manifest"

export interface PracticeQMcqFolder {
  folder: string
  pageId: string
  questions: QuizQuestion[]
  /** Items Gemini flagged as uncertain — kept for review, still playable if complete. */
  needsReview?: boolean
}

export interface PracticeQMcqBank {
  title: string
  code?: string
  source?: string
  generatedAt?: string
  folders: PracticeQMcqFolder[]
}

const LETTERS: QuizOptionLetter[] = ["A", "B", "C", "D", "E"]

function isLetter(v: unknown): v is QuizOptionLetter {
  return typeof v === "string" && LETTERS.includes(v.toUpperCase() as QuizOptionLetter)
}

function normalizeQuestion(raw: unknown, index: number): QuizQuestion | null {
  if (!raw || typeof raw !== "object") return null
  const q = raw as Record<string, unknown>
  const question = typeof q.question === "string" ? q.question.trim() : ""
  if (!question) return null

  const optionsRaw = Array.isArray(q.options) ? q.options : []
  const options = optionsRaw
    .map((opt) => {
      if (!opt || typeof opt !== "object") return null
      const o = opt as Record<string, unknown>
      const letter = isLetter(o.letter) ? (String(o.letter).toUpperCase() as QuizOptionLetter) : null
      const text = typeof o.text === "string" ? o.text.trim() : ""
      if (!letter || !text) return null
      return { letter, text }
    })
    .filter((o): o is { letter: QuizOptionLetter; text: string } => o != null)

  if (options.length < 2) return null

  let correctLetter: QuizOptionLetter | null = isLetter(q.correctLetter)
    ? (String(q.correctLetter).toUpperCase() as QuizOptionLetter)
    : null
  if (!correctLetter && typeof q.correctAnswer === "string" && isLetter(q.correctAnswer)) {
    correctLetter = String(q.correctAnswer).toUpperCase() as QuizOptionLetter
  }
  if (!correctLetter) return null
  if (!options.some((o) => o.letter === correctLetter)) return null

  const number =
    typeof q.number === "number" && Number.isFinite(q.number) && q.number > 0
      ? Math.floor(q.number)
      : index + 1

  return {
    number,
    question,
    options,
    correctLetter,
    rationale: typeof q.rationale === "string" && q.rationale.trim() ? q.rationale.trim() : undefined,
    difficulty:
      q.difficulty === "easy" || q.difficulty === "moderate" || q.difficulty === "hard"
        ? q.difficulty
        : undefined,
  }
}

/** Build canonical pageId for a Practice Q folder name (e.g. Topic 1.2 → topic-1-practice-q-2). */
export function practiceQFolderToPageId(folderName: string): string | null {
  const parsed = parsePracticeQFolderName(folderName)
  if (!parsed) return null
  return `topic-${parsed.topicIdx + 1}-practice-q-${parsed.subNum}`
}

export function normalizePracticeQMcqBank(data: unknown): PracticeQMcqBank | null {
  if (!data || typeof data !== "object") return null
  const d = data as Record<string, unknown>
  if (!Array.isArray(d.folders)) return null

  const folders: PracticeQMcqFolder[] = []
  for (const entry of d.folders) {
    if (!entry || typeof entry !== "object") continue
    const e = entry as Record<string, unknown>
    const folder = typeof e.folder === "string" ? e.folder.trim() : ""
    if (!folder) continue
    const pageId =
      typeof e.pageId === "string" && e.pageId.trim()
        ? e.pageId.trim()
        : practiceQFolderToPageId(folder)
    if (!pageId) continue
    const questionsRaw = Array.isArray(e.questions) ? e.questions : []
    const questions = questionsRaw
      .map((q, i) => normalizeQuestion(q, i))
      .filter((q): q is QuizQuestion => q != null)
      .map((q, i) => ({ ...q, number: i + 1 }))
    folders.push({
      folder,
      pageId,
      questions,
      needsReview: e.needsReview === true,
    })
  }

  if (folders.length === 0) return null

  return {
    title: typeof d.title === "string" && d.title.trim() ? d.title.trim() : "Practice Q MCQs",
    code: typeof d.code === "string" ? d.code : undefined,
    source: typeof d.source === "string" ? d.source : undefined,
    generatedAt: typeof d.generatedAt === "string" ? d.generatedAt : undefined,
    folders,
  }
}

export function getPracticeQMcqQuestionsForPage(
  bank: PracticeQMcqBank | null | undefined,
  pageId: string,
  folderName?: string | null
): QuizQuestion[] {
  if (!bank || !pageId) return []
  const byPage = bank.folders.find((f) => f.pageId === pageId)
  if (byPage?.questions.length) return byPage.questions
  const folderHint = folderName?.replace(/^Practice Q\//, "").trim()
  if (folderHint) {
    const byFolder = bank.folders.find(
      (f) => f.folder === folderHint || f.folder === folderName
    )
    if (byFolder?.questions.length) return byFolder.questions
  }
  return []
}
