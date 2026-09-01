"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useUser } from "@/lib/hooks/useUser"
import type { CourseStructureManifest } from "@/lib/types/course-structure"
import { getSlideFolderForPageId, getSlidePageIds } from "@/lib/types/course-structure"
import type { SlidesFolderEntry } from "@/lib/types/slides-manifest"

export type SlidesSegmentFromManifest = {
  folder: string
  slides: string[]
}

export interface UseSlidesManifestResult {
  segmentByPageId: Record<string, SlidesSegmentFromManifest>
  segmentByFolder: Record<string, SlidesSegmentFromManifest>
  hasManifest: boolean
  isLoading: boolean
}

/**
 * Fetches lecture slides manifest (DB override or CDN slides-manifest.json).
 * Maps folders to slide page IDs from course structure.
 */
export function useSlidesManifest(
  structure: CourseStructureManifest,
  contentFolder?: string | null,
  courseId?: number | null
): UseSlidesManifestResult {
  const [folders, setFolders] = useState<SlidesFolderEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { getAccessToken } = useUser()
  const getAccessTokenRef = useRef(getAccessToken)
  getAccessTokenRef.current = getAccessToken

  useEffect(() => {
    if (!contentFolder?.trim() && (courseId == null || courseId <= 0)) {
      setFolders([])
      setIsLoading(false)
      return
    }

    let cancelled = false
    const params = courseId != null ? `courseId=${courseId}` : `contentFolder=${encodeURIComponent(contentFolder!)}`

    const run = async () => {
      const headers: Record<string, string> = {}
      if (courseId != null) {
        const token = await getAccessTokenRef.current()
        if (token) headers.Authorization = `Bearer ${token}`
      }
      const res = await fetch(`/api/slides-manifest?${params}`, {
        headers: Object.keys(headers).length ? headers : undefined,
      })
      const json = (await res.json()) as { folders?: SlidesFolderEntry[] }
      if (cancelled) return
      const list = Array.isArray(json?.folders)
        ? json.folders.filter((f) => f && typeof f.folder === "string" && Array.isArray(f.slides))
        : []
      setFolders(list)
    }

    run()
      .catch(() => {
        if (!cancelled) setFolders([])
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [contentFolder, courseId])

  const segmentByFolder = useMemo(() => {
    const map: Record<string, SlidesSegmentFromManifest> = {}
    for (const entry of folders) {
      const folder = entry.folder.trim()
      if (!folder || !entry.slides.length) continue
      map[folder] = { folder, slides: entry.slides }
    }
    return map
  }, [folders])

  const segmentByPageId = useMemo(() => {
    const map: Record<string, SlidesSegmentFromManifest> = {}
    const pageIds = getSlidePageIds(structure)
    for (const pageId of pageIds) {
      const folder = getSlideFolderForPageId(pageId, structure)
      if (!folder) continue
      const seg = segmentByFolder[folder]
      if (seg) map[pageId] = seg
    }
    return map
  }, [structure, segmentByFolder])

  return {
    segmentByPageId,
    segmentByFolder,
    hasManifest: folders.length > 0,
    isLoading,
  }
}
