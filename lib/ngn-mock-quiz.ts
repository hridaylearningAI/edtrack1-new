/**
 * Convert NGN module JSON (case studies) into QuizQuestion items for the NCLEX mock test.
 * - Single-select (4× A–D): included with drag/drop interaction in the mock UI.
 * - Multi-select (SATA, 4–5 options A–E): included with drag/drop + select-all-that-apply; difficulty hard.
 */
import type { QuizOption, QuizOptionLetter, QuizQuestion } from "./types/quiz"

export type NgnQuestionJson = {
  questionNumber: number
  questionTitle: string
  prompt: string
  options: Record<string, string>
  correctKeys: string[]
  answerType: "single" | "multi"
  rationale: string
}

export type NgnCaseStudyJson = {
  caseStudyNumber: number
  caseStudyTitle: string
  narrative: string
  questions: NgnQuestionJson[]
}

export type NgnModuleJson = {
  moduleTitle: string
  moduleNumber: number
  caseStudies: NgnCaseStudyJson[]
}

const LETTERS_4: readonly QuizOptionLetter[] = ["A", "B", "C", "D"]
const LETTERS_5: readonly QuizOptionLetter[] = ["A", "B", "C", "D", "E"]

function isLetterKey(k: string): k is QuizOptionLetter {
  return k === "A" || k === "B" || k === "C" || k === "D" || k === "E"
}

export function ngnQuestionToMockQuizQuestion(
  nq: NgnQuestionJson,
  moduleNum: number,
  caseNum: number,
  caseTitle: string,
  caseNarrative: string
): QuizQuestion | null {
  if (nq.answerType === "multi")
    return ngnMultiToMockQuizQuestion(nq, moduleNum, caseNum, caseTitle, caseNarrative)
  if (nq.answerType !== "single" || nq.correctKeys.length !== 1) return null
  const letters = Object.keys(nq.options)
    .map((k) => k.trim().toUpperCase())
    .filter(isLetterKey)
  if (letters.length !== 4) return null
  const sorted = [...new Set(letters)].sort().join("")
  if (sorted !== "ABCD") return null
  const correct = String(nq.correctKeys[0]).toUpperCase()
  if (!isLetterKey(correct) || correct === "E") return null

  const options: QuizOption[] = LETTERS_4.map((letter) => ({
    letter,
    text: nq.options[letter] ?? nq.options[letter.toLowerCase()] ?? "",
  }))

  return {
    number: nq.questionNumber,
    question: `[NGN · Case ${caseNum}] ${nq.questionTitle}\n\n${nq.prompt}`,
    options,
    correctLetter: correct,
    rationale: nq.rationale,
    difficulty: "hard",
    _ngn: { module: moduleNum, case: caseNum, q: nq.questionNumber },
    ngnCaseStudy: { title: caseTitle, narrative: caseNarrative },
    ngnInteraction: "dragdrop",
  }
}

function ngnMultiToMockQuizQuestion(
  nq: NgnQuestionJson,
  moduleNum: number,
  caseNum: number,
  caseTitle: string,
  caseNarrative: string
): QuizQuestion | null {
  const letters = Object.keys(nq.options)
    .map((k) => k.trim().toUpperCase())
    .filter(isLetterKey)
  const uniq = [...new Set(letters)].sort()
  if (uniq.length < 4 || uniq.length > 5) return null
  if (uniq.join("") !== (uniq.length === 5 ? "ABCDE" : "ABCD")) return null

  const correctKeys = nq.correctKeys
    .map((k) => String(k).trim().toUpperCase())
    .filter(isLetterKey) as QuizOptionLetter[]
  if (correctKeys.length < 2) return null
  if (!correctKeys.every((k) => uniq.includes(k))) return null

  const letterList = (uniq.length === 5 ? LETTERS_5 : LETTERS_4) as QuizOptionLetter[]
  const options: QuizOption[] = letterList
    .filter((L) => uniq.includes(L))
    .map((letter) => ({
      letter,
      text: nq.options[letter] ?? nq.options[letter.toLowerCase()] ?? "",
    }))

  const firstCorrect = correctKeys[0] ?? "A"

  return {
    number: nq.questionNumber,
    question: `[NGN · Case ${caseNum}] ${nq.questionTitle}\n\n${nq.prompt}`,
    options,
    correctLetter: firstCorrect,
    rationale: nq.rationale,
    difficulty: "hard",
    _ngn: { module: moduleNum, case: caseNum, q: nq.questionNumber },
    ngnCaseStudy: { title: caseTitle, narrative: caseNarrative },
    ngnInteraction: "dragdrop",
    ngnMultiSelect: true,
    correctKeys: [...correctKeys].sort() as QuizOptionLetter[],
  }
}

export function ngnModuleToMockQuizQuestions(mod: NgnModuleJson, moduleNum: number): QuizQuestion[] {
  const out: QuizQuestion[] = []
  for (const cs of mod.caseStudies ?? []) {
    for (const nq of cs.questions ?? []) {
      const q = ngnQuestionToMockQuizQuestion(
        nq,
        moduleNum,
        cs.caseStudyNumber,
        cs.caseStudyTitle,
        cs.narrative ?? ""
      )
      if (q) out.push(q)
    }
  }
  return out
}

export async function fetchNgnMockQuizQuestions(courseId: number, moduleCount: number): Promise<QuizQuestion[]> {
  const results = await Promise.all(
    Array.from({ length: moduleCount }, (_, i) => {
      const m = i + 1
      return fetch(`/api/ngn-module?courseId=${courseId}&module=${m}`, { cache: "no-store" })
        .then((r) => (r.ok ? (r.json() as Promise<NgnModuleJson>) : null))
        .catch(() => null)
    })
  )
  const all: QuizQuestion[] = []
  for (let i = 0; i < results.length; i++) {
    const data = results[i]
    if (!data?.caseStudies?.length) continue
    all.push(...ngnModuleToMockQuizQuestions(data, i + 1))
  }
  return all
}
