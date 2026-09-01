"use client"

import { Fragment, useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { format } from "date-fns"
import { ArrowLeft, ClipboardList, Search, ShieldAlert } from "lucide-react"

import TrainerLayout from "@/components/trainer/trainer-layout"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatProctoringReason } from "@/lib/exam-proctoring/labels"
import {
  NCLEX_EXAM_ONLY_COURSE_ID,
  NCLEX_FULL_COURSE_ID,
} from "@/lib/nclex-exam-only"
import { useUser } from "@/lib/hooks/useUser"
import { cn } from "@/lib/utils"

type MockMetricRow = {
  enrollment_id: number
  student_id: number
  course_id: number
  course_name?: string
  course_code?: string
  student_name: string
  student_email: string
  attempt_count: number
  last_completed_at: string | null
  last_passed: boolean | null
  last_marks_earned: number | null
  last_passing_marks: number | null
  last_correct_count: number | null
  last_total_questions: number | null
  best_marks_earned: number | null
  pass_count: number
  last_proctoring_terminated?: boolean
  last_proctoring_terminate_reason?: string | null
  last_proctoring_warning_count?: number
  last_proctoring_look_away_count?: number
  last_proctoring_multiple_faces_count?: number
  last_proctoring_tab_hidden_count?: number
  last_proctoring_focus_leave_count?: number
  last_proctoring_fullscreen_exit_count?: number
  last_proctoring_screenshot_attempt_count?: number
  proctoring_terminated_attempt_count?: number
  proctoring_flagged_attempt_count?: number
}

type ProctoringOverview = {
  terminated_attempt_count: number
  students_with_flags: number
}

type CourseOption = {
  id: number
  name: string
  code: string
}

type FilterMode = "all" | "flagged" | "terminated" | "clean"
type CourseFilter = "all" | number

function rowIsTerminated(m: MockMetricRow) {
  return !!m.last_proctoring_terminated || (m.proctoring_terminated_attempt_count ?? 0) > 0
}

function rowIsFlagged(m: MockMetricRow) {
  return (
    rowIsTerminated(m) ||
    (m.last_proctoring_warning_count ?? 0) > 0 ||
    (m.proctoring_flagged_attempt_count ?? 0) > 0
  )
}

