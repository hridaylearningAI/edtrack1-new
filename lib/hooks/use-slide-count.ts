"use client"

import { useEffect, useState } from "react"
import { getContentBaseUrl, getContentBaseUrlForFolder, getSlideImageCandidateUrls } from "@/lib/content-url"

const DEFAULT_SLIDE_COUNT = 25

export interface UseSlideCountResult {
  count: number
  isDiscovering: boolean
}

/**
 * Discovers the number of slides for a folder by trying to load 1.png/01.png, 2.png/02.png, ...
 * Tries both zero-padded (01.png) and unpadded (1.png) for each slide; only fails when both 404/403.
 * When no slides are found, count is 0 (do not invent a default — that causes mass CDN 403s on ETIA/LMS packs).
 */
export function useSlideCount(folder: string | null, contentFolder?: string | null): UseSlideCountResult {
  const [count, setCount] = useState<number>(0)
  const [isDiscovering, setIsDiscovering] = useState<boolean>(true)

  useEffect(() => {
    const base = contentFolder?.trim() ? getContentBaseUrlForFolder(contentFolder) : getContentBaseUrl()
    if (!base || !folder) {
      setCount(0)
      setIsDiscovering(false)
      return
    }

    setIsDiscovering(true)
    setCount(0)
    let cancelled = false
    let lastSuccess = 0

    const finish = (finalCount: number) => {
      if (cancelled) return
      setCount(finalCount)
      setIsDiscovering(false)
    }

    const tryNext = (index: number, candidateIndex: number) => {
      if (cancelled) return
      const candidates = getSlideImageCandidateUrls(folder, index, "png", contentFolder)
      const url = candidates[candidateIndex]
      if (!url) {
        finish(lastSuccess)
        return
      }
      const img = new Image()
      img.onload = () => {
        if (cancelled) return
        lastSuccess = index + 1
        setCount(lastSuccess)
        tryNext(index + 1, 0)
      }
      img.onerror = () => {
        if (cancelled) return
        if (candidateIndex + 1 < candidates.length) {
          tryNext(index, candidateIndex + 1)
        } else {
          finish(lastSuccess)
        }
      }
      img.src = url
    }

    tryNext(0, 0)
    return () => {
      cancelled = true
    }
  }, [folder, contentFolder])

  return { count, isDiscovering }
}
