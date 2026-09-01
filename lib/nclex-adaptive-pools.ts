import { buildNclexPools, type NclexDifficulty } from "@/lib/quiz-data"
import type { QuizQuestion } from "@/lib/types/quiz"
import {
  bankQuestionToQuizQuestion,
  loadAllGnpsBankQuestions,
  loadNclexPoolQuestions,
  loadNgnPoolQuestions,
  type BankQuestion,
} from "@/lib/nclex-mock-bank"

let cachedPools: Record<NclexDifficulty, QuizQuestion[]> | null = null

function convertBankToQuizQuestions(bank: BankQuestion[]): QuizQuestion[] {
  return bank.map((raw, idx) => bankQuestionToQuizQuestion(raw, idx + 1))
}

/**
 * Build adaptive mock pools from the unified bank (~4,500 Q):
 * GNPS programs (all levels) + NCLEX topic pool + NGN upgrade pool.
 */
export function buildNclexPoolsFromBank(): Record<NclexDifficulty, QuizQuestion[]> {
  if (cachedPools) return cachedPools

  const gnps = convertBankToQuizQuestions(loadAllGnpsBankQuestions())
  const nclex = convertBankToQuizQuestions(loadNclexPoolQuestions())
  const ngn = convertBankToQuizQuestions(loadNgnPoolQuestions())

  cachedPools = buildNclexPools([...gnps, ...nclex, ...ngn])
  return cachedPools
}

/** Pool counts for diagnostics / API metadata. */
export function getNclexMockPoolStats(): {
  gnps: number
  nclex: number
  ngn: number
  easy: number
  moderate: number
  hard: number
} {
  const pools = buildNclexPoolsFromBank()
  return {
    gnps: loadAllGnpsBankQuestions().length,
    nclex: loadNclexPoolQuestions().length,
    ngn: loadNgnPoolQuestions().length,
    easy: pools.easy.length,
    moderate: pools.moderate.length,
    hard: pools.hard.length,
  }
}
