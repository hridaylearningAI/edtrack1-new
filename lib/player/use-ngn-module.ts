"use client"

import { useEffect, useState } from "react"

export type NgnQuestion = {
  questionNumber: number
  questionTitle: string
  prompt: string
  options: Record<string, string>
  correctKeys: string[]
  answerType: "single" | "multi"
  rationale: string
}

export type NgnCaseStudy = {
  caseStudyNumber: number
  caseStudyTitle: string
  narrative: string
  questions: NgnQuestion[]
}

export type NgnModule = {
  moduleTitle: string
  moduleNumber: number
  caseStudies: NgnCaseStudy[]
}

/** Loads one NGN module's case studies. Same endpoint the legacy learn page uses. */
export function useNgnModule(courseId: number | null, moduleNumber: number, enabled: boolean) {
  const [data, setData] = useState<NgnModule | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled || courseId == null || Number.isNaN(courseId)) {
      setData(null)
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    fetch(`/api/ngn-module?courseId=${courseId}&module=${moduleNumber}`, { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load NGN module (${res.status})`)
        return res.json() as Promise<NgnModule>
      })
      .then((json) => {
        if (!cancelled) setData(json)
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
  }, [courseId, moduleNumber, enabled])

  return { data, loading, error }
}
