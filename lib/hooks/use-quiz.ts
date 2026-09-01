"use client"

import { useEffect, useRef, useState } from "react"
import { useUser } from "@/lib/hooks/useUser"
import type { ParsedQuiz, QuizQuestion } from "@/lib/types/quiz"
import { flattenQuizQuestions } from "@/lib/types/quiz"
import { parsedQuiz as fallbackQuiz, quizQuestions as fallbackQuizQuestions } from "@/lib/quiz-data"

export interface UseQuizResult {
  quiz: ParsedQuiz
  quizQuestions: QuizQuestion[]
  loading: boolean
  error: string | null
  fromFallback: boolean
}

/**
 * Fetches quiz from /api/quiz (which loads from S3/CDN per course content_folder
 * and falls back to local data/quiz-critical-thinking.json). When courseId is
 * provided, uses that course's content_folder to build the URL.
 * Uses static quiz as initial/fallback so UI never blocks on fetch.
 * Pass enabled=false to skip the network call until a quiz page is opened.
 */
export function useQuiz(courseId?: number | null, enabled = true): UseQuizResult {
  const [quiz, setQuiz] = useState<ParsedQuiz>(fallbackQuiz)
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>(fallbackQuizQuestions)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fromFallback, setFromFallback] = useState(false)
  const { getAccessToken } = useUser()
  const getAccessTokenRef = useRef(getAccessToken)
  getAccessTokenRef.current = getAccessToken

  useEffect(() => {
    if (!enabled) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    const url = courseId != null ? `/api/quiz?courseId=${courseId}` : "/api/quiz"
    const doFetch = async () => {
      const headers: Record<string, string> = {}
      if (courseId != null) {
        const token = await getAccessTokenRef.current()
        if (token) headers["Authorization"] = `Bearer ${token}`
      }
      return fetch(url, { headers: Object.keys(headers).length ? headers : undefined })
    }
    doFetch()
      .then(async (res) => {
        const text = await res.text()
        if (!res.ok) throw new Error(`Quiz API ${res.status}`)
        if (text.trim().startsWith('<')) throw new Error('Received HTML instead of JSON — check network or try logging in again')
        return JSON.parse(text) as unknown
      })
      .then((data: unknown) => {
        const obj = data as Record<string, unknown>
        if (obj?.error != null) {
          setError(typeof obj.error === "string" ? obj.error : "Quiz not found")
          setFromFallback(true)
          return
        }
        if (obj?.title != null && Array.isArray(obj?.topics)) {
          const quiz = data as ParsedQuiz
          setQuiz(quiz)
          setQuizQuestions(flattenQuizQuestions(quiz))
          setError(null)
          setFromFallback(false)
        }
      })
      .catch(() => {
        setError("Could not load quiz from server")
        setQuiz(fallbackQuiz)
        setQuizQuestions(fallbackQuizQuestions)
        setFromFallback(true)
      })
      .finally(() => setLoading(false))
  }, [courseId, enabled])

  return { quiz, quizQuestions, loading, error, fromFallback }
}
