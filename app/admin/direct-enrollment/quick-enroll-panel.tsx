'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, RefreshCw, UserPlus } from 'lucide-react'
import { toast } from 'sonner'

type CourseRow = {
  id: number
  name: string
  course_code?: string | null
}

type PlanRow = {
  id: number
  plan_key: string
  name: string
  price?: number | null
  sort_order?: number | null
}

/** Same shape as Enrollment Overview (`UserEnrollmentSummary`). */
type OverviewStudentUser = {
  id: number
  name: string | null
  email: string | null
  role: string | null
  created_at: string | null
  enrollment_count: number
  latest_enrollment_at: string | null
}

const USER_NONE = '_none'

async function getBearer(getToken: () => Promise<string | null>) {
  let authToken: string | null = null
  try {
    if (getToken) authToken = await getToken()
    if (!authToken) authToken = sessionStorage.getItem('clerk_auth_token')
  } catch {
    authToken = sessionStorage.getItem('clerk_auth_token')
  }
  return authToken
}

export default function DirectEnrollmentPage() {
  const { getToken } = useAuth()
  const [courses, setCourses] = useState<CourseRow[]>([])
  const [coursesLoading, setCoursesLoading] = useState(true)
  const [courseId, setCourseId] = useState<string>('')

  const [plans, setPlans] = useState<PlanRow[]>([])
  const [plansLoading, setPlansLoading] = useState(false)
  const [planId, setPlanId] = useState<string>('none')

  const [studentUsers, setStudentUsers] = useState<OverviewStudentUser[]>([])
  const [overviewLoading, setOverviewLoading] = useState(true)
  const [userFilter, setUserFilter] = useState('')
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)

  const [withCertificate, setWithCertificate] = useState(false)
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const selectedCourse = useMemo(
    () => courses.find((c) => String(c.id) === courseId),
    [courses, courseId]
  )

  const selectedUser = useMemo(
    () => studentUsers.find((u) => String(u.id) === selectedUserId) ?? null,
    [studentUsers, selectedUserId]
  )

  const filteredStudentUsers = useMemo(() => {
    const q = userFilter.trim().toLowerCase()
    if (!q) return studentUsers
    return studentUsers.filter((u) =>
      `${u.name || ''} ${u.email || ''}`.toLowerCase().includes(q)
    )
  }, [studentUsers, userFilter])

  const loadCourses = useCallback(async () => {
    try {
      setCoursesLoading(true)
      const token = await getBearer(getToken)
      const res = await fetch('/api/courses?limit=500', {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      })
      const json = await res.json()
      if (!res.ok || !json?.success) {
        toast.error(json?.message || 'Failed to load courses')
        setCourses([])
        return
      }
      const rows = (json.data || []) as CourseRow[]
      rows.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
      setCourses(rows)
    } catch {
      toast.error('Failed to load courses')
      setCourses([])
    } finally {
      setCoursesLoading(false)
    }
  }, [getToken])

  const loadEnrollmentOverviewUsers = useCallback(async () => {
    try {
      setOverviewLoading(true)
      const token = await getBearer(getToken)
      const res = await fetch('/api/admin/enrollment-overview', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      })
      const json = await res.json()
      if (!res.ok || !json?.success) {
        toast.error(json?.error || json?.message || 'Failed to load student list')
        setStudentUsers([])
        return
      }
      const payload = json.data as {
        enrolledUsers?: OverviewStudentUser[]
        notEnrolledUsers?: OverviewStudentUser[]
      }
      const enrolled = payload?.enrolledUsers ?? []
      const notEnrolled = payload?.notEnrolledUsers ?? []
      const merged = [...enrolled, ...notEnrolled]
      merged.sort((a, b) =>
        (a.name || a.email || '').localeCompare(b.name || b.email || '')
      )
      setStudentUsers(merged)
    } catch {
      toast.error('Failed to load student list')
      setStudentUsers([])
    } finally {
      setOverviewLoading(false)
    }
  }, [getToken])

  useEffect(() => {
    loadCourses()
  }, [loadCourses])

  useEffect(() => {
    loadEnrollmentOverviewUsers()
  }, [loadEnrollmentOverviewUsers])

  useEffect(() => {
    if (!courseId) {
      setPlans([])
      setPlanId('none')
      return
    }
    let cancelled = false
    const loadPlans = async () => {
      try {
        setPlansLoading(true)
        const res = await fetch(`/api/courses/${courseId}/plans`)
        const json = await res.json()
        if (cancelled) return
        if (!res.ok || !json?.success) {
          setPlans([])
          setPlanId('none')
          return
        }
        const list = (json.data || []) as PlanRow[]
        list.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
        setPlans(list)
        setPlanId('none')
      } catch {
        if (!cancelled) {
          setPlans([])
          setPlanId('none')
        }
      } finally {
        if (!cancelled) setPlansLoading(false)
      }
    }
    loadPlans()
    return () => {
      cancelled = true
    }
  }, [courseId])

  const onStudentChange = (value: string) => {
    if (value === USER_NONE) {
      setSelectedUserId(null)
      return
    }
    setSelectedUserId(value)
  }

  const handleEnroll = async () => {
    if (!selectedUser || !courseId) {
      toast.error('Select a student and a course')
      return
    }
    const cid = parseInt(courseId, 10)
    if (!Number.isFinite(cid)) return

    setSubmitting(true)
    try {
      const token = await getBearer(getToken)
      if (!token) {
        toast.error('Not authenticated')
        return
      }

      const body: Record<string, unknown> = {
        student_id: selectedUser.id,
        course_id: cid,
        status: 'active',
        progress: 0,
        with_certificate: withCertificate,
      }
      if (planId && planId !== 'none') {
        const pid = parseInt(planId, 10)
        if (Number.isFinite(pid)) {
          body.plan_id = pid
        }
      }
      const trimmedNotes = notes.trim()
      if (trimmedNotes) {
        body.notes = trimmedNotes
      }

      const res = await fetch('/api/enrollments', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })
      const json = await res.json().catch(() => ({}))
      if (res.status === 409) {
        toast.error('This student is already enrolled in this course')
        return
      }
      if (!res.ok || !json?.success) {
        toast.error(json?.message || json?.error || 'Failed to create enrollment')
        return
      }
      toast.success('Student enrolled successfully')
      setSelectedUserId(null)
      setNotes('')
      setWithCertificate(false)
      await loadEnrollmentOverviewUsers()
    } catch {
      toast.error('Failed to enroll student')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="container max-w-3xl py-8 px-4">
      <div className="mb-8">
        <h2 className="text-xl font-semibold tracking-tight">Quick enroll</h2>
        <p className="text-muted-foreground mt-1">
          Enroll a student into a course and assign a plan (for example Guided NCLEX stages). The student list matches
          Enrollment Overview: all accounts with role <span className="font-medium">student</span>, including those with
          no enrollments yet.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Enroll by plan
          </CardTitle>
          <CardDescription>
            Same data source as{' '}
            <span className="font-medium">Admin → Enrollment Overview</span> (merged &quot;enrolled&quot; and &quot;not
            enrolled in any course&quot; tabs). Use the filter to search by name or email.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Course</Label>
            {coursesLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading courses…
              </div>
            ) : (
              <Select value={courseId} onValueChange={setCourseId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a course" />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}
                      {c.course_code ? ` (${c.course_code})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {courseId ? (
            <div className="space-y-2">
              <Label>Plan</Label>
              {plansLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading plans…
                </div>
              ) : plans.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No plans configured for {selectedCourse?.name ?? 'this course'}. Enrollment will be created without a plan.
                </p>
              ) : (
                <Select value={planId} onValueChange={setPlanId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a plan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No plan (course only)</SelectItem>
                    {plans.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.name} ({p.plan_key})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          ) : null}

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label>Student</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 gap-1 text-xs"
                disabled={overviewLoading}
                onClick={() => void loadEnrollmentOverviewUsers()}
              >
                <RefreshCw className={`h-3.5 w-3.5 ${overviewLoading ? 'animate-spin' : ''}`} />
                Refresh list
              </Button>
            </div>
            <Input
              placeholder="Filter by name or email…"
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              disabled={overviewLoading}
              className="mb-2"
            />
            {overviewLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading students (Enrollment Overview data)…
              </div>
            ) : (
              <Select value={selectedUserId ?? USER_NONE} onValueChange={onStudentChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a student" />
                </SelectTrigger>
                <SelectContent className="max-h-[min(320px,50vh)]">
                  <SelectItem value={USER_NONE}>— None —</SelectItem>
                  {filteredStudentUsers.map((u) => (
                    <SelectItem key={u.id} value={String(u.id)}>
                      {u.name || '—'} ({u.email || 'no email'}) ·{' '}
                      {u.enrollment_count === 0
                        ? 'No enrollments'
                        : `${u.enrollment_count} enrollment(s)`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {!overviewLoading && studentUsers.length === 0 ? (
              <p className="text-xs text-muted-foreground">No student users found.</p>
            ) : null}
            {filteredStudentUsers.length === 0 && !overviewLoading && studentUsers.length > 0 ? (
              <p className="text-xs text-muted-foreground">No users match this filter.</p>
            ) : null}
            {selectedUser ? (
              <p className="text-sm text-green-700 dark:text-green-400">
                User id {selectedUser.id}
                {selectedUser.enrollment_count === 0
                  ? ' · Not enrolled in any course yet'
                  : ` · ${selectedUser.enrollment_count} existing enrollment(s)`}
              </p>
            ) : null}
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="with-cert">Include certificate</Label>
              <p className="text-xs text-muted-foreground">When the course supports certificate pricing</p>
            </div>
            <Switch id="with-cert" checked={withCertificate} onCheckedChange={setWithCertificate} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Internal note for this enrollment…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          <Button
            className="w-full sm:w-auto"
            disabled={submitting || !courseId || !selectedUser || overviewLoading}
            onClick={handleEnroll}
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enrolling…
              </>
            ) : (
              'Enroll student'
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
