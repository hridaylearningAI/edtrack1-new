"use client"

import { useEffect, useState } from "react"
import { getSlideImageUrlByFolder } from "@/lib/content-url"

export interface PracticeQSegment {
  folder: string
  count: number
}

export interface UsePracticeQSegmentsResult {
  segments: PracticeQSegment[]
  totalSlides: number
  isDiscovering: boolean
}

const PRACTICE_Q_BASE = "Practice Q"

/**
 * Discovers all Practice Q subsections for a topic (Topic N.1, N.2, N.3, ...) by
 * probing for 1.png in each folder until one fails. For each existing folder,
 * discovers slide count. Returns segments so the UI can show all slides in sequence.
 */
export function usePracticeQSegments(
  topicIdx: number,
  contentFolder?: string | null
): UsePracticeQSegmentsResult {
  const [segments, setSegments] = useState<PracticeQSegment[]>([])
  const [totalSlides, setTotalSlides] = useState(0)
  const [isDiscovering, setIsDiscovering] = useState(true)

  useEffect(() => {
    const topicNum = topicIdx + 1
    let cancelled = false

    const tryLoadImage = (url: string): Promise<boolean> =>
      new Promise((resolve) => {
        if (!url || cancelled) {
          resolve(false)
          return
        }
        const img = new Image()
        img.onload = () => resolve(true)
        img.onerror = () => resolve(false)
        img.src = url
      })

    const discoverCount = async (folder: string): Promise<number> => {
      let count = 0
      for (let i = 0; ; i++) {
        if (cancelled) return count
        const url = getSlideImageUrlByFolder(folder, i, "png", contentFolder)
        const ok = await tryLoadImage(url)
        if (!ok) return count
        count = i + 1
      }
    }

    const run = async () => {
      setIsDiscovering(true)
      const result: PracticeQSegment[] = []

      for (let subNum = 1; ; subNum++) {
        if (cancelled) break
        const folder = `${PRACTICE_Q_BASE}/Topic ${topicNum}.${subNum}`
        const url = getSlideImageUrlByFolder(folder, 0, "png", contentFolder)
        const exists = await tryLoadImage(url)
        if (!exists) break

        const count = await discoverCount(folder)
        if (cancelled) break
        if (count > 0) result.push({ folder, count })
      }

      if (!cancelled) {
        setSegments(result)
        setTotalSlides(result.reduce((sum, s) => sum + s.count, 0))
      }
      if (!cancelled) setIsDiscovering(false)
    }

    run()
    return () => {
      cancelled = true
    }
  }, [topicIdx, contentFolder])

  return { segments, totalSlides, isDiscovering }
}

/**
 * Map a global slide index to (folder, localIndex) using segments.
 */
export function globalIndexToSegment(
  segments: PracticeQSegment[],
  globalIndex: number
): { folder: string; localIndex: number } | null {
  let remaining = globalIndex
  for (const seg of segments) {
    if (remaining < seg.count) return { folder: seg.folder, localIndex: remaining }
    remaining -= seg.count
  }
  return null
}

/**
 * Discover which Practice Q subsections exist per topic (e.g. Topic 1 → [1, 2, 3], Topic 2 → [1, 2]).
 * Used to build sidebar items and progression so each subsection (1.1, 1.2, ...) is shown separately.
 *
 * Prefer the practice-q.json / DB override path instead. CDN image probing is slow (especially when
 * missing objects return 403) — pass enabled=false when a courseId/manifest is available.
 */
export function useAllPracticeQSubsections(
  numTopics: number,
  contentFolder?: string | null,
  enabled = true
): { topicSubsections: number[][]; isDiscovering: boolean } {
  const [topicSubsections, setTopicSubsections] = useState<number[][]>(() =>
    Array.from({ length: Math.max(0, numTopics) }, () => [])
  )
  const [isDiscovering, setIsDiscovering] = useState(() => enabled && numTopics > 0)

  useEffect(() => {
    if (!enabled || numTopics <= 0) {
      setTopicSubsections(Array.from({ length: Math.max(0, numTopics) }, () => []))
      setIsDiscovering(false)
      return
    }

    let cancelled = false

    const tryLoadImage = (url: string): Promise<boolean> =>
      new Promise((resolve) => {
        if (!url || cancelled) {
          resolve(false)
          return
        }
        const img = new Image()
        img.onload = () => resolve(true)
        img.onerror = () => resolve(false)
        img.src = url
      })

    const discoverSubsectionsForTopic = async (topicIdx: number): Promise<number[]> => {
      const topicNum = topicIdx + 1
      const subs: number[] = []
      for (let subNum = 1; ; subNum++) {
        if (cancelled) return subs
        const folder = `${PRACTICE_Q_BASE}/Topic ${topicNum}.${subNum}`
        const url = getSlideImageUrlByFolder(folder, 0, "png", contentFolder)
        const exists = await tryLoadImage(url)
        if (!exists) return subs
        subs.push(subNum)
      }
    }

    const run = async () => {
      setIsDiscovering(true)
      // Probe topics in parallel — sequential discovery was a major learn-page open delay.
      const result = await Promise.all(
        Array.from({ length: numTopics }, (_, topicIdx) => discoverSubsectionsForTopic(topicIdx))
      )
      if (!cancelled) {
        setTopicSubsections(result)
        setIsDiscovering(false)
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [numTopics, contentFolder, enabled])

  return { topicSubsections, isDiscovering }
}
