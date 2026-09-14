"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, RefreshCw, CheckCircle, XCircle, Lock, LockOpen } from "lucide-react"
import { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"
import { useUser } from "@/lib/hooks/useUser"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface CourseRow {
  id: number
  name: string
  course_code?: string | null
}

interface EnrollmentRow {
  id: number
  student_id: number
  course_id: number
  student_name: string
  student_email: string
  progress?: number
  status?: string
}

interface UnlockRequestRow {
  id: number
  enrollment_id: number
  course_id: number
  status: string
  requested_at: string
  student_name?: string
  student_email?: string
  course_name?: string
}

export default function ContentUnlocksPage() {
  const { getAccessToken } = useUser()
  const [requests, setRequests] = useState<UnlockRequestRow[]>([])
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState<number | null>(null)

  const [courses, setCourses] = useState<CourseRow[]>([])
  const [coursesLoading, setCoursesLoading] = useState(true)
  const [unlockCourseId, setUnlockCourseId] = useState<string>("")
  const [enrollments, setEnrollments] = useState<EnrollmentRow[]>([])
  const [enrollmentsLoading, setEnrollmentsLoading] = useState(false)
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState<string>("")
  const [unlockAllLoading, setUnlockAllLoading] = useState(false)
  const [requestCourseFilter, setRequestCourseFilter] = useState<string>("all")

  const fetchCourses = useCallback(async () => {
    setCoursesLoading(true)
    try {
      const token = await getAccessToken()
      const res = await fetch("/api/courses?limit=500", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const json = await res.json()
      const rows = (Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : []) as CourseRow[]
      const sorted = [...rows].sort((a, b) => a.name.localeCompare(b.name))
      setCourses(sorted)
      setUnlockCourseId((prev) => {
        if (prev && sorted.some((c) => String(c.id) === prev)) return prev
        return sorted[0] ? String(sorted[0].id) : ""
      })
    } catch {
      setCourses([])
      toast.error("Failed to load courses")
    } finally {
      setCoursesLoading(false)
    }
  }, [getAccessToken])

  const fetchEnrollments = useCallback(async () => {
    const cid = parseInt(unlockCourseId, 10)
    if (Number.isNaN(cid) || cid <= 0) {
      setEnrollments([])
      return
    }
    setEnrollmentsLoading(true)
    try {
      const token = await getAccessToken()
      const res = await fetch(`/api/progress/admin/course-enrollments?courseId=${cid}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const json = await res.json()
      if (json?.success && Array.isArray(json?.data)) {
        setEnrollments(json.data)
        setSelectedEnrollmentId((prev) => {
          const stillExists = json.data.some((e: EnrollmentRow) => String(e.id) === prev)
          return stillExists ? prev : ""
        })
      } else {
        setEnrollments([])
        setSelectedEnrollmentId("")
      }
    } catch {
      setEnrollments([])
      toast.error("Failed to load enrollments")
    } finally {
      setEnrollmentsLoading(false)
    }
  }, [unlockCourseId, getAccessToken])

  const fetchRequests = useCallback(async () => {
    setLoading(true)
    try {
      const token = await getAccessToken()
      const courseQ =
        requestCourseFilter !== "all" ? `&courseId=${encodeURIComponent(requestCourseFilter)}` : ""
      const res = await fetch(`/api/course-unlock-requests?status=pending${courseQ}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const json = await res.json()
      if (json?.success && Array.isArray(json?.data)) {
        setRequests(json.data)
      } else {
        setRequests([])
      }
    } catch {
      setRequests([])
      toast.error("Failed to load requests")
    } finally {
      setLoading(false)
    }
  }, [getAccessToken, requestCourseFilter])

  useEffect(() => {
    fetchCourses()
  }, [fetchCourses])

  useEffect(() => {
    fetchEnrollments()
  }, [fetchEnrollments])

  useEffect(() => {
    fetchRequests()
  }, [fetchRequests])

  const handleUnlockAllSections = async () => {
    const cid = parseInt(unlockCourseId, 10)
    const eid = selectedEnrollmentId ? parseInt(selectedEnrollmentId, 10) : NaN
    if (Number.isNaN(cid) || Number.isNaN(eid)) {
      toast.error("Please select a course and enrollment")
      return
    }
    setUnlockAllLoading(true)
    try {
      const token = await getAccessToken()
      const res = await fetch("/api/progress/admin/unlock-all-sections", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ enrollmentId: eid, courseId: cid }),
      })
      const json = await res.json()
      if (json?.success) {
        toast.success(
          `All sections unlocked (${json?.data?.sectionsUnlocked ?? 0} sections)`
        )
        setSelectedEnrollmentId("")
        fetchEnrollments()
        fetchRequests()
      } else {
        toast.error(json?.message ?? "Failed to unlock sections")
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to unlock sections")
    } finally {
      setUnlockAllLoading(false)
    }
  }

  const updateStatus = async (id: number, status: "approved" | "rejected") => {
    setActionId(id)
    try {
      const token = await getAccessToken()
      const res = await fetch(`/api/course-unlock-requests/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ status }),
      })
      const json = await res.json()
      if (json?.success) {
        toast.success(status === "approved" ? "Access approved" : "Request rejected")
        fetchRequests()
      } else {
        toast.error(json?.message ?? "Action failed")
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed")
    } finally {
      setActionId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-medium tracking-tight text-foreground">Content unlocks</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Approve student access requests and unlock course sections for any enrollment.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchRequests} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LockOpen className="h-5 w-5" />
            Unlock all sections
          </CardTitle>
          <CardDescription>
            Manually unlock every section for a student enrollment on the selected course.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="space-y-2 flex-1 min-w-0">
              <label className="text-sm font-medium text-foreground">Course</label>
              <Select
                value={unlockCourseId}
                onValueChange={setUnlockCourseId}
                disabled={coursesLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder={coursesLoading ? "Loading…" : "Select course…"} />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.course_code ? `${c.course_code} — ` : ""}
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 flex-1 min-w-0">
              <label className="text-sm font-medium text-foreground">
                Enrollment
              </label>
              <Select
                value={selectedEnrollmentId}
                onValueChange={setSelectedEnrollmentId}
                disabled={enrollmentsLoading}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={enrollmentsLoading ? "Loading…" : "Select student…"}
                  />
                </SelectTrigger>
                <SelectContent>
                  {enrollments.map((e) => (
                    <SelectItem key={e.id} value={String(e.id)}>
                      {e.student_name || e.student_email || `Enrollment #${e.id}`} (
                      {e.student_email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleUnlockAllSections}
              disabled={unlockAllLoading || !selectedEnrollmentId}
              className="shrink-0"
            >
              {unlockAllLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <LockOpen className="h-4 w-4 mr-2" />
              )}
              Unlock all sections
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Pending access requests
              </CardTitle>
              <CardDescription>
                Students who requested admin unlock for gated course content.
              </CardDescription>
            </div>
            <Select value={requestCourseFilter} onValueChange={setRequestCourseFilter}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Filter by course" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All courses</SelectItem>
                {courses.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-brand-blue" />
            </div>
          ) : requests.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No pending requests.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-2 font-medium">Student</th>
                    <th className="text-left py-3 px-2 font-medium">Email</th>
                    <th className="text-left py-3 px-2 font-medium">Course</th>
                    <th className="text-left py-3 px-2 font-medium">Requested</th>
                    <th className="text-right py-3 px-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((r) => (
                    <tr
                      key={r.id}
                      className="border-b border-border hover:bg-muted"
                    >
                      <td className="py-3 px-2">{r.student_name ?? "—"}</td>
                      <td className="py-3 px-2">{r.student_email ?? "—"}</td>
                      <td className="py-3 px-2">{r.course_name ?? "—"}</td>
                      <td className="py-3 px-2 text-muted-foreground">
                        {r.requested_at ? new Date(r.requested_at).toLocaleString() : "—"}
                      </td>
                      <td className="py-3 px-2 text-right space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={actionId === r.id}
                          onClick={() => updateStatus(r.id, "approved")}
                        >
                          {actionId === r.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle className="h-4 w-4 text-success" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={actionId === r.id}
                          onClick={() => updateStatus(r.id, "rejected")}
                        >
                          <XCircle className="h-4 w-4 text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
