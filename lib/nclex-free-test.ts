/**
 * Server-only free-test assembly (reads question bank from disk).
 * Client components must import constants from `nclex-free-test-meta.ts` only.
 */
import { shuffleArray } from "@/lib/quiz-data"
import type { QuizOptionLetter, QuizQuestion } from "@/lib/types/quiz"
import {
  bankQuestionToQuizQuestion,
  loadProgramBankQuestions,
  remapCorrectLetter,
  type BankQuestion,
} from "@/lib/nclex-mock-bank"
import {
  FREE_TEST_PASS_PER_PROGRAM,
  FREE_TEST_PER_SECTION,
  FREE_TEST_SECTIONS,
  GNPS_PROGRAM_META,
  type ProgramScoreRow,
} from "@/lib/nclex-free-test-meta"

export {
  FREE_TEST_TOTAL_QUESTIONS,
  FREE_TEST_QUESTIONS_PER_PROGRAM,
  FREE_TEST_PASS_PER_PROGRAM,
  FREE_TEST_SECTIONS,
  FREE_TEST_PER_SECTION,
  GNPS_PROGRAM_META,
  getGnpsProgramMeta,
  type GnpsProgramMeta,
  type ProgramScoreRow,
} from "@/lib/nclex-free-test-meta"

/** Deterministic seeded shuffle (Fisher–Yates with mulberry32). */
function seededShuffle<T>(items: T[], seed: number): T[] {
  const copy = [...items]
  let s = seed >>> 0
  const rand = () => {
    s += 0x6d2b79f5
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function hashSeed(input: string): number {
  let h = 2166136261
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function pickFromCell(pool: BankQuestion[], seed: string, count: number): BankQuestion[] {
  if (pool.length <= count) return seededShuffle(pool, hashSeed(seed))
  return seededShuffle(pool, hashSeed(seed)).slice(0, count)
}

export type FreeTestQuestion = QuizQuestion & {
  program: number
  section: number
  bankId: string
}

/**
 * Build 80-question diagnostic: 10 programs × 4 sections × 2 questions.
 * Samples across Level 1–3 GNPS bank (NGN Upgrade excluded from free test).
 */
export function buildFreeTestSequence(sessionSeed?: string): FreeTestQuestion[] {
  const seedBase = sessionSeed ?? `free-${Date.now()}`
  const sequence: FreeTestQuestion[] = []
  let displayNum = 0

  for (let program = 1; program <= 10; program++) {
    const programQs = loadProgramBankQuestions(program)
    for (let section = 1; section <= FREE_TEST_SECTIONS; section++) {
      const cellPool = programQs.filter((q) => q.section === section)
      const picked = pickFromCell(
        cellPool,
        `${seedBase}-p${program}-s${section}`,
        FREE_TEST_PER_SECTION
      )
      for (const raw of picked) {
        displayNum += 1
        const shuffledOpts = shuffleArray(raw.options)
        const remapped = shuffledOpts.map((o, i) => ({
          letter: (["A", "B", "C", "D", "E"] as QuizOptionLetter[])[i] ?? "A",
          text: o.text,
        }))
        const correctLetter = remapCorrectLetter(raw.correctLetter, raw.options, remapped)
        const base = bankQuestionToQuizQuestion(raw, displayNum)
        sequence.push({
          ...base,
          number: displayNum,
          options: remapped,
          correctLetter,
          program,
          section,
          bankId: raw.id,
        })
      }
    }
  }

  return sequence
}

export function scoreFreeTestByProgram(
  questions: FreeTestQuestion[],
  answers: Record<number, string>
): ProgramScoreRow[] {
  const rows: ProgramScoreRow[] = []

  for (const meta of GNPS_PROGRAM_META) {
    const programQs = questions.filter((q) => q.program === meta.program)
    let correct = 0
    for (const q of programQs) {
      const a = answers[q.number]
      if (
        a != null &&
        String(a).trim().toUpperCase() === String(q.correctLetter).trim().toUpperCase()
      ) {
        correct += 1
      }
    }
    const total = programQs.length
    rows.push({
      program: meta.program,
      courseCode: meta.courseCode,
      title: meta.title,
      slug: meta.slug,
      focusArea: meta.focusArea,
      correct,
      total,
      passed: correct >= FREE_TEST_PASS_PER_PROGRAM,
    })
  }

  return rows
}
