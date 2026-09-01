"use client"

import { useEffect, useRef, useState } from "react"
import {
  NCLEX_BACKGROUND_FILENAMES,
  nclexBackgroundUrl,
} from "@/lib/nclex-background-assets"

const STORAGE_KEY = "nclex-course-bg-session-v1"

type SessionState = {
  /** Shuffled indices into NCLEX_BACKGROUND_FILENAMES — no repeats until deck is exhausted */
  deck: number[]
  /** Index into `deck` for the image currently shown */
  cursor: number
}

function shuffleIndices(n: number): number[] {
  const idx = Array.from({ length: n }, (_, i) => i)
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[idx[i], idx[j]] = [idx[j], idx[i]]
  }
  return idx
}

function parseState(raw: string | null, n: number): SessionState | null {
  if (!raw) return null
  try {
    const o = JSON.parse(raw) as { deck?: unknown; cursor?: unknown }
    if (!Array.isArray(o.deck) || typeof o.cursor !== "number") return null
    const deck = o.deck.filter((x): x is number => typeof x === "number" && x >= 0 && x < n)
    if (deck.length !== n || new Set(deck).size !== n) return null
    if (o.cursor < 0 || o.cursor >= n) return null
    return { deck, cursor: o.cursor }
  } catch {
    return null
  }
}

function readState(n: number): SessionState {
  if (typeof window === "undefined") {
    return { deck: shuffleIndices(n), cursor: 0 }
  }
  const parsed = parseState(sessionStorage.getItem(STORAGE_KEY), n)
  if (parsed) return parsed
  const next = { deck: shuffleIndices(n), cursor: 0 }
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  return next
}

function writeState(s: SessionState): void {
  if (typeof window === "undefined") return
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(s))
}

function urlForState(s: SessionState): string {
  const idx = s.deck[s.cursor] ?? 0
  const name = NCLEX_BACKGROUND_FILENAMES[idx] ?? NCLEX_BACKGROUND_FILENAMES[0]
  return nclexBackgroundUrl(name)
}

function advanceState(prev: SessionState, n: number): SessionState {
  let cursor = prev.cursor + 1
  let deck = prev.deck
  if (cursor >= deck.length) {
    deck = shuffleIndices(n)
    cursor = 0
  }
  return { deck, cursor }
}

/**
 * NCLEX course shell: random photo backgrounds from `public/background/NCLEX`, no image
 * repeats until every image has been shown once in the session; then the deck reshuffles.
 * Advances when `pageId` changes (navigation between sections).
 */
export function useNclexSessionBackground(enabled: boolean, pageId: string): string | null {
  const n = NCLEX_BACKGROUND_FILENAMES.length
  const [url, setUrl] = useState<string | null>(null)
  const prevPageRef = useRef<string | null>(null)

  useEffect(() => {
    if (!enabled || n === 0) {
      setUrl(null)
      return
    }

    const state = readState(n)
    if (prevPageRef.current === null) {
      prevPageRef.current = pageId
      setUrl(urlForState(state))
      return
    }

    if (prevPageRef.current !== pageId) {
      prevPageRef.current = pageId
      const next = advanceState(state, n)
      writeState(next)
      setUrl(urlForState(next))
    }
  }, [enabled, pageId, n])

  return enabled ? url : null
}
