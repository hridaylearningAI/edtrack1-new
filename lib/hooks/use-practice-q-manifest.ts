"use client"

import { useEffect, useRef, useState } from "react"
import { useUser } from "@/lib/hooks/useUser"
import {
  parsePracticeQFolderName,
  getPracticeQFullFolderPath,
  type PracticeQFolderEntry,
} from "@/lib/types/practice-q-manifest"

export interface PracticeQSegmentFromManifest {
  folder: string
  slides: string[]
}

export interface UsePracticeQFromManifestResult {
  topicSubsections: number[][]
  segmentByPageId: Record<string, PracticeQSegmentFromManifest>
  totalSlides: number
  hasManifest: boolean
  isLoading: boolean
}

const PRACTICE_Q_BASE = "Practice Q"

/**
 * Fetches practice-q.json and builds topicSubsections + segment map from folder names and slide lists.
 * No image probing: we use the manifest's folder names and sorted slide filenames.
 * When hasManifest is true, use topicSubsections and segmentByPageId; otherwise fall back to discovery.
 */
export function usePracticeQFromManifest(
  numTopics: number,
  contentFolder?: string | null,
  courseId?: number | null,
  practiceQSourceByTopicIdx?: number[],
  /** When set, page IDs use real topic slugs (e.g. topic-1) instead of index+1. */
  topicIds?: string[]
): UsePracticeQFromManifestResult {
  const [data, setData] = useState<{
    folders: PracticeQFolderEntry[]
  }>({ folders: [] })
  const [isLoading, setIsLoading] = useState(true)
  const { getAccessToken } = useUser()
  const getAccessTokenRef = useRef(getAccessToken)
  getAccessTokenRef.current = getAccessToken

  useEffect(() => {
    if (!contentFolder?.trim() && (courseId == null || courseId <= 0)) {
      setData({ folders: [] })
      setIsLoading(false)
      return
    }

    let cancelled = false
    const params = courseId != null ? `courseId=${courseId}` : `contentFolder=${encodeURIComponent(contentFolder!)}`
    const doFetch = async () => {
      const headers: Record<string, string> = {}
      if (courseId != null) {
        const token = await getAccessTokenRef.current()
        if (token) headers["Authorization"] = `Bearer ${token}`
      }
      return fetch(`/api/practice-q-manifest?${params}`, {
        headers: Object.keys(headers).length ? headers : undefined,
      })
    }
    doFetch()
      .then((res) => res.json())
      .then((json: { folders?: { folder: string; slides: string[] }[] }) => {
        if (cancelled) return
        const folders = Array.isArray(json?.folders)
          ? json.folders.filter((f) => f && typeof f.folder === "string" && Array.isArray(f.slides))
          : []
        setData({ folders })
      })
      .catch(() => {
        if (!cancelled) setData({ folders: [] })
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [contentFolder, courseId])

  const topicSubsections: number[][] = Array.from({ length: numTopics }, () => [])
  const segmentByPageId: Record<string, PracticeQSegmentFromManifest> = {}
  let totalSlides = 0

  for (const entry of data.folders) {
    const fullFolder = getPracticeQFullFolderPath(entry.folder)
    const parsed = parsePracticeQFolderName(entry.folder)
    if (parsed && parsed.topicIdx >= 0 && parsed.topicIdx < numTopics) {
      const sourceTopicNum = parsed.topicIdx + 1
      const mappedTargetIdx =
        Array.isArray(practiceQSourceByTopicIdx) && practiceQSourceByTopicIdx.length > 0
          ? practiceQSourceByTopicIdx.findIndex((n) => n === sourceTopicNum)
          : -1
      const targetIdx = mappedTargetIdx >= 0 ? mappedTargetIdx : parsed.topicIdx

      if (!topicSubsections[targetIdx].includes(parsed.subNum)) {
        topicSubsections[targetIdx].push(parsed.subNum)
      }
      topicSubsections[targetIdx].sort((a, b) => a - b)
      const topicSlug =
        Array.isArray(topicIds) && topicIds[targetIdx]?.trim()
          ? topicIds[targetIdx].trim()
          : `topic-${targetIdx + 1}`
      const pageId = `${topicSlug}-practice-q-${parsed.subNum}`
      segmentByPageId[pageId] = { folder: fullFolder, slides: entry.slides }
      totalSlides += entry.slides.length
    }
  }

  return {
    topicSubsections,
    segmentByPageId,
    totalSlides,
    hasManifest: data.folders.length > 0,
    isLoading,
  }
}
