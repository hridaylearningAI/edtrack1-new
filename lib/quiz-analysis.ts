import type { QuizDifficulty, QuizQuestion } from "@/lib/types/quiz"

export type QuizLabelBucket = {
  key: string
  label: string
  correct: number
  total: number
  percent: number
  missedNumbers: number[]
}

export type QuizAnalysisResult = {
  correctCount: number
  totalQuestions: number
  scorePercent: number
  passed: boolean
  bySection: QuizLabelBucket[]
  byDifficulty: QuizLabelBucket[]
  missed: Array<{
    number: number
    question: string
    sectionLabel?: string
    programArea?: string
    difficulty?: QuizDifficulty
    userAnswer?: string
    correctLetter: string
  }>
  weakestSectionLabel: string | null
  weakestDifficulty: QuizDifficulty | null
}

const DIFFICULTY_ORDER: QuizDifficulty[] = ["easy", "moderate", "hard"]

function difficultyLabel(d: QuizDifficulty): string {
  switch (d) {
    case "easy":
      return "Simple"
    case "moderate":
      return "Moderate"
    case "hard":
      return "Difficult"
    default: {
      const _exhaustive: never = d
      void _exhaustive
      return "Simple"
    }
  }
}

function bucketPercent(correct: number, total: number): number {
  return total > 0 ? Math.round((correct / total) * 100) : 0
}

function toBuckets(
  groups: Map<string, { label: string; correct: number; total: number; missedNumbers: number[] }>
): QuizLabelBucket[] {
  return Array.from(groups.values())
    .map((g) => ({
      key: g.label,
      label: g.label,
      correct: g.correct,
      total: g.total,
      percent: bucketPercent(g.correct, g.total),
      missedNumbers: g.missedNumbers,
    }))
    .sort((a, b) => a.percent - b.percent || b.total - a.total)
}

/**
 * Build score analysis grouped by question-bank labels (section / difficulty).
 */
export function buildQuizAnalysis(
  questions: QuizQuestion[],
  answers: Record<number, string>,
  passingPercent: number,
  isCorrect: (q: QuizQuestion, answer: string | undefined) => boolean
): QuizAnalysisResult {
  const sectionGroups = new Map<
    string,
    { label: string; correct: number; total: number; missedNumbers: number[] }
  >()
  const difficultyGroups = new Map<
    string,
    { label: string; correct: number; total: number; missedNumbers: number[] }
  >()
  const missed: QuizAnalysisResult["missed"] = []

  let correctCount = 0
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i]
    const number = i + 1
    const answer = answers[number]
    const ok = isCorrect(q, answer)
    if (ok) correctCount += 1

    const sectionLabel =
      (q.sectionLabel && q.sectionLabel.trim()) ||
      (typeof q.section === "number" ? `Section ${q.section}` : "General")
    const sectionEntry = sectionGroups.get(sectionLabel) ?? {
      label: sectionLabel,
      correct: 0,
      total: 0,
      missedNumbers: [],
    }
    sectionEntry.total += 1
    if (ok) sectionEntry.correct += 1
    else sectionEntry.missedNumbers.push(number)
    sectionGroups.set(sectionLabel, sectionEntry)

    const diff = (q.difficulty ?? "easy") as QuizDifficulty
    const diffKey = difficultyLabel(diff)
    const diffEntry = difficultyGroups.get(diffKey) ?? {
      label: diffKey,
      correct: 0,
      total: 0,
      missedNumbers: [],
    }
    diffEntry.total += 1
    if (ok) diffEntry.correct += 1
    else diffEntry.missedNumbers.push(number)
    difficultyGroups.set(diffKey, diffEntry)

    if (!ok) {
      missed.push({
        number,
        question: q.question,
        sectionLabel: q.sectionLabel,
        programArea: q.programArea,
        difficulty: q.difficulty,
        userAnswer: answer,
        correctLetter: q.correctLetter,
      })
    }
  }

  const bySection = toBuckets(sectionGroups)
  const byDifficulty = DIFFICULTY_ORDER.map((d) => difficultyLabel(d))
    .map((label) => difficultyGroups.get(label))
    .filter((g): g is NonNullable<typeof g> => g != null)
    .map((g) => ({
      key: g.label,
      label: g.label,
      correct: g.correct,
      total: g.total,
      percent: bucketPercent(g.correct, g.total),
      missedNumbers: g.missedNumbers,
    }))

  const weakestSection =
    bySection.filter((b) => b.total > 0 && b.percent < 100).sort((a, b) => a.percent - b.percent)[0] ??
    null
  const weakestDiff =
    byDifficulty.filter((b) => b.total > 0 && b.percent < 100).sort((a, b) => a.percent - b.percent)[0] ??
    null

  const scorePercent = bucketPercent(correctCount, questions.length)
  return {
    correctCount,
    totalQuestions: questions.length,
    scorePercent,
    passed: scorePercent >= passingPercent,
    bySection,
    byDifficulty,
    missed,
    weakestSectionLabel: weakestSection?.label ?? null,
    weakestDifficulty: weakestDiff
      ? ((DIFFICULTY_ORDER.find((d) => difficultyLabel(d) === weakestDiff.label) ?? null) as QuizDifficulty | null)
      : null,
  }
}
