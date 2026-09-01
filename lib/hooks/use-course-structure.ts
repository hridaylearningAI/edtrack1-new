"use client"

import { useEffect, useRef, useState } from "react"
import { useUser } from "@/lib/hooks/useUser"
import type { CourseStructureManifest } from "@/lib/types/course-structure"
import { DEFAULT_COURSE_STRUCTURE } from "@/lib/types/course-structure"

export interface UseCourseStructureResult {
  structure: CourseStructureManifest
  loading: boolean
  error: string | null
}

/**
 * Fetches course structure from /api/course-manifest (which proxies CDN and
 * falls back to local data/manifest.json). When courseId is provided, uses
 * that course's content_folder to build the manifest URL. Requires auth token
 * when courseId is present (enrollment check).
 */
export function useCourseStructure(courseId?: number | null): UseCourseStructureResult {
  const [structure, setStructure] = useState<CourseStructureManifest>(DEFAULT_COURSE_STRUCTURE)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { getAccessToken } = useUser()
  const getAccessTokenRef = useRef(getAccessToken)
  getAccessTokenRef.current = getAccessToken

  useEffect(() => {
    setLoading(true)
    setError(null)

    const url = courseId != null ? `/api/course-manifest?courseId=${courseId}` : "/api/course-manifest"
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
        if (!res.ok) throw new Error(`Manifest ${res.status}`)
        return res.json()
      })
      .then((data: CourseStructureManifest) => {
        if (Array.isArray(data?.topics)) {
          setStructure({
            programOverview: data.programOverview ?? undefined,
            topics: data.topics,
          })
        }
      })
      .catch(() => {
        setError("Could not load course structure")
        setStructure(DEFAULT_COURSE_STRUCTURE)
      })
      .finally(() => setLoading(false))
  }, [courseId])

  return { structure, loading, error }
}
