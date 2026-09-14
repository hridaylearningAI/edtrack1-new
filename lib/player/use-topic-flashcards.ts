"use client"

import { useEffect, useState } from "react"

export type TopicFlashcard = { question: string; answer: string }

/** Matches the legacy learn page: a shuffled set of 10 drawn from the topic's deck. */
export const FLASHCARDS_PER_SET = 10

function shuffled<T>(items: T[]): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

/** Loads a topic's flashcard deck from the same endpoint the legacy learn page uses. */
export function useTopicFlashcards(courseId: number | null, topicFolder: string | null, enabled: boolean) {
  const [cards, setCards] = useState<TopicFlashcard[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!enabled || courseId == null || !topicFolder) {
      setCards([])
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    fetch(`/api/flashcards?courseId=${courseId}&topicFolder=${encodeURIComponent(topicFolder)}`, {
      cache: "no-store",
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then((json: unknown) => {
        if (cancelled) return
        const deck = Array.isArray(json) ? json : ((json as { cards?: TopicFlashcard[] })?.cards ?? [])
        const pool = deck.filter((c): c is TopicFlashcard => Boolean(c?.question && c?.answer))
        setCards(pool.length <= FLASHCARDS_PER_SET ? shuffled(pool) : shuffled(pool).slice(0, FLASHCARDS_PER_SET))
      })
      .catch(() => {
        if (!cancelled) setCards([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [courseId, topicFolder, enabled])

  return { cards, loading }
}