export default function TrainerNclexProctoringPage() {
  const { isAuthenticated, isLoading, getAccessToken } = useUser()

  const [metrics, setMetrics] = useState<MockMetricRow[]>([])
  const [overview, setOverview] = useState<ProctoringOverview | null>(null)
  const [courses, setCourses] = useState<CourseOption[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterMode>("flagged")
  const [courseFilter, setCourseFilter] = useState<CourseFilter>("all")
  const [query, setQuery] = useState("")
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [showNoAttempts, setShowNoAttempts] = useState(false)

  const fetchMetrics = useCallback(async () => {
    if (!isAuthenticated) return
    setLoading(true)
    setError(null)
    try {
      const token = await getAccessToken()
      const res = await fetch(`/api/trainer/nclex-mock-metrics?courseId=all`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const json = await res.json()
      if (!json?.success || !Array.isArray(json.data?.metrics)) {
        throw new Error(json?.message || "Failed to load proctoring metrics")
      }
      setMetrics(json.data.metrics as MockMetricRow[])
      setOverview(
        json.data.proctoringOverview && typeof json.data.proctoringOverview === "object"
          ? (json.data.proctoringOverview as ProctoringOverview)
          : null
      )
      setCourses(Array.isArray(json.data?.courses) ? (json.data.courses as CourseOption[]) : [])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load proctoring metrics")
      setMetrics([])
      setOverview(null)
      setCourses([])
    } finally {
      setLoading(false)
    }
  }, [getAccessToken, isAuthenticated])

  useEffect(() => {
    void fetchMetrics()
  }, [fetchMetrics])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return metrics.filter((m) => {
      if (courseFilter !== "all" && m.course_id !== courseFilter) return false
      if (!showNoAttempts && m.attempt_count === 0) return false
      if (filter === "terminated" && !rowIsTerminated(m)) return false
      if (filter === "flagged" && !rowIsFlagged(m)) return false
      if (filter === "clean" && (rowIsFlagged(m) || m.attempt_count === 0)) return false
      if (!q) return true
      return (
        m.student_name.toLowerCase().includes(q) ||
        m.student_email.toLowerCase().includes(q) ||
        (m.course_code ?? "").toLowerCase().includes(q) ||
        (m.course_name ?? "").toLowerCase().includes(q) ||
        String(m.enrollment_id).includes(q)
      )
    })
  }, [metrics, filter, query, courseFilter, showNoAttempts])

  const scopedMetrics = useMemo(() => {
    if (courseFilter === "all") return metrics
    return metrics.filter((m) => m.course_id === courseFilter)
  }, [metrics, courseFilter])

  const attemptedCount = useMemo(
    () => scopedMetrics.filter((m) => m.attempt_count > 0).length,
    [scopedMetrics]
  )
  const cleanCount = useMemo(
    () => scopedMetrics.filter((m) => m.attempt_count > 0 && !rowIsFlagged(m)).length,
    [scopedMetrics]
  )
  const terminatedCount = useMemo(
    () =>
      scopedMetrics.reduce((sum, m) => sum + (m.proctoring_terminated_attempt_count ?? 0), 0),
    [scopedMetrics]
  )
  const flaggedStudents = useMemo(
    () => scopedMetrics.filter((m) => rowIsFlagged(m)).length,
    [scopedMetrics]
  )

  const courseButtons = useMemo(() => {
    const known = courses.length
      ? courses
      : [
          { id: NCLEX_FULL_COURSE_ID, name: "Full NCLEX", code: "NCLEX" },
          { id: NCLEX_EXAM_ONLY_COURSE_ID, name: "NCLEX Test Prep", code: "ETP-NCLEX-TP" },
        ]
    return known
  }, [courses])

  if (isLoading || !isAuthenticated) {
    return (
      <TrainerLayout>
        <div className="flex h-64 w-full items-center justify-center">
          <p className="text-sm text-slate-500 dark:text-slate-400">Loading…</p>
        </div>
      </TrainerLayout>
    )
  }

  return (
    <TrainerLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit text-slate-600">
              <Link href="/trainer/nclex">
                <ArrowLeft className="mr-1.5 h-4 w-4" />
                Back to NCLEX Trainer
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                Mock exam proctoring
              </h1>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Includes full NCLEX (#{NCLEX_FULL_COURSE_ID}) and exam-only Test Prep (#
                {NCLEX_EXAM_ONLY_COURSE_ID}). Defaults to flagged attempts.
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => void fetchMetrics()} disabled={loading}>
            {loading ? "Refreshing…" : "Refresh"}
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-brand-blue/15 dark:border-brand-blue/25">
            <CardHeader className="pb-2">
              <CardDescription>Students with attempts</CardDescription>
              <CardTitle className="text-2xl tabular-nums">{attemptedCount}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-red-200/80 dark:border-red-900/40">
            <CardHeader className="pb-2">
              <CardDescription>Terminated attempts</CardDescription>
              <CardTitle className="text-2xl tabular-nums text-red-700 dark:text-red-300">
                {courseFilter === "all"
                  ? (overview?.terminated_attempt_count ?? terminatedCount)
                  : terminatedCount}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-amber-200/80 dark:border-amber-900/40">
            <CardHeader className="pb-2">
              <CardDescription>Students with flags</CardDescription>
              <CardTitle className="text-2xl tabular-nums text-amber-800 dark:text-amber-200">
                {courseFilter === "all"
                  ? (overview?.students_with_flags ?? flaggedStudents)
                  : flaggedStudents}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-emerald-200/80 dark:border-emerald-900/40">
            <CardHeader className="pb-2">
              <CardDescription>Clean last attempts</CardDescription>
              <CardTitle className="text-2xl tabular-nums text-emerald-700 dark:text-emerald-300">
                {cleanCount}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Card className="border-brand-blue/15 dark:border-brand-blue/25">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-brand-blue" />
              <CardTitle>Proctoring roster</CardTitle>
            </div>
            <CardDescription>
              Click a proctoring badge for look-away, multi-face, and tab-leave detail on the latest
              attempt.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant={courseFilter === "all" ? "default" : "outline"}
                className={cn(courseFilter === "all" && "bg-brand-blue hover:bg-brand-blue/90")}
                onClick={() => setCourseFilter("all")}
              >
                All NCLEX courses
              </Button>
              {courseButtons.map((c) => (
                <Button
                  key={c.id}
                  type="button"
                  size="sm"
                  variant={courseFilter === c.id ? "default" : "outline"}
                  className={cn(courseFilter === c.id && "bg-brand-blue hover:bg-brand-blue/90")}
                  onClick={() => setCourseFilter(c.id)}
                >
                  {c.code} (#{c.id})
                </Button>
              ))}
            </div>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ["flagged", "Flagged"],
                    ["terminated", "Terminated"],
                    ["clean", "Clean"],
                    ["all", "All rows"],
                  ] as const
                ).map(([value, label]) => (
                  <Button
                    key={value}
                    type="button"
                    size="sm"
                    variant={filter === value ? "default" : "outline"}
                    className={cn(filter === value && "bg-brand-blue hover:bg-brand-blue/90")}
                    onClick={() => setFilter(value)}
                  >
                    {label}
                  </Button>
                ))}
                <Button
                  type="button"
                  size="sm"
                  variant={showNoAttempts ? "default" : "outline"}
                  onClick={() => setShowNoAttempts((v) => !v)}
                >
                  {showNoAttempts ? "Hide empty enrollments" : "Show empty enrollments"}
                </Button>
              </div>
              <div className="relative w-full lg:max-w-xs">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search name, email, course…"
                  className="pl-8"
                />
              </div>
            </div>

            {loading && metrics.length === 0 ? (
              <div className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                Loading proctoring metrics…
              </div>
            ) : error ? (
              <div className="py-10 text-center">
                <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={() => void fetchMetrics()}>
                  Retry
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-md border border-border/60">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Course</TableHead>
                      <TableHead className="text-right">Attempts</TableHead>
                      <TableHead>Last attempt</TableHead>
                      <TableHead className="text-right">Last score</TableHead>
                      <TableHead>Result</TableHead>
                      <TableHead>Proctoring</TableHead>
                      <TableHead className="text-right">Best</TableHead>
                      <TableHead className="text-right">Passes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((m) => {
                      const expanded = expandedId === m.enrollment_id
                      const terminated = !!m.last_proctoring_terminated
                      const warnings = m.last_proctoring_warning_count ?? 0
                      const hasFlags = rowIsFlagged(m)
                      return (
                        <Fragment key={`${m.course_id}-${m.enrollment_id}`}>
                          <TableRow>
                            <TableCell>
                              <div className="flex min-w-[160px] flex-col">
                                <span className="text-sm font-medium">{m.student_name}</span>
                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                  {m.student_email}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex min-w-[120px] flex-col">
                                <span className="text-xs font-medium text-slate-700 dark:text-slate-200">
                                  {m.course_code ?? m.course_id}
                                </span>
                                <span className="text-[11px] text-slate-500">#{m.course_id}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right tabular-nums">{m.attempt_count}</TableCell>
                            <TableCell className="whitespace-nowrap text-sm text-slate-600 dark:text-slate-300">
                              {m.last_completed_at
                                ? format(new Date(m.last_completed_at), "MMM d, yyyy HH:mm")
                                : "—"}
                            </TableCell>
                            <TableCell className="text-right text-sm tabular-nums">
                              {m.last_marks_earned != null && m.last_passing_marks != null
                                ? `${m.last_marks_earned} / ${m.last_passing_marks}`
                                : "—"}
                            </TableCell>
                            <TableCell>
                              {m.attempt_count === 0 ? (
                                <span className="text-sm text-slate-500">—</span>
                              ) : terminated ? (
                                <Badge className="bg-red-100 text-red-900 dark:bg-red-950/50 dark:text-red-200">
                                  Stopped
                                </Badge>
                              ) : m.last_passed ? (
                                <Badge className="bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200">
                                  Pass
                                </Badge>
                              ) : (
                                <Badge variant="secondary">Not pass</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {m.attempt_count === 0 ? (
                                <span className="text-sm text-slate-500">—</span>
                              ) : (
                                <button
                                  type="button"
                                  className="text-left"
                                  onClick={() => setExpandedId(expanded ? null : m.enrollment_id)}
                                >
                                  {terminated ? (
                                    <Badge className="bg-red-100 text-red-900 dark:bg-red-950/50 dark:text-red-200">
                                      {formatProctoringReason(m.last_proctoring_terminate_reason)}
                                    </Badge>
                                  ) : warnings > 0 ? (
                                    <Badge className="bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                                      {warnings} warning{warnings === 1 ? "" : "s"}
                                    </Badge>
                                  ) : hasFlags ? (
                                    <Badge variant="secondary">
                                      {m.proctoring_terminated_attempt_count ?? 0} prior stop
                                      {(m.proctoring_terminated_attempt_count ?? 0) === 1 ? "" : "s"}
                                    </Badge>
                                  ) : (
                                    <Badge
                                      variant="secondary"
                                      className="bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200"
                                    >
                                      Clean
                                    </Badge>
                                  )}
                                </button>
                              )}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {m.best_marks_earned != null ? m.best_marks_earned : "—"}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">{m.pass_count}</TableCell>
                          </TableRow>
                          {expanded ? (
                            <TableRow>
                              <TableCell colSpan={9} className="bg-muted/30 text-sm">
                                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                                  <p>
                                    <span className="text-slate-500">Last warnings:</span>{" "}
                                    <span className="font-medium tabular-nums">{warnings}</span>
                                  </p>
                                  <p>
                                    <span className="text-slate-500">Look-aways:</span>{" "}
                                    <span className="font-medium tabular-nums">
                                      {m.last_proctoring_look_away_count ?? 0}
                                    </span>
                                  </p>
                                  <p>
                                    <span className="text-slate-500">Multi-face:</span>{" "}
                                    <span className="font-medium tabular-nums">
                                      {m.last_proctoring_multiple_faces_count ?? 0}
                                    </span>
                                  </p>
                                  <p>
                                    <span className="text-slate-500">Focus leaves:</span>{" "}
                                    <span className="font-medium tabular-nums">
                                      {m.last_proctoring_focus_leave_count ??
                                        m.last_proctoring_tab_hidden_count ??
                                        0}
                                    </span>
                                  </p>
                                  <p>
                                    <span className="text-slate-500">Fullscreen exits:</span>{" "}
                                    <span className="font-medium tabular-nums">
                                      {m.last_proctoring_fullscreen_exit_count ?? 0}
                                    </span>
                                  </p>
                                  <p>
                                    <span className="text-slate-500">Screenshot attempts:</span>{" "}
                                    <span className="font-medium tabular-nums">
                                      {m.last_proctoring_screenshot_attempt_count ?? 0}
                                    </span>
                                  </p>
                                  <p>
                                    <span className="text-slate-500">Tab leaves:</span>{" "}
                                    <span className="font-medium tabular-nums">
                                      {m.last_proctoring_tab_hidden_count ?? 0}
                                    </span>
                                  </p>
                                  <p className="sm:col-span-2">
                                    <span className="text-slate-500">Lifetime stops:</span>{" "}
                                    <span className="font-medium tabular-nums">
                                      {m.proctoring_terminated_attempt_count ?? 0}
                                    </span>
                                    {" · "}
                                    <span className="text-slate-500">Flagged attempts:</span>{" "}
                                    <span className="font-medium tabular-nums">
                                      {m.proctoring_flagged_attempt_count ?? 0}
                                    </span>
                                  </p>
                                  {terminated ? (
                                    <p className="sm:col-span-2 text-red-700 dark:text-red-300">
                                      Last stop reason:{" "}
                                      {formatProctoringReason(m.last_proctoring_terminate_reason)}
                                    </p>
                                  ) : null}
                                </div>
                              </TableCell>
                            </TableRow>
                          ) : null}
                        </Fragment>
                      )
                    })}
                    {filtered.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={9}
                          className="text-center text-sm text-slate-500 dark:text-slate-400"
                        >
                          No students match this filter. Try “Terminated”, “All NCLEX courses”, or
                          Refresh.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-muted/20">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-slate-500" />
              <CardTitle className="text-base">How flags work</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-1.5 text-sm text-slate-600 dark:text-slate-400">
            <p>
              <span className="font-medium text-slate-800 dark:text-slate-200">Stopped</span> — exam
              ended by proctoring (multiple faces, sustained look-away, no face, tab leave, or camera
              lost).
            </p>
            <p>
              <span className="font-medium text-slate-800 dark:text-slate-200">Exam-only mocks</span>{" "}
              — attempts from <code className="text-xs">ETP-NCLEX-TP</code> (course #
              {NCLEX_EXAM_ONLY_COURSE_ID}) appear here when “All NCLEX courses” or that course is
              selected.
            </p>
          </CardContent>
        </Card>
      </div>
    </TrainerLayout>
  )
}
