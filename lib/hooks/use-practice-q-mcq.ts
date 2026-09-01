"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useUser } from "@/lib/hooks/useUser"
import { LOCAL_PRACTICE_Q_MCQ_BANK } from "@/lib/practice-q-mcq-local"
import {
  getPracticeQMcqQuestionsForPage,
  normalizePracticeQMcqBank,
  type PracticeQMcqBank,
} from "@/lib/types/practice-q-mcq"
import type { QuizQuestion } from "@/lib/types/quiz"

export interface UsePracticeQMcqResult {
  bank: PracticeQMcqBank | null
  loading: boolean
  error: string | null
  getQuestionsForPage: (pageId: string, folderName?: string | null) => QuizQuestion[]
}

/**
 * Fetches exam-only Practice Q MCQ bank.
 * Seeds immediately from the bundled extracted JSON so already-processed folders work
 * even before / while the API request runs.
 */
export function usePracticeQMcq(
  courseId?: number | null,
  contentFolder?: string | null,
  enabled = true
): UsePracticeQMcqResult {
  const [bank, setBank] = useState<PracticeQMcqBank | null>(
    enabled ? LOCAL_PRACTICE_Q_MCQ_BANK : null
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { getAccessToken } = useUser()
  const getAccessTokenRef = useRef(getAccessToken)
  getAccessTokenRef.current = getAccessToken

  useEffect(() => {
    if (!enabled) {
      setBank(null)
      setLoading(false)
      setError(null)
      return
    }

    setBank(LOCAL_PRACTICE_Q_MCQ_BANK)

    if (!contentFolder?.trim() && (courseId == null || courseId <= 0)) {
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    const params =
      courseId != null
        ? `courseId=${courseId}`
        : `contentFolder=${encodeURIComponent(contentFolder!)}`

    const doFetch = async () => {
      const headers: Record<string, string> = {}
      if (courseId != null) {
        const token = await getAccessTokenRef.current()
        if (token) headers["Authorization"] = `Bearer ${token}`
      }
      return fetch(`/api/practice-q-mcq?${params}`, {
        headers: Object.keys(headers).length ? headers : undefined,
      })
    }

    doFetch()
      .then(async (res) => {
        const text = await res.text()
        if (!res.ok) throw new Error(`Practice Q MCQ API ${res.status}`)
        if (text.trim().startsWith("<")) {
          throw new Error("Received HTML instead of JSON")
        }
        return JSON.parse(text) as unknown
      })
      .then((data) => {
        if (cancelled) return
        const normalized = normalizePracticeQMcqBank(data)
        if (normalized) {
          setBank(normalized)
          setError(null)
        }
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : "Could not load Practice Q MCQs")
        if (!LOCAL_PRACTICE_Q_MCQ_BANK) setBank(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [courseId, contentFolder, enabled])

  const getQuestionsForPage = useMemo(() => {
    return (pageId: string, folderName?: string | null) =>
      getPracticeQMcqQuestionsForPage(bank, pageId, folderName)
  }, [bank])

  return { bank, loading, error, getQuestionsForPage }
}
