"use client"

import React, { useCallback, useEffect, useMemo, useState } from "react"
import {
  ArrowRight,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Lightbulb,
  Loader2,
  RefreshCw,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { useUser } from "@/lib/hooks/useUser"
import {
  FREE_TEST_PASS_PER_PROGRAM,
  FREE_TEST_QUESTIONS_PER_PROGRAM,
  FREE_TEST_TOTAL_QUESTIONS,
  GNPS_PROGRAM_META,
  type ProgramScoreRow,
} from "@/lib/nclex-free-test-meta"

const PORTFOLIO_PROGRAM_BASE = "https://edtec.online/programs"

type ApiOption = { letter: string; text: string }

type ApiQuestion = {
  number: number
  question: string
  options: ApiOption[]
  correctLetter: string
  rationale?: string
  difficulty?: string
  program?: number
  section?: number
  sectionLabel?: string
  programArea?: string
}

type FreeTestPayload = {
  title: string
  totalQuestions: number
  questions: ApiQuestion[]
  programs: typeof GNPS_PROGRAM_META
}

function buildProgramReport(
  questions: ApiQuestion[],
  answers: Record<number, string>
): ProgramScoreRow[] {
  return GNPS_PROGRAM_META.map((meta) => {
    const programQs = questions.filter((q) => q.program === meta.program)
    const correct = programQs.filter(
      (q) =>
        String(answers[q.number] ?? "").trim().toUpperCase() ===
        String(q.correctLetter).trim().toUpperCase()
    ).length
    return {
      ...meta,
      correct,
      total: programQs.length || FREE_TEST_QUESTIONS_PER_PROGRAM,
      passed: correct >= FREE_TEST_PASS_PER_PROGRAM,
    }
  })
}

function buildQuestionItems(questions: ApiQuestion[], answers: Record<number, string>) {
  return questions.map((qu) => ({
    questionNumber: qu.number,
    program: qu.program ?? null,
    section: qu.section ?? null,
    selectedLetter: answers[qu.number] ?? null,
    correctLetter: qu.correctLetter,
    correct:
      String(answers[qu.number] ?? "").trim().toUpperCase() ===
      String(qu.correctLetter).trim().toUpperCase(),
  }))
}

type SavedFreeAttempt = {
  correct_count: number
  total_questions: number
  program_breakdown: ProgramScoreRow[]
}

export function NclexFreeDiagnosticView({ onBack }: { onBack?: () => void }) {
  const { getAccessToken } = useUser()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [payload, setPayload] = useState<FreeTestPayload | null>(null)
  const [started, setStarted] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [completed, setCompleted] = useState(false)
  const [score, setScore] = useState(0)
  const [programReport, setProgramReport] = useState<ProgramScoreRow[]>([])
  const [sessionSeed, setSessionSeed] = useState(() => `sms-free-${Date.now()}`)
  const [progressLocked, setProgressLocked] = useState(false)
  const [savingProgress, setSavingProgress] = useState(false)

  const questions = payload?.questions ?? []
  const q = questions[currentIndex]
  const totalQuestions = questions.length
  const selectedAnswer = q ? answers[q.number] : undefined
  const hasAnswered = selectedAnswer != null && selectedAnswer.trim() !== ""
  const isCorrect =
    q && hasAnswered
      ? String(selectedAnswer).trim().toUpperCase() === String(q.correctLetter).trim().toUpperCase()
      : false

  const programMetaByNumber = useMemo(() => {
    const map = new Map<number, (typeof GNPS_PROGRAM_META)[number]>()
    for (const p of GNPS_PROGRAM_META) map.set(p.program, p)
    return map
  }, [])

  const loadQuiz = useCallback(async (seed: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/quiz/nclex-free?seed=${encodeURIComponent(seed)}`, { cache: "no-store" })
      if (!res.ok) throw new Error(`Failed to load diagnostic (${res.status})`)
      const data = (await res.json()) as FreeTestPayload
      setPayload(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load diagnostic")
    } finally {
      setLoading(false)
    }
  }, [])

  const loadSavedAttempt = useCallback(async () => {
    try {
      const token = await getAccessToken()
      if (!token) return

      const res = await fetch("/api/progress/nclex-free", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      })
      if (!res.ok) return

      const json = (await res.json()) as {
        success?: boolean
        data?: { attempt?: SavedFreeAttempt | null; locked?: boolean }
      }
      const attempt = json.data?.attempt
      if (!json.success || !attempt || !json.data?.locked) return

      const breakdown = Array.isArray(attempt.program_breakdown) ? attempt.program_breakdown : []
      setProgressLocked(true)
      setStarted(true)
      setCompleted(true)
      setScore(attempt.correct_count ?? 0)
      setProgramReport(breakdown)
    } catch (err) {
      console.warn("Could not load saved NCLEX free attempt:", err)
    }
  }, [getAccessToken])

  const saveAttempt = useCallback(
    async (
      questions: ApiQuestion[],
      nextAnswers: Record<number, string>,
      correct: number,
      report: ProgramScoreRow[],
      seed: string
    ) => {
      const token = await getAccessToken()
      if (!token) return

      setSavingProgress(true)
      try {
        const res = await fetch("/api/progress/nclex-free", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            seed,
            totalQuestions: FREE_TEST_TOTAL_QUESTIONS,
            correctCount: correct,
            programBreakdown: report,
            questionItems: buildQuestionItems(questions, nextAnswers),
          }),
        })

        const json = (await res.json().catch(() => ({}))) as {
          success?: boolean
          message?: string
          data?: { locked?: boolean }
        }

        if (res.status === 409 || json.data?.locked) {
          setProgressLocked(true)
          return
        }

        if (!res.ok || !json.success) {
          throw new Error(json.message || "Failed to save diagnostic results")
        }

        setProgressLocked(true)
      } catch (err) {
        console.error("Failed to save NCLEX free diagnostic:", err)
        toast.error(err instanceof Error ? err.message : "Could not save your diagnostic results")
      } finally {
        setSavingProgress(false)
      }
    },
    [getAccessToken]
  )

  useEffect(() => {
    void loadQuiz(sessionSeed)
  }, [sessionSeed, loadQuiz])

  useEffect(() => {
    void loadSavedAttempt()
  }, [loadSavedAttempt])

  const handleRetake = () => {
    if (progressLocked) {
      toast.message("You have already completed this free diagnostic.")
      return
    }
    const newSeed = `sms-free-${Date.now()}`
    setSessionSeed(newSeed)
    setCurrentIndex(0)
    setAnswers({})
    setCompleted(false)
    setScore(0)
    setProgramReport([])
    setStarted(true)
  }

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 min-h-[320px]">
        <Loader2 className="h-10 w-10 animate-spin text-brand-blue mb-3" />
        <p className="text-sm text-slate-600 dark:text-slate-400">Loading free diagnostic…</p>
      </div>
    )
  }

  if (error || !payload) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <p className="text-red-600 dark:text-red-400 mb-4">{error ?? "Diagnostic unavailable"}</p>
        <Button variant="outline" onClick={() => void loadQuiz(sessionSeed)}>
          Retry
        </Button>
      </div>
    )
  }

  if (!started) {
    return (
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-8">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="text-sm text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 mb-4 inline-flex items-center gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              Back to resources
            </button>
          )}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-brand-blue/15 flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-brand-blue" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">Free NCLEX diagnostic</h1>
              <p className="text-sm text-slate-500">{totalQuestions} questions · 10 GNPS programs</p>
            </div>
          </div>
          <p className="text-slate-600 dark:text-slate-300 mb-6">
            Sample two questions from each section across all 10 GNPS programs. Programs where you score below{" "}
            {FREE_TEST_PASS_PER_PROGRAM}/{FREE_TEST_QUESTIONS_PER_PROGRAM} are recommended for GNPS study.
          </p>
          {progressLocked ? (
            <p className="text-sm text-amber-700 dark:text-amber-300 mb-4">
              You have already completed this diagnostic. Your saved results are shown below.
            </p>
          ) : null}
          <Button
            onClick={() => (progressLocked ? setCompleted(true) : setStarted(true))}
            className="gap-2"
          >
            {progressLocked ? "View saved results" : "Start diagnostic"}
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    )
  }

  if (completed) {
    const percent = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0
    const strengths = programReport.filter((r) => r.passed)
    const gaps = programReport.filter((r) => !r.passed)

    return (
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">Diagnostic complete</h2>
            <p className="text-slate-600 dark:text-slate-300">
              {score}/{totalQuestions} correct ({percent}%) · {strengths.length} strengths · {gaps.length} to strengthen
            </p>
          </div>

          <div className="space-y-3">
            {programReport.map((row) => {
              const pct = row.total > 0 ? Math.round((row.correct / row.total) * 100) : 0
              return (
                <div
                  key={row.program}
                  className={`rounded-xl border p-4 ${
                    row.passed
                      ? "border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/20"
                      : "border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Program {row.program} · {row.courseCode}
                      </p>
                      <p className="font-semibold text-slate-900 dark:text-white">{row.title}</p>
                    </div>
                    <span className="text-sm font-bold">
                      {row.correct}/{row.total}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-white/70 dark:bg-slate-800 overflow-hidden mb-2">
                    <div
                      className={`h-full ${row.passed ? "bg-green-500" : "bg-amber-500"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  {row.passed ? (
                    <p className="text-sm text-green-800 dark:text-green-300">
                      Strong in {row.focusArea}.
                    </p>
                  ) : (
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm text-amber-900 dark:text-amber-200">Strengthen {row.title}</p>
                      <Button asChild size="sm" variant="outline">
                        <a href={`${PORTFOLIO_PROGRAM_BASE}/${row.slug}`} target="_blank" rel="noopener noreferrer">
                          View on EdTec
                        </a>
                      </Button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <div className="flex flex-wrap gap-3">
            {!progressLocked ? (
              <Button onClick={handleRetake} variant="outline" className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Retake
              </Button>
            ) : null}
            {onBack && (
              <Button variant="ghost" onClick={onBack}>
                Back to resources
              </Button>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (!q) return null

  const progress = totalQuestions > 0 ? ((currentIndex + 1) / totalQuestions) * 100 : 0
  const programMeta = q.program != null ? programMetaByNumber.get(q.program) : undefined

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6">
      <div className="max-w-3xl mx-auto rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between gap-3 mb-2">
            <span className="text-sm font-medium text-brand-blue">
              Question {currentIndex + 1} of {totalQuestions}
            </span>
            <span className="text-xs text-slate-500">{Math.round(progress)}%</span>
          </div>
          <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-brand-blue transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="p-5 sm:p-6">
          <div className="flex flex-wrap gap-2 mb-4">
            {q.program != null && (
              <span className="px-2 py-1 rounded-md text-xs font-medium bg-indigo-50 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-800">
                Program {q.program}
                {programMeta ? ` · ${programMeta.focusArea}` : ""}
              </span>
            )}
            {q.section != null && (
              <span className="px-2 py-1 rounded-md text-xs font-medium bg-brand-blue/10 text-brand-blue border border-brand-blue/20">
                Section {q.section}
                {q.sectionLabel ? ` · ${q.sectionLabel}` : ""}
              </span>
            )}
            {q.difficulty && (
              <span className="px-2 py-1 rounded-md text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                {q.difficulty}
              </span>
            )}
          </div>

          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">{q.question}</h3>

          <div className="space-y-2">
            {q.options.map((opt) => {
              const showCorrect = hasAnswered && opt.letter === q.correctLetter
              const showWrong = hasAnswered && selectedAnswer === opt.letter && !showCorrect
              return (
                <button
                  key={opt.letter}
                  type="button"
                  disabled={hasAnswered}
                  onClick={() => setAnswers((prev) => ({ ...prev, [q.number]: opt.letter }))}
                  className={`w-full text-left flex items-center gap-3 p-3 rounded-xl border-2 transition-colors ${
                    showCorrect
                      ? "border-green-500 bg-green-50 dark:bg-green-950/30"
                      : showWrong
                        ? "border-red-500 bg-red-50 dark:bg-red-950/30"
                        : selectedAnswer === opt.letter
                          ? "border-brand-blue bg-brand-blue/5"
                          : "border-slate-200 dark:border-slate-700 hover:border-slate-300"
                  }`}
                >
                  <span className="font-bold w-7 h-7 rounded-full border flex items-center justify-center shrink-0">
                    {showCorrect ? "✓" : showWrong ? "✗" : opt.letter}
                  </span>
                  <span className="text-sm">{opt.text}</span>
                </button>
              )
            })}
          </div>

          {hasAnswered && q.rationale && (
            <div className="mt-4 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
              <div className="flex items-center gap-2 mb-1">
                <Lightbulb className="h-4 w-4 text-amber-600" />
                <span className="text-sm font-semibold">Rationale</span>
              </div>
              <p className="text-sm text-slate-700 dark:text-slate-300">{q.rationale}</p>
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <Button
              disabled={!hasAnswered || savingProgress}
              onClick={() => {
                if (currentIndex < totalQuestions - 1) {
                  setCurrentIndex((i) => i + 1)
                  return
                }
                const correct = questions.filter(
                  (qu) =>
                    String(answers[qu.number] ?? "").trim().toUpperCase() ===
                    String(qu.correctLetter).trim().toUpperCase()
                ).length
                const report = buildProgramReport(questions, answers)
                setScore(correct)
                setProgramReport(report)
                setCompleted(true)
                void saveAttempt(questions, answers, correct, report, sessionSeed)
              }}
              className="gap-2"
            >
              {savingProgress ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : currentIndex < totalQuestions - 1 ? (
                "Next"
              ) : (
                "View results"
              )}
              {!savingProgress ? <ArrowRight className="h-4 w-4" /> : null}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
