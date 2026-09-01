"use client"

import { useState, useCallback, useEffect } from "react"
import { useUser } from "@/lib/hooks/useUser"

export interface CourseUnlockStatus {
  approved: boolean
  pending: boolean
}

export function useCourseUnlockRequest(enrollmentId: number | null, courseId: number | null) {
  const { getAccessToken, isAuthenticated } = useUser()
  const [approved, setApproved] = useState(false)
  const [pending, setPending] = useState(false)
  const [loading, setLoading] = useState(false)
  const [requesting, setRequesting] = useState(false)

  const fetchStatus = useCallback(async () => {
    if (enrollmentId == null || courseId == null || !isAuthenticated) {
      setApproved(false)
      setPending(false)
      return
    }
    const token = await getAccessToken()
    if (!token) {
      setApproved(false)
      setPending(false)
      return
    }
    setLoading(true)
    try {
      const res = await fetch(
        `/api/course-unlock-requests/check?enrollmentId=${enrollmentId}&courseId=${courseId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      const json = await res.json()
      if (json?.success && json?.data) {
        setApproved(!!json.data.approved)
        setPending(!!json.data.pending)
      } else {
        setApproved(false)
        setPending(false)
      }
    } catch {
      setApproved(false)
      setPending(false)
    } finally {
      setLoading(false)
    }
  }, [enrollmentId, courseId, isAuthenticated, getAccessToken])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  const requestUnlock = useCallback(async (): Promise<{ success: boolean; message?: string }> => {
    if (enrollmentId == null || courseId == null) return { success: false, message: "Missing enrollment or course" }
    const token = await getAccessToken()
    if (!token) return { success: false, message: "Not authenticated" }
    setRequesting(true)
    try {
      const res = await fetch("/api/course-unlock-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ enrollmentId, courseId }),
      })
      const json = await res.json()
      if (json?.success) {
        setPending(true)
        if (json?.data?.status === "approved") setApproved(true)
        return { success: true, message: json?.data?.message ?? "Request submitted" }
      }
      return { success: false, message: json?.message ?? "Request failed" }
    } catch (e) {
      return { success: false, message: e instanceof Error ? e.message : "Request failed" }
    } finally {
      setRequesting(false)
    }
  }, [enrollmentId, courseId, getAccessToken])

  return { approved, pending, loading, requesting, fetchStatus, requestUnlock }
}
