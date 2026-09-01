"use client"

import { useEffect, useState } from "react"

/**
 * Fetches a course's content_folder by id (for building content URLs when courseId is in the URL).
 * Uses /api/courses/[id]/content-folder - no auth required, never returns 404.
 * Returns null when courseId is missing, invalid, or the course has no content_folder.
 */
export function useCourseContentFolder(courseId: number | null | undefined): string | null {
  const [contentFolder, setContentFolder] = useState<string | null>(null)

  useEffect(() => {
    if (courseId == null || Number.isNaN(courseId)) {
      setContentFolder(null)
      return
    }

    let cancelled = false
    fetch(`/api/courses/${courseId}/content-folder`)
      .then((res) => res.json())
      .then((data: { content_folder?: string | null }) => {
        if (cancelled) return
        const folder = data?.content_folder?.trim() || null
        setContentFolder(folder)
      })
      .catch(() => {
        if (!cancelled) setContentFolder(null)
      })

    return () => {
      cancelled = true
    }
  }, [courseId])

  return contentFolder
}
