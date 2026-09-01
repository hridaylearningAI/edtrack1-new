"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import StudentLayout from "@/components/student/student-layout"
import { ChevronLeft, ChevronRight, Brain, GripVertical, RotateCcw } from "lucide-react"
import { useCourseContentFolder } from "@/lib/hooks/use-course-content-folder"

const MODULES = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const

type NgnQuestion = {
  questionNumber: number
  questionTitle: string
  prompt: string
  options: Record<string, string>
  correctKeys: string[]
  answerType: "single" | "multi"
  rationale: string
}

type NgnCaseStudy = {
  caseStudyNumber: number
  caseStudyTitle: string
  narrative: string
  questions: NgnQuestion[]
}

type NgnModule = {
  moduleTitle: string
  moduleNumber: number
  caseStudies: NgnCaseStudy[]
}

function useNgnModuleData(courseIdForApi: number, moduleNumber: number) {
  const [data, setData] = useState<NgnModule | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetch(`/api/ngn-module?courseId=${courseIdForApi}&module=${moduleNumber}`, { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load NGN module (${res.status})`)
        return res.json() as Promise<NgnModule>
      })
      .then((json) => {
        if (cancelled) return
        setData(json)
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setData(null)
        setError(e instanceof Error ? e.message : "Failed to load NGN module")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [courseIdForApi, moduleNumber])

  return { data, loading, error }
}

export default function NclexNgnPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const courseId = typeof params?.courseId === "string" ? parseInt(params.courseId, 10) : null
  const apiCourseId = courseId ?? 0
  const initialModuleFromQuery = (() => {
    const raw = searchParams.get("module")
    const n = raw ? parseInt(raw, 10) : 1
    return Number.isFinite(n) && n >= 1 ? n : 1
  })()
  const [moduleNumber, setModuleNumber] = useState<number>(initialModuleFromQuery)
  const [caseIdx, setCaseIdx] = useState(0)
  const [started, setStarted] = useState(false)
  const [questionIdx, setQuestionIdx] = useState(0)
  const [selected, setSelected] = useState<string[]>([])
  const [checked, setChecked] = useState(false)

  useCourseContentFolder(courseId) // keep hook warm for consistency with other pages
  const { data, loading, error } = useNgnModuleData(apiCourseId, moduleNumber)

  useEffect(() => {
    const raw = searchParams.get("module")
    const n = raw ? parseInt(raw, 10) : 1
    if (!Number.isFinite(n) || n < 1) return
    setModuleNumber(n)
  }, [searchParams])

  const currentCase = data?.caseStudies?.[caseIdx] ?? null
  const currentQuestion = currentCase?.questions?.[questionIdx] ?? null
  const optionEntries = currentQuestion ? Object.entries(currentQuestion.options) : []

  const selectedSet = new Set(selected)
  const correctSet = new Set(currentQuestion?.correctKeys ?? [])
  const isCorrect =
    currentQuestion != null &&
    checked &&
    selectedSet.size === correctSet.size &&
    [...selectedSet].every((k) => correctSet.has(k))

  const resetCaseFlow = () => {
    setStarted(false)
    setQuestionIdx(0)
    setSelected([])
    setChecked(false)
  }

  const toggleChoice = (key: string) => {
    if (!currentQuestion || checked) return
    setSelected((prev) => {
      const has = prev.includes(key)
      if (currentQuestion.answerType === "single") {
        return has ? [] : [key]
      }
      if (has) return prev.filter((k) => k !== key)
      return [...prev, key]
    })
  }

  const onDropToSelected = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    if (checked) return
    const key = e.dataTransfer.getData("text/ngn-option-key")
    if (!key) return
    toggleChoice(key)
  }

  return (
    <StudentLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <Link
          href={`/student/course/${courseId}`}
          className="inline-flex items-center gap-2 text-sm font-medium text-brand-blue hover:underline mb-6"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to NCLEX course
        </Link>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
            <Brain className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">NGN Case Studies</h1>
            <p className="text-slate-600 dark:text-slate-400 text-sm mt-0.5">
              Case first, then NGN-style questions with drag/drop + click fallback
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          {MODULES.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => {
                setModuleNumber(n)
                setCaseIdx(0)
                resetCaseFlow()
              }}
              className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                moduleNumber === n
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-300"
              }`}
            >
              Module {n}
            </button>
          ))}
        </div>

        {loading && (
          <p className="text-sm text-slate-500 dark:text-slate-400">Loading NGN module data...</p>
        )}
        {!loading && error && (
          <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>
        )}
        {!loading && !error && data == null && (
          <p className="text-sm text-slate-500 dark:text-slate-400">No module data found.</p>
        )}

        {data && currentCase && (
          <>
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm text-slate-500 dark:text-slate-400">
                {data.moduleTitle} · Case {caseIdx + 1} of {data.caseStudies.length}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (caseIdx <= 0) return
                    setCaseIdx((i) => Math.max(0, i - 1))
                    resetCaseFlow()
                  }}
                  disabled={caseIdx <= 0}
                  className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (caseIdx >= data.caseStudies.length - 1) return
                    setCaseIdx((i) => Math.min(data.caseStudies.length - 1, i + 1))
                    resetCaseFlow()
                  }}
                  disabled={caseIdx >= data.caseStudies.length - 1}
                  className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm mb-6">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">
                Case Study {currentCase.caseStudyNumber}: {currentCase.caseStudyTitle}
              </h2>
              <div className="space-y-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300 whitespace-pre-line">
                {currentCase.narrative}
              </div>
              <div className="mt-5">
                <button
                  type="button"
                  onClick={() => {
                    setStarted(true)
                    setQuestionIdx(0)
                    setSelected([])
                    setChecked(false)
                  }}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium"
                >
                  Start Questions
                </button>
              </div>
            </section>

            {started && currentQuestion && (
              <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                    Question {currentQuestion.questionNumber}: {currentQuestion.questionTitle}
                  </h3>
                  <span className="text-xs px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    {currentQuestion.answerType === "multi" ? "Select multiple" : "Select one"}
                  </span>
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-300 mb-4">{currentQuestion.prompt}</p>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Options (drag or click)
                    </h4>
                    {optionEntries.map(([key, value]) => (
                      <button
                        key={key}
                        type="button"
                        draggable={!checked}
                        onDragStart={(e) => {
                          e.dataTransfer.setData("text/ngn-option-key", key)
                        }}
                        onClick={() => toggleChoice(key)}
                        disabled={checked}
                        className={`w-full text-left p-3 rounded-lg border transition-colors flex gap-3 ${
                          selected.includes(key)
                            ? "border-indigo-400 bg-indigo-50 dark:bg-indigo-950/20"
                            : "border-slate-200 dark:border-slate-700 hover:border-indigo-300"
                        } ${checked ? "opacity-70 cursor-not-allowed" : ""}`}
                      >
                        <GripVertical className="h-4 w-4 mt-0.5 text-slate-400 shrink-0" />
                        <div className="text-sm text-slate-700 dark:text-slate-300">
                          <span className="font-semibold">{key}.</span> {value}
                        </div>
                      </button>
                    ))}
                  </div>

                  <div>
                    <h4 className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">
                      Selected answers
                    </h4>
                    <div
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={checked ? undefined : onDropToSelected}
                      className="min-h-[180px] rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-700 p-3 space-y-2 bg-slate-50/70 dark:bg-slate-900/30"
                    >
                      {selected.length === 0 ? (
                        <p className="text-sm text-slate-400">Drop choices here, or click options.</p>
                      ) : (
                        selected.map((key) => (
                          <button
                            key={key}
                            type="button"
                            onClick={() => toggleChoice(key)}
                            disabled={checked}
                            className={`w-full text-left p-2 rounded border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-900 text-sm ${
                              checked ? "opacity-70 cursor-not-allowed" : ""
                            }`}
                          >
                            <span className="font-semibold">{key}.</span> {currentQuestion.options[key]}
                          </button>
                        ))
                      )}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setChecked(true)}
                        disabled={selected.length === 0 || checked}
                        className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm disabled:opacity-50"
                      >
                        Check answer
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelected([])
                          setChecked(false)
                        }}
                        disabled={checked}
                        className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm disabled:opacity-50"
                      >
                        <span className="inline-flex items-center gap-1">
                          <RotateCcw className="h-3.5 w-3.5" />
                          Clear
                        </span>
                      </button>
                    </div>
                  </div>
                </div>

                {checked && (
                  <div className={`mt-4 rounded-lg p-4 border ${isCorrect ? "border-emerald-300 bg-emerald-50 dark:bg-emerald-900/20" : "border-amber-300 bg-amber-50 dark:bg-amber-900/20"}`}>
                    <p className={`text-sm font-medium ${isCorrect ? "text-emerald-700 dark:text-emerald-300" : "text-amber-700 dark:text-amber-300"}`}>
                      {isCorrect ? "Correct!" : "Not quite. Review the rationale below."}
                    </p>
                    <p className="text-xs mt-1 text-slate-600 dark:text-slate-300">
                      Correct answer{currentQuestion.correctKeys.length > 1 ? "s" : ""}: {currentQuestion.correctKeys.join(", ")}
                    </p>
                    <p className="text-sm mt-2 text-slate-700 dark:text-slate-300 whitespace-pre-line">{currentQuestion.rationale}</p>
                  </div>
                )}

                <div className="mt-5 flex justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      if (questionIdx <= 0) return
                      setQuestionIdx((i) => Math.max(0, i - 1))
                      setSelected([])
                      setChecked(false)
                    }}
                    disabled={questionIdx <= 0}
                    className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm disabled:opacity-50"
                  >
                    Previous question
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (questionIdx >= currentCase.questions.length - 1) return
                      setQuestionIdx((i) => Math.min(currentCase.questions.length - 1, i + 1))
                      setSelected([])
                      setChecked(false)
                    }}
                    disabled={questionIdx >= currentCase.questions.length - 1}
                    className="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm disabled:opacity-50"
                  >
                    Next question
                  </button>
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </StudentLayout>
  )
}

