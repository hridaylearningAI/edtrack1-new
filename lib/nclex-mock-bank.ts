import { readFileSync, existsSync } from "fs"
import { join } from "path"
import type { QuizOption, QuizOptionLetter, QuizQuestion } from "@/lib/types/quiz"

export type BankQuestionSource = "gnps" | "nclex" | "ngn"

export type BankQuestion = {
  id: string
  program: number | null
  level: number | null
  section: number | null
  sectionLabel: string
  programArea: string
  topicIndex?: number
  module?: number
  caseStudy?: number
  difficulty: "easy" | "moderate" | "hard"
  stem: string
  options: { letter: string; text: string }[]
  correctLetter: string
  correctKeys?: string[]
  ngnMultiSelect?: boolean
  rationale: string
  source: BankQuestionSource
}

export type BankManifest = {
  version: number
  generatedAt: string
  programCounts: Record<string, number>
  nclexPoolCount: number
  ngnPoolCount: number
  totalQuestions: number
}

export type ProgramBankFile = {
  program: number
  courseCode: string
  title: string
  questions: BankQuestion[]
}

const DATA_DIR = join(process.cwd(), "data", "nclex-mock-bank")

let manifestCache: BankManifest | null = null
const programCache = new Map<number, BankQuestion[]>()
let nclexPoolCache: BankQuestion[] | null = null
let ngnPoolCache: BankQuestion[] | null = null

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf-8")) as T
}

export function getBankManifest(): BankManifest {
  if (!manifestCache) {
    const path = join(DATA_DIR, "manifest.json")
    if (!existsSync(path)) {
      throw new Error(`NCLEX mock bank manifest not found at ${path}`)
    }
    manifestCache = readJson<BankManifest>(path)
  }
  return manifestCache
}

export function loadProgramBankQuestions(program: number): BankQuestion[] {
  if (programCache.has(program)) return programCache.get(program)!
  const path = join(DATA_DIR, "programs", `p${program}.json`)
  if (!existsSync(path)) return []
  const payload = readJson<ProgramBankFile>(path)
  programCache.set(program, payload.questions)
  return payload.questions
}

export function loadAllGnpsBankQuestions(): BankQuestion[] {
  const all: BankQuestion[] = []
  for (let p = 1; p <= 10; p++) {
    all.push(...loadProgramBankQuestions(p))
  }
  return all
}

export function loadNclexPoolQuestions(): BankQuestion[] {
  if (nclexPoolCache) return nclexPoolCache
  const path = join(DATA_DIR, "nclex-pool.json")
  if (!existsSync(path)) return []
  const payload = readJson<{ questions: BankQuestion[] }>(path)
  nclexPoolCache = payload.questions ?? []
  return nclexPoolCache
}

export function loadNgnPoolQuestions(): BankQuestion[] {
  if (ngnPoolCache) return ngnPoolCache
  const path = join(DATA_DIR, "ngn-pool.json")
  if (!existsSync(path)) return []
  const payload = readJson<{ questions: BankQuestion[] }>(path)
  ngnPoolCache = payload.questions ?? []
  return ngnPoolCache
}

export function loadAllMockBankQuestions(): BankQuestion[] {
  return [...loadAllGnpsBankQuestions(), ...loadNclexPoolQuestions(), ...loadNgnPoolQuestions()]
}

const LETTERS: QuizOptionLetter[] = ["A", "B", "C", "D", "E"]

function normalizeLetter(raw: string): QuizOptionLetter {
  const v = String(raw).trim().toUpperCase()
  if (v === "B" || v === "C" || v === "D" || v === "E") return v
  return "A"
}

function toQuizOptions(options: BankQuestion["options"]): QuizOption[] {
  return options.map((o, i) => ({
    letter: LETTERS[i] ?? normalizeLetter(o.letter),
    text: o.text,
  }))
}

/** Map bank correct letter to remapped display letters after option shuffle. */
export function remapCorrectLetter(
  bankCorrect: string,
  bankOptions: BankQuestion["options"],
  shuffledOptions: QuizOption[]
): QuizOptionLetter {
  const idx = bankOptions.findIndex(
    (o) => String(o.letter).toUpperCase() === String(bankCorrect).toUpperCase()
  )
  const targetText = idx >= 0 ? bankOptions[idx]?.text : ""
  const newIdx = shuffledOptions.findIndex((o) => o.text === targetText)
  return shuffledOptions[newIdx >= 0 ? newIdx : 0]?.letter ?? normalizeLetter(bankCorrect)
}

export function bankQuestionToQuizQuestion(raw: BankQuestion, displayNumber: number): QuizQuestion {
  const options = toQuizOptions(raw.options)
  const correctLetter = normalizeLetter(raw.correctLetter)

  const q: QuizQuestion & { _bankId: string } = {
    number: displayNumber,
    question: raw.stem,
    options,
    correctLetter,
    rationale: raw.rationale,
    difficulty: raw.difficulty,
    programArea: raw.programArea,
    sectionLabel: raw.sectionLabel,
    section: raw.section ?? undefined,
    _bankId: raw.id,
  }

  if (raw.source === "nclex" && typeof raw.topicIndex === "number") {
    ;(q as QuizQuestion & { _topicIdx: number })._topicIdx = raw.topicIndex
  }

  if (raw.source === "gnps" && raw.program != null && raw.program >= 1) {
    ;(q as QuizQuestion & { _topicIdx: number })._topicIdx = Math.min(raw.program, 9) - 1
  }

  if (raw.source === "ngn") {
    const mod = raw.module ?? 0
    const cs = raw.caseStudy ?? 0
    q._ngn = { module: mod, case: cs, q: displayNumber }
    q.difficulty = "hard"
    if (raw.ngnMultiSelect && raw.correctKeys?.length) {
      q.ngnMultiSelect = true
      q.correctKeys = raw.correctKeys.map(normalizeLetter)
      q.correctLetter = q.correctKeys[0] ?? correctLetter
      q.ngnInteraction = "dragdrop"
    } else {
      q.ngnInteraction = "dragdrop"
    }
  }

  return q
}

/** Stable id for deduplication — prefers bank id when present. */
export function getBankQuestionId(q: QuizQuestion): string {
  const bankId = (q as QuizQuestion & { _bankId?: string })._bankId
  if (bankId) return bankId
  const ngn = q._ngn
  if (ngn && Number.isFinite(ngn.module)) {
    return `ngn-m${ngn.module}-c${ngn.case}-q${ngn.q}`
  }
  return `${q._topicIdx ?? 0}-${q.number}-${q.question.slice(0, 80)}`
}
