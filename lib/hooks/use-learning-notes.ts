"use client"

import { useEffect, useRef, useState } from "react"
import { useUser } from "@/lib/hooks/useUser"
import type { StudentLearningNotes, TopicLearningNotes } from "@/lib/types/learning-notes"
import { studentLearningNotes as fallbackNotes } from "@/lib/learning-notes"

function toTopicNote(raw: StudentLearningNotes): TopicLearningNotes {
  return {
    ...raw,
    topicId: "default",
    topicLabel: raw.title || "Learning notes",
  }
}

export interface UseLearningNotesResult {
  /** All notes (one for legacy single-note, multiple when manifest is used). */
  notesList: TopicLearningNotes[]
  /** First note; use for backward compat or when only one note. */
  notes: TopicLearningNotes
  loading: boolean
  error: string | null
  fromFallback: boolean
}

const defaultList: TopicLearningNotes[] = [toTopicNote(fallbackNotes)]

/**
 * Fetches student learning notes from /api/learning-notes.
 * Multi-topic: API returns { notes: TopicLearningNotes[] }.
 * Legacy: API returns a single StudentLearningNotes object; normalized to a one-element list.
 */
export function useLearningNotes(courseId?: number | null): UseLearningNotesResult {
  const [notesList, setNotesList] = useState<TopicLearningNotes[]>(defaultList)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [fromFallback, setFromFallback] = useState(false)
  const { getAccessToken } = useUser()
  const getAccessTokenRef = useRef(getAccessToken)
  getAccessTokenRef.current = getAccessToken

  useEffect(() => {
    setLoading(true)
    setError(null)

    const url = courseId != null ? `/api/learning-notes?courseId=${courseId}` : "/api/learning-notes"
    const doFetch = async () => {
      const headers: Record<string, string> = {}
      if (courseId != null) {
        const token = await getAccessTokenRef.current()
        if (token) headers["Authorization"] = `Bearer ${token}`
      }
      return fetch(url, { headers: Object.keys(headers).length ? headers : undefined })
    }
    doFetch()
      .then((res) => {
        if (!res.ok) throw new Error("Could not load learning notes")
        return res.json()
      })
      .then((data: { notes?: TopicLearningNotes[] } | StudentLearningNotes) => {
        if (data && "notes" in data && Array.isArray(data.notes) && data.notes.length > 0) {
          setNotesList(data.notes)
          setFromFallback(false)
          setError(null)
          return
        }
        const single = data as StudentLearningNotes
        if (single?.title && Array.isArray(single?.sections) && single.sections.length > 0) {
          setNotesList([toTopicNote(single)])
          setFromFallback(false)
          setError(null)
          return
        }
        // Empty notes payload — keep UI usable with bundled fallback, surface a soft warning.
        setNotesList(defaultList)
        setFromFallback(true)
        setError("Learning notes are not available for this unit yet.")
      })
      .catch(() => {
        setError("Could not load learning notes from server")
        setNotesList(defaultList)
        setFromFallback(true)
      })
      .finally(() => setLoading(false))
  }, [courseId])

  return {
    notesList,
    notes: notesList[0] ?? defaultList[0],
    loading,
    error,
    fromFallback,
  }
}
