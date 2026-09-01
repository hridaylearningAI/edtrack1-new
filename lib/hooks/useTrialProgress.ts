"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useUser } from "@/lib/hooks/useUser"

const SAVE_DEBOUNCE_MS = 400

export interface TrialProgressState {
  completedSectionIds: string[]
  loading: boolean
  error: string | null
  saving: boolean
}

export interface QuizAttemptResult {
  quizIdentifier: string
  scorePercent: number
  passed: boolean
  totalQuestions: number
  correctCount: number
  answersSnapshot?: unknown
}

export interface NclexMockSavePayload {
  marksEarned: number
  passingMarks?: number
  passed: boolean
  totalQuestions: number
  correctCount: number
  breakdownByModule: unknown
  questionItems: unknown
  proctoringTerminated?: boolean
  proctoringTerminateReason?: string | null
  proctoringSummary?: unknown
}

export function useTrialProgress(enrollmentId: number | null, courseId: number | null) {
  const { getAccessToken, isAuthenticated } = useUser()
  const [completedSectionIds, setCompletedSectionIds] = useState<string[]>([])
  const [lastPageId, setLastPageId] = useState<string | null>(null)
  const [lastPosition, setLastPosition] = useState<number | null>(null)
  const [loading, setLoading] = useState(() => !!(enrollmentId && courseId))
  const [error, setError] = useState<string | null>(null)
  /** Ref-only — toggling React state here re-rendered the entire learn page on every debounced save. */
  const savingRef = useRef(false)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastPageTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastTokenRef = useRef<string | null>(null)
  const getAccessTokenRef = useRef(getAccessToken)
  getAccessTokenRef.current = getAccessToken
  const isAuthenticatedRef = useRef(isAuthenticated)
  isAuthenticatedRef.current = isAuthenticated

  const loadProgress = useCallback(async () => {
    if (!enrollmentId || !courseId || !isAuthenticatedRef.current) {
      setLoading(false)
      return
    }
    const token = await getAccessTokenRef.current()
    if (!token) {
      setLoading(false)
      return
    }
    lastTokenRef.current = token
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/progress/trial/sections?enrollmentId=${enrollmentId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (!res.ok) throw new Error("Failed to load progress")
      const json = await res.json()
      if (json.success && json.data) {
        if (json.data.completedSectionIds) setCompletedSectionIds(json.data.completedSectionIds)
        if (json.data.lastPageId != null) setLastPageId(json.data.lastPageId)
        if (json.data.lastPosition != null && typeof json.data.lastPosition === "number") setLastPosition(json.data.lastPosition)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load progress")
    } finally {
      setLoading(false)
    }
  }, [enrollmentId, courseId])

  useEffect(() => {
    if (!enrollmentId || !courseId) {
      setLoading(false)
      return
    }
    setLoading(true)
    void loadProgress()
  }, [enrollmentId, courseId, loadProgress])

  const saveCompletedSections = useCallback(
    async (
      sectionIds: string[],
      totalSections?: number,
      lastPageIdToSave?: string | null,
      lastPositionToSave?: number | null,
      completedRequiredCount?: number
    ) => {
      if (!enrollmentId || !courseId || !isAuthenticatedRef.current) return
      const token = await getAccessTokenRef.current()
      if (!token) return
      lastTokenRef.current = token
      savingRef.current = true
      setError(null)
      try {
        const body: Record<string, unknown> = {
          enrollmentId,
          courseId,
          completedSectionIds: sectionIds,
          totalSections: totalSections ?? undefined,
          lastPageId: lastPageIdToSave ?? undefined,
        }
        if (lastPositionToSave !== undefined && lastPositionToSave !== null) {
          body.lastPosition = lastPositionToSave
        }
        if (typeof completedRequiredCount === "number") {
          body.completedRequiredCount = completedRequiredCount
        }
        const res = await fetch("/api/progress/trial/sections", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        })
        if (!res.ok) throw new Error("Failed to save progress")
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to save progress")
      } finally {
        savingRef.current = false
      }
    },
    [enrollmentId, courseId]
  )

  const saveProgressDebounced = useCallback(
    (
      sectionIds: string[],
      totalSections?: number,
      lastPageIdToSave?: string | null,
      lastPositionToSave?: number | null,
      completedRequiredCount?: number
    ) => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
      saveTimeoutRef.current = setTimeout(() => {
        saveTimeoutRef.current = null
        saveCompletedSections(sectionIds, totalSections, lastPageIdToSave, lastPositionToSave, completedRequiredCount)
      }, SAVE_DEBOUNCE_MS)
    },
    [saveCompletedSections]
  )

  const saveProgressNow = useCallback(
    (
      sectionIds: string[],
      totalSections?: number,
      lastPageIdToSave?: string | null,
      lastPositionToSave?: number | null,
      options?: { useBeacon?: boolean; completedRequiredCount?: number }
    ) => {
      const completedRequiredCount = options?.completedRequiredCount
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
        saveTimeoutRef.current = null
      }
      if (lastPageTimeoutRef.current) {
        clearTimeout(lastPageTimeoutRef.current)
        lastPageTimeoutRef.current = null
      }
      if (options?.useBeacon && typeof navigator !== "undefined" && navigator.sendBeacon && lastTokenRef.current) {
        const body: Record<string, unknown> = {
          enrollmentId,
          courseId,
          completedSectionIds: sectionIds,
          totalSections: totalSections ?? undefined,
          lastPageId: lastPageIdToSave ?? undefined,
          token: lastTokenRef.current,
        }
        if (lastPositionToSave !== undefined && lastPositionToSave !== null) body.lastPosition = lastPositionToSave
        if (typeof completedRequiredCount === "number") body.completedRequiredCount = completedRequiredCount
        const blob = new Blob([JSON.stringify(body)], { type: "application/json" })
        navigator.sendBeacon("/api/progress/trial/sections", blob)
        return
      }
      saveCompletedSections(sectionIds, totalSections, lastPageIdToSave, lastPositionToSave, completedRequiredCount)
    },
    [enrollmentId, courseId, saveCompletedSections]
  )

  const saveLastPageDebounced = useCallback(
    (pageId: string, position?: number | null) => {
      if (!enrollmentId || !courseId || !isAuthenticatedRef.current) return
      if (lastPageTimeoutRef.current) clearTimeout(lastPageTimeoutRef.current)
      lastPageTimeoutRef.current = setTimeout(async () => {
        lastPageTimeoutRef.current = null
        const token = await getAccessTokenRef.current()
        if (!token) return
        try {
          const body: { enrollmentId: number; courseId: number; lastPageId: string; lastPosition?: number | null } = {
            enrollmentId,
            courseId,
            lastPageId: pageId,
          }
          if (position !== undefined) body.lastPosition = position
          await fetch("/api/progress/trial/sections", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
          })
        } catch (e) {
          console.error("Save last page:", e)
        }
      }, 400)
    },
    [enrollmentId, courseId]
  )

  const saveQuizAttempt = useCallback(
    async (result: QuizAttemptResult) => {
      if (!enrollmentId || !courseId || !isAuthenticated) return
      const token = await getAccessToken()
      if (!token) return
      try {
        const res = await fetch("/api/progress/trial/quiz", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            enrollmentId,
            courseId,
            quizIdentifier: result.quizIdentifier,
            scorePercent: result.scorePercent,
            passed: result.passed,
            totalQuestions: result.totalQuestions,
            correctCount: result.correctCount,
            answersSnapshot: result.answersSnapshot ?? undefined,
          }),
        })
        if (!res.ok) throw new Error("Failed to save quiz result")
      } catch (e) {
        console.error("Save quiz attempt:", e)
      }
    },
    [enrollmentId, courseId, isAuthenticated, getAccessToken]
  )

  const saveNclexMockAttempt = useCallback(
    async (payload: NclexMockSavePayload) => {
      if (!enrollmentId || !courseId || !isAuthenticated) return
      const token = await getAccessToken()
      if (!token) return
      try {
        const res = await fetch("/api/progress/nclex-mock", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            enrollmentId,
            courseId,
            marksEarned: payload.marksEarned,
            passingMarks: payload.passingMarks,
            passed: payload.passed,
            totalQuestions: payload.totalQuestions,
            correctCount: payload.correctCount,
            breakdownByModule: payload.breakdownByModule,
            questionItems: payload.questionItems,
            proctoringTerminated: payload.proctoringTerminated ?? false,
            proctoringTerminateReason: payload.proctoringTerminateReason ?? null,
            proctoringSummary: payload.proctoringSummary ?? {},
          }),
        })
        if (!res.ok) throw new Error("Failed to save NCLEX mock attempt")
      } catch (e) {
        console.error("Save NCLEX mock attempt:", e)
      }
    },
    [enrollmentId, courseId, isAuthenticated, getAccessToken]
  )

  const loadNclexMockAttempts = useCallback(async (): Promise<unknown[]> => {
    if (!enrollmentId || !courseId || !isAuthenticated) return []
    const token = await getAccessToken()
    if (!token) return []
    try {
      const res = await fetch(
        `/api/progress/nclex-mock?enrollmentId=${enrollmentId}&courseId=${courseId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (!res.ok) return []
      const json = await res.json()
      if (json.success && json.data?.attempts && Array.isArray(json.data.attempts)) {
        return json.data.attempts as unknown[]
      }
      return []
    } catch (e) {
      console.error("Load NCLEX mock attempts:", e)
      return []
    }
  }, [enrollmentId, courseId, isAuthenticated, getAccessToken])

  const loadQuizAttempts = useCallback(async (): Promise<
    {
      id: number
      quiz_identifier: string
      score_percent: number
      passed: boolean
      total_questions: number
      correct_count: number
      attempted_at: string
    }[]
  > => {
    if (!enrollmentId || !courseId || !isAuthenticated) return []
    const token = await getAccessToken()
    if (!token) return []
    try {
      const res = await fetch(
        `/api/progress/trial/quiz?enrollmentId=${enrollmentId}&courseId=${courseId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (!res.ok) return []
      const json = await res.json()
      if (json.success && json.data?.attempts && Array.isArray(json.data.attempts)) {
        return json.data.attempts as {
          id: number
          quiz_identifier: string
          score_percent: number
          passed: boolean
          total_questions: number
          correct_count: number
          attempted_at: string
        }[]
      }
      return []
    } catch (e) {
      console.error("Load quiz attempts:", e)
      return []
    }
  }, [enrollmentId, courseId, isAuthenticated, getAccessToken])

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
      if (lastPageTimeoutRef.current) clearTimeout(lastPageTimeoutRef.current)
    }
  }, [])

  return {
    completedSectionIds,
    setCompletedSectionIds,
    lastPageId,
    lastPosition,
    loadProgress,
    saveProgressDebounced,
    saveProgressNow,
    saveLastPageDebounced,
    saveQuizAttempt,
    saveNclexMockAttempt,
    loadNclexMockAttempts,
    loadQuizAttempts,
    loading,
    error,
    saving: savingRef.current,
  }
}
