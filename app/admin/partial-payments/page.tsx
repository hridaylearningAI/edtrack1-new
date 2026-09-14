'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { format } from 'date-fns'
import { Loader2, RefreshCw } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

type Plan = {
  id: number
  name: string
  plan_key: string
  price: number
}

type Course = {
  id: number
  name: string
  course_code?: string
}

type Student = {
  id: number
  name: string
  email?: string
}

type Enrollment = {
  id: number
  student_id: number
  course_id: number
  status: string
  enrollment_date: string
  plan_id?: number | null
  course_plans?: Plan | Plan[] | null
  students?: Student | Student[] | null
  courses?: Course | Course[] | null
}

type PartialPaymentRecord = {
  id: number
  enrollment_id: number
  student_id: number
  course_id: number
  root_plan_key: string | null
  latest_stage_plan_key: string | null
  max_stage_paid: number
  is_partial: boolean
  is_fully_paid: boolean
  has_partial_tracking?: boolean
  max_topic_idx_unlocked: number | null
  last_payment_at: string | null
  updated_at: string
  enrollment?: Enrollment | null
  root_plan?: Plan | null
  latest_stage_plan?: Plan | null
}

function asObject<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

export default function AdminPartialPaymentsPage() {
  const { getToken } = useAuth()
  const [rows, setRows] = useState<PartialPaymentRecord[]>([])
  const [candidates, setCandidates] = useState<Enrollment[]>([])
  const [loading, setLoading] = useState(true)
  const [bulkLoading, setBulkLoading] = useState(false)
  const [courseFilter, setCourseFilter] = useState<string>('all')
  const [planFilter, setPlanFilter] = useState<string>('all')
  const [stageFilter, setStageFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [selectedPartialEnrollmentIds, setSelectedPartialEnrollmentIds] = useState<Set<number>>(new Set())
  const [selectedCandidateEnrollmentIds, setSelectedCandidateEnrollmentIds] = useState<Set<number>>(new Set())

  const fetchRows = async () => {
    try {
      setLoading(true)
      let authToken: string | null = null
      try {
        if (getToken) authToken = await getToken()
        if (!authToken) authToken = sessionStorage.getItem('clerk_auth_token')
      } catch {
        authToken = sessionStorage.getItem('clerk_auth_token')
      }

      const [res, candidateRes] = await Promise.all([
        fetch('/api/admin/partial-payments', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...(authToken && { Authorization: `Bearer ${authToken}` }),
          },
        }),
        fetch('/api/admin/partial-payments/candidates', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...(authToken && { Authorization: `Bearer ${authToken}` }),
          },
        }),
      ])
      const json = await res.json()
      const candidateJson = await candidateRes.json()
      if (!res.ok || !json.success) {
        toast.error(json.error || json.message || 'Failed to fetch partial payments')
        setRows([])
        return
      }
      if (!candidateRes.ok || !candidateJson.success) {
        toast.error(candidateJson.error || candidateJson.message || 'Failed to fetch non-partial enrollments')
        setCandidates([])
      } else {
        setCandidates(Array.isArray(candidateJson.data) ? candidateJson.data : [])
      }
      setRows(Array.isArray(json.data) ? json.data : [])
      setSelectedPartialEnrollmentIds(new Set())
      setSelectedCandidateEnrollmentIds(new Set())
    } catch (err) {
      console.error('Fetch partial payments:', err)
      toast.error('Failed to fetch partial payments')
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRows()
  }, [])

  const courses = useMemo(() => {
    const map = new Map<number, Course>()
    rows.forEach((r) => {
      const c = asObject(r.enrollment?.courses)
      if (c && !map.has(c.id)) map.set(c.id, c)
    })
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name))
  }, [rows])

  const rootPlanKeys = useMemo(() => {
    return [...new Set(rows.map((r) => r.root_plan_key).filter((v): v is string => !!v))].sort()
  }, [rows])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter((r) => {
      const e = r.enrollment
      const student = asObject(e?.students)
      const course = asObject(e?.courses)
      if (courseFilter !== 'all' && String(course?.id ?? r.course_id) !== courseFilter) return false
      if (planFilter !== 'all' && (r.root_plan_key || '') !== planFilter) return false
      if (stageFilter !== 'all' && String(r.max_stage_paid) !== stageFilter) return false
      if (statusFilter === 'partial' && (!r.has_partial_tracking || r.is_fully_paid)) return false
      if (statusFilter === 'full' && (!r.has_partial_tracking || !r.is_fully_paid)) return false
      if (!q) return true
      const hay = [
        student?.name,
        student?.email,
        course?.name,
        course?.course_code,
        r.root_plan_key,
        r.latest_stage_plan_key,
        r.root_plan?.name,
        r.latest_stage_plan?.name,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return hay.includes(q)
    })
  }, [rows, courseFilter, planFilter, stageFilter, statusFilter, search])

  const stats = useMemo(() => {
    const total = filtered.length
    const withTracking = filtered.filter((r) => r.has_partial_tracking).length
    const full = filtered.filter((r) => r.has_partial_tracking && r.is_fully_paid).length
    const partial = filtered.filter((r) => r.has_partial_tracking && !r.is_fully_paid).length
    const withoutTracking = total - withTracking
    const stage1 = filtered.filter((r) => r.has_partial_tracking && r.max_stage_paid === 1).length
    const stage2 = filtered.filter((r) => r.has_partial_tracking && r.max_stage_paid === 2).length
    const stage3 = filtered.filter((r) => r.has_partial_tracking && r.max_stage_paid >= 3).length
    return { total, full, partial, withoutTracking, stage1, stage2, stage3 }
  }, [filtered])

  const filteredCandidates = useMemo(() => {
    const q = search.trim().toLowerCase()
    return candidates.filter((e) => {
      const student = asObject(e.students)
      const course = asObject(e.courses)
      const plan = asObject(e.course_plans)
      if (courseFilter !== 'all' && String(course?.id ?? e.course_id) !== courseFilter) return false
      if (!q) return true
      const hay = [
        student?.name,
        student?.email,
        course?.name,
        course?.course_code,
        plan?.name,
        plan?.plan_key,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return hay.includes(q)
    })
  }, [candidates, search, courseFilter])

  const selectedOverviewRows = useMemo(
    () => filtered.filter((r) => selectedPartialEnrollmentIds.has(r.enrollment_id)),
    [filtered, selectedPartialEnrollmentIds]
  )
  const selectedOverviewWithoutTrackingIds = useMemo(
    () => selectedOverviewRows.filter((r) => !r.has_partial_tracking).map((r) => r.enrollment_id),
    [selectedOverviewRows]
  )

  const toggleSelected = (setFn: (updater: (prev: Set<number>) => Set<number>) => void, id: number) => {
    setFn((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const runBulk = async (action: 'mark_partial_stage1' | 'remove_partial', ids: number[]) => {
    if (ids.length === 0) return
    try {
      setBulkLoading(true)
      let authToken: string | null = null
      try {
        if (getToken) authToken = await getToken()
        if (!authToken) authToken = sessionStorage.getItem('clerk_auth_token')
      } catch {
        authToken = sessionStorage.getItem('clerk_auth_token')
      }
      const res = await fetch('/api/admin/partial-payments/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken && { Authorization: `Bearer ${authToken}` }),
        },
        body: JSON.stringify({
          action,
          enrollment_ids: ids,
        }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        toast.error(json.error || json.message || 'Bulk update failed')
        return
      }
      if (Array.isArray(json.data?.skipped) && json.data.skipped.length > 0) {
        const firstReason = json.data.skipped[0]?.reason ? ` First reason: ${json.data.skipped[0].reason}` : ''
        toast.warning(`Updated ${json.data.updated || 0}. Skipped ${json.data.skipped.length}.${firstReason}`)
      } else {
        toast.success(`Updated ${json.data?.updated || ids.length} enrollment(s).`)
      }
      await fetchRows()
    } catch (err) {
      console.error('Bulk update partial payment:', err)
      toast.error('Bulk update failed')
    } finally {
      setBulkLoading(false)
    }
  }

  return (
          <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl sm:text-3xl font-medium tracking-tight text-foreground">Partial Payments</h2>
            <p className="text-muted-foreground mt-1">
              Track learners by staged payment plan and current paid stage.
            </p>
          </div>
          <Button variant="outline" onClick={fetchRows} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Refreshing
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </>
            )}
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          <Card><CardHeader className="pb-2"><CardDescription>Total</CardDescription><CardTitle>{stats.total}</CardTitle></CardHeader></Card>
          <Card><CardHeader className="pb-2"><CardDescription>Partial</CardDescription><CardTitle>{stats.partial}</CardTitle></CardHeader></Card>
          <Card><CardHeader className="pb-2"><CardDescription>Fully Paid</CardDescription><CardTitle>{stats.full}</CardTitle></CardHeader></Card>
          <Card><CardHeader className="pb-2"><CardDescription>No Tracking</CardDescription><CardTitle>{stats.withoutTracking}</CardTitle></CardHeader></Card>
          <Card><CardHeader className="pb-2"><CardDescription>Stage 2</CardDescription><CardTitle>{stats.stage2}</CardTitle></CardHeader></Card>
          <Card><CardHeader className="pb-2"><CardDescription>Stage 3+</CardDescription><CardTitle>{stats.stage3}</CardTitle></CardHeader></Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search student, email, plan, course..."
              />
              <Select value={courseFilter} onValueChange={setCourseFilter}>
                <SelectTrigger><SelectValue placeholder="Course" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All courses</SelectItem>
                  {courses.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.course_code ? `${c.course_code} - ${c.name}` : c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={planFilter} onValueChange={setPlanFilter}>
                <SelectTrigger><SelectValue placeholder="Root plan" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All root plans</SelectItem>
                  {rootPlanKeys.map((k) => (
                    <SelectItem key={k} value={k}>{k}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={stageFilter} onValueChange={setStageFilter}>
                <SelectTrigger><SelectValue placeholder="Stage" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All stages</SelectItem>
                  <SelectItem value="1">Stage 1</SelectItem>
                  <SelectItem value="2">Stage 2</SelectItem>
                  <SelectItem value="3">Stage 3</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger><SelectValue placeholder="Payment status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="partial">Partial only</SelectItem>
                  <SelectItem value="full">Fully paid only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Learner Stage Overview</CardTitle>
            <CardDescription>{filtered.length} record(s)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                disabled={bulkLoading || selectedOverviewWithoutTrackingIds.length === 0}
                onClick={() => runBulk('mark_partial_stage1', selectedOverviewWithoutTrackingIds)}
              >
                {bulkLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Move selected to Partial Payments (Stage 1)
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={bulkLoading || selectedPartialEnrollmentIds.size === 0}
                onClick={() => runBulk('remove_partial', Array.from(selectedPartialEnrollmentIds))}
              >
                {bulkLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Mark selected as Non-partial
              </Button>
              <span className="text-xs text-muted-foreground">
                Selected: {selectedPartialEnrollmentIds.size}
                {selectedPartialEnrollmentIds.size > 0
                  ? ` (${selectedOverviewWithoutTrackingIds.length} without tracking)`
                  : ''}
              </span>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <input
                        type="checkbox"
                        checked={filtered.length > 0 && filtered.every((r) => selectedPartialEnrollmentIds.has(r.enrollment_id))}
                        onChange={(e) =>
                          setSelectedPartialEnrollmentIds(
                            e.target.checked
                              ? new Set(filtered.map((r) => r.enrollment_id))
                              : new Set()
                          )
                        }
                      />
                    </TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead>Root Plan</TableHead>
                    <TableHead>Latest Stage Plan</TableHead>
                    <TableHead>Max Stage Paid</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Unlock Cap</TableHead>
                    <TableHead>Last Payment</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        <Loader2 className="mx-auto h-5 w-5 animate-spin mb-2" />
                        Loading partial payments...
                      </TableCell>
                    </TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        No partial-payment records found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((r) => {
                      const e = r.enrollment
                      const student = asObject(e?.students)
                      const course = asObject(e?.courses)
                      return (
                        <TableRow key={r.id}>
                          <TableCell>
                            <input
                              type="checkbox"
                              checked={selectedPartialEnrollmentIds.has(r.enrollment_id)}
                              onChange={() => toggleSelected(setSelectedPartialEnrollmentIds, r.enrollment_id)}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{student?.name || `Student #${r.student_id}`}</div>
                            <div className="text-xs text-muted-foreground">{student?.email || '—'}</div>
                          </TableCell>
                          <TableCell>
                            <div>{course?.name || `Course #${r.course_id}`}</div>
                            <div className="text-xs text-muted-foreground">{course?.course_code || '—'}</div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{r.root_plan?.name || r.root_plan_key || '—'}</div>
                            <div className="text-xs text-muted-foreground">{r.root_plan_key || '—'}</div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{r.latest_stage_plan?.name || r.latest_stage_plan_key || '—'}</div>
                            <div className="text-xs text-muted-foreground">{r.latest_stage_plan_key || '—'}</div>
                          </TableCell>
                          <TableCell>
                            {r.has_partial_tracking ? (
                              <Badge variant="outline">Stage {r.max_stage_paid}</Badge>
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {!r.has_partial_tracking ? (
                              <Badge variant="secondary">No tracking</Badge>
                            ) : r.is_fully_paid ? (
                              <Badge className="bg-success hover:bg-success">Fully paid</Badge>
                            ) : (
                              <Badge className="bg-warning hover:bg-warning">Partial</Badge>
                            )}
                          </TableCell>
                          <TableCell>{r.max_topic_idx_unlocked != null ? `Topic ${r.max_topic_idx_unlocked + 1}` : '—'}</TableCell>
                          <TableCell>{r.last_payment_at ? format(new Date(r.last_payment_at), 'dd MMM yyyy') : '—'}</TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Students Without Partial Tracking</CardTitle>
            <CardDescription>{filteredCandidates.length} record(s)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                disabled={bulkLoading || selectedCandidateEnrollmentIds.size === 0}
                onClick={() => runBulk('mark_partial_stage1', Array.from(selectedCandidateEnrollmentIds))}
              >
                {bulkLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Mark selected as Partial (Stage 1)
              </Button>
              <span className="text-xs text-muted-foreground">
                Selected: {selectedCandidateEnrollmentIds.size}
              </span>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <input
                        type="checkbox"
                        checked={
                          filteredCandidates.length > 0 &&
                          filteredCandidates.every((e) => selectedCandidateEnrollmentIds.has(e.id))
                        }
                        onChange={(e) =>
                          setSelectedCandidateEnrollmentIds(
                            e.target.checked
                              ? new Set(filteredCandidates.map((row) => row.id))
                              : new Set()
                          )
                        }
                      />
                    </TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead>Current Enrollment Plan</TableHead>
                    <TableHead>Enrollment Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        <Loader2 className="mx-auto h-5 w-5 animate-spin mb-2" />
                        Loading candidates...
                      </TableCell>
                    </TableRow>
                  ) : filteredCandidates.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No non-partial enrollments found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCandidates.map((e) => {
                      const student = asObject(e.students)
                      const course = asObject(e.courses)
                      const plan = asObject(e.course_plans)
                      return (
                        <TableRow key={e.id}>
                          <TableCell>
                            <input
                              type="checkbox"
                              checked={selectedCandidateEnrollmentIds.has(e.id)}
                              onChange={() => toggleSelected(setSelectedCandidateEnrollmentIds, e.id)}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{student?.name || `Student #${e.student_id}`}</div>
                            <div className="text-xs text-muted-foreground">{student?.email || '—'}</div>
                          </TableCell>
                          <TableCell>
                            <div>{course?.name || `Course #${e.course_id}`}</div>
                            <div className="text-xs text-muted-foreground">{course?.course_code || '—'}</div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{plan?.name || '—'}</div>
                            <div className="text-xs text-muted-foreground">{plan?.plan_key || '—'}</div>
                          </TableCell>
                          <TableCell>{e.enrollment_date ? format(new Date(e.enrollment_date), 'dd MMM yyyy') : '—'}</TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
  )
}

