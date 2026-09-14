"use client"

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react"
import Link from "next/link"
import { format } from "date-fns"

import TrainerLayout from "@/components/trainer/trainer-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MonthlyCalendar, type CalendarEvent } from "@/components/ui/monthly-calendar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

import { useUser } from "@/lib/hooks/useUser"
import { toast } from "sonner"
import type { NclexTimetableEventDTO } from "@/lib/schedule/types"
import { Calendar as CalendarIcon, ClipboardList, Clock, Users, LockOpen, MessageCircle, ShieldAlert } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const NCLEX_COURSE_ID = 45

function dtoToCalendarEvents(dtos: NclexTimetableEventDTO[]): CalendarEvent[] {
  return dtos.map((e) => ({
    id: e.id,
    title: e.title,
    course: e.course,
    date: new Date(`${e.date}T12:00:00`),
    time: e.time,
    type: e.type === "lecture" ? "lecture" : "assessment",
    color: e.type === "lecture" ? "teal" : "dark-grey",
    meeting_link: e.meeting_link ?? null,
  }))
}

type EnrollmentRow = {
  id: number
  student_id: number
  course_id: number
  plan_id?: number | null
  plan_name?: string | null
  plan_key?: string | null
  progress?: number | null
  status?: string | null
  student_name?: string
  student_email?: string
}

function getEnrollmentPlanLabel(e: EnrollmentRow): string {
  const name = e.plan_name?.trim()
  if (name) return name
  const key = e.plan_key?.trim()
  if (key) return key.replace(/_/g, " ")
  return "Unassigned plan"
}

export default function TrainerNclexPage() {
  const { user, isAuthenticated, isLoading, getAccessToken } = useUser()
  const isAdmin = user?.role === "admin"

  // 1) Calendar + lectures
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [eventsLoading, setEventsLoading] = useState(true)
  const [eventsError, setEventsError] = useState<string | null>(null)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())

  const loadTimetable = useCallback(async () => {
    setEventsLoading(true)
    setEventsError(null)
    try {
      const res = await fetch("/api/schedule/nclex-timetable", { cache: "no-store" })
      const json = await res.json()
      if (!json.success || !Array.isArray(json.events)) throw new Error(json.error || "Failed to load timetable")
      setEvents(dtoToCalendarEvents(json.events as NclexTimetableEventDTO[]))
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load timetable"
      setEventsError(msg)
      setEvents([])
    } finally {
      setEventsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadTimetable()
  }, [loadTimetable])

  const selectedDateEvents = useMemo(() => {
    if (!selectedDate) return []
    return events
      .filter((e) => e.type === "lecture")
      .filter((event) => {
        const d = new Date(event.date)
        return d.getDate() === selectedDate.getDate() && d.getMonth() === selectedDate.getMonth() && d.getFullYear() === selectedDate.getFullYear()
      })
      .sort((a, b) => a.time.localeCompare(b.time))
  }, [events, selectedDate])

  const upcomingLectures = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const end = new Date(today)
    end.setDate(end.getDate() + 21)

    return events
      .filter((e) => e.type === "lecture")
      .filter((e) => {
        const d = new Date(e.date)
        return d >= today && d <= end
      })
      .slice(0, 12)
  }, [events])

  // 2) NCLEX module - full unlocked + students categorically
  const [enrollments, setEnrollments] = useState<EnrollmentRow[]>([])
  const [enrollmentsLoading, setEnrollmentsLoading] = useState(false)
  const [enrollmentsError, setEnrollmentsError] = useState<string | null>(null)

  const fetchEnrollments = useCallback(async () => {
    if (!isAuthenticated) return
    setEnrollmentsLoading(true)
    setEnrollmentsError(null)
    try {
      const token = await getAccessToken()
      const res = await fetch(`/api/progress/admin/course-enrollments?courseId=${NCLEX_COURSE_ID}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const json = await res.json()
      if (!json?.success || !Array.isArray(json.data)) throw new Error(json?.message || "Failed to load enrollments")
      setEnrollments(json.data as EnrollmentRow[])
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load enrollments"
      setEnrollmentsError(msg)
      setEnrollments([])
    } finally {
      setEnrollmentsLoading(false)
    }
  }, [getAccessToken, isAuthenticated])

  useEffect(() => {
    fetchEnrollments()
  }, [fetchEnrollments])

  const fullUnlockedEnrollments = useMemo(() => {
    const list = enrollments.filter((e) => (e.progress ?? 0) >= 100 || e.status === "completed")
    return list
  }, [enrollments])

  const completed = useMemo(() => {
    return enrollments.filter((e) => (e.progress ?? 0) >= 100 || e.status === "completed")
  }, [enrollments])

  const inProgress = useMemo(() => {
    return enrollments.filter((e) => (e.progress ?? 0) > 0 && (e.progress ?? 0) < 100 && e.status !== "completed")
  }, [enrollments])

  const notStarted = useMemo(() => {
    return enrollments.filter((e) => (e.progress ?? 0) <= 0)
  }, [enrollments])

  // Unlock all sections
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState<string>("")
  const [unlockAllLoading, setUnlockAllLoading] = useState(false)

  const handleUnlockAllSections = useCallback(async () => {
    if (!isAdmin) {
      toast.error("Admin access required")
      return
    }
    const eid = selectedEnrollmentId ? parseInt(selectedEnrollmentId, 10) : NaN
    if (Number.isNaN(eid)) {
      toast.error("Please select an enrollment")
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
        body: JSON.stringify({ enrollmentId: eid, courseId: NCLEX_COURSE_ID }),
      })
      const json = await res.json()
      if (!json?.success) throw new Error(json?.message || "Unlock failed")
      toast.success(`Unlocked all sections for this enrollment (${json?.data?.sectionsUnlocked ?? 0} sections)`)
      setSelectedEnrollmentId("")
      await fetchEnrollments()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unlock failed"
      toast.error(msg)
    } finally {
      setUnlockAllLoading(false)
    }
  }, [fetchEnrollments, getAccessToken, isAdmin, selectedEnrollmentId])

  if (isLoading || !isAuthenticated) {
    return (
      <TrainerLayout>
        <div className="flex h-64 w-full items-center justify-center">
          <div className="text-center">
            <div className="text-sm text-muted-foreground">Loading…</div>
          </div>
        </div>
      </TrainerLayout>
    )
  }

  return (
    <TrainerLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">NCLEX Trainer</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Calendar, lecture planning, module unlock status, and NCLEX forum moderation.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/trainer/nclex-course">Open full NCLEX course</Link>
            </Button>
            <Badge variant="secondary" className="bg-white/50">
              Course ID: {NCLEX_COURSE_ID}
            </Badge>
            {!isAdmin && (
              <Badge variant="secondary" className="bg-warning-soft text-warning">
                Trainer view: student categories enabled
              </Badge>
            )}
          </div>
        </div>

        {/* 1) Calendar */}
        <Card className="border-brand-blue/15">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-brand-blue" />
              <CardTitle>Calendar</CardTitle>
            </div>
            <CardDescription>NCLEX lecture blocks. Select a day to view details.</CardDescription>
          </CardHeader>
          <CardContent>
            {eventsLoading ? (
              <div className="py-10 text-center text-sm text-muted-foreground">Loading timetable…</div>
            ) : eventsError ? (
              <div className="py-10 text-center">
                <p className="text-sm text-destructive">{eventsError}</p>
                <div className="mt-3">
                  <Button variant="outline" size="sm" onClick={loadTimetable}>
                    Retry
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid gap-4 lg:grid-cols-3">
                <div className="lg:col-span-2">
                  <MonthlyCalendar currentMonth={currentMonth} onMonthChange={setCurrentMonth} events={events} onDateClick={setSelectedDate} />
                </div>
                <div className="lg:col-span-1">
                  <div className="rounded-lg border border-border/80 p-3">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm font-medium text-foreground">
                        {selectedDate ? format(selectedDate, "EEEE, MMMM d, yyyy") : "Select a date"}
                      </p>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {selectedDateEvents.length > 0 ? `${selectedDateEvents.length} lecture block(s) this day` : "No lectures on this day"}
                    </p>
                    <div className="mt-3 space-y-2 max-h-[260px] overflow-y-auto pr-1">
                      {selectedDateEvents.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No entries</p>
                      ) : (
                        selectedDateEvents.map((ev) => (
                          <div key={ev.id} className="rounded-md border border-border/60 bg-muted/30 p-2">
                            <p className="text-sm font-medium leading-snug">{ev.title}</p>
                            <p className="text-xs text-muted-foreground mt-1">{ev.time}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 3) Schedule lectures */}
        <Card className="border-brand-blue/15">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-brand-blue" />
              <CardTitle>Schedule lectures</CardTitle>
            </div>
            <CardDescription>Upcoming lecture blocks (next 3 weeks).</CardDescription>
          </CardHeader>
          <CardContent>
            {eventsLoading ? (
              <div className="py-6 text-center text-sm text-muted-foreground">Loading…</div>
            ) : upcomingLectures.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">No lecture blocks found.</div>
            ) : (
              <div className="space-y-2">
                {upcomingLectures.map((ev) => (
                  <div key={ev.id} className="flex flex-wrap items-baseline justify-between gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
                    <p className="text-sm font-medium">{ev.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(ev.date), "MMM d, yyyy")} · {ev.time}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Mock exam proctoring */}
        <Card className="border-brand-blue/15">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-brand-blue" />
              <CardTitle>Mock exam proctoring</CardTitle>
            </div>
            <CardDescription>
              Review camera look-aways, multiple faces, tab leaves, and terminated mock attempts on a
              dedicated page.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-3">
            <Button asChild className="bg-brand-blue hover:bg-brand-blue/90">
              <Link href="/trainer/nclex/proctoring">
                <ClipboardList className="mr-2 h-4 w-4" />
                Open proctoring dashboard
              </Link>
            </Button>
            <p className="text-sm text-muted-foreground">
              Filter by flagged / terminated / clean and expand per-student detail.
            </p>
          </CardContent>
        </Card>

        {/* 2) NCLEX module - full unlocked */}
        <Card className="border-brand-blue/15">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <LockOpen className="h-5 w-5 text-brand-blue" />
              <CardTitle>NCLEX module - full unlocked</CardTitle>
            </div>
            <CardDescription>
              Track who has full access and optionally unlock everything for an enrollment.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {enrollmentsLoading ? (
              <div className="py-6 text-center text-sm text-muted-foreground">Loading enrollments…</div>
            ) : enrollmentsError ? (
              <div className="py-6 text-center">
                <p className="text-sm text-destructive">{enrollmentsError}</p>
                <div className="mt-3">
                  <Button variant="outline" size="sm" onClick={fetchEnrollments}>
                    Retry
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <Badge variant="secondary" className="bg-success-soft text-success">
                    Fully unlocked: {fullUnlockedEnrollments.length}
                  </Badge>
                  <Badge variant="secondary" className="bg-white/50">
                    Total enrollments: {enrollments.length}
                  </Badge>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Student</TableHead>
                          <TableHead>Plan</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Progress</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {enrollments.slice(0, 8).map((e) => {
                          const ok = (e.progress ?? 0) >= 100 || e.status === "completed"
                          return (
                            <TableRow key={e.id}>
                              <TableCell>
                                <div className="flex flex-col">
                                  <span className="text-sm font-medium">{e.student_name ?? e.student_email ?? `Enrollment #${e.id}`}</span>
                                  <span className="text-xs text-muted-foreground">{e.student_email ?? ""}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="text-xs text-muted-foreground">{getEnrollmentPlanLabel(e)}</div>
                              </TableCell>
                              <TableCell>
                                <Badge variant={ok ? "default" : "secondary"} className={ok ? "" : ""}>
                                  {ok ? "Unlocked" : "Locked"}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                {(e.progress ?? 0).toString()}%
                              </TableCell>
                            </TableRow>
                          )
                        })}
                        {enrollments.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                              No enrollments found for NCLEX.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                    {enrollments.length > 8 && (
                      <p className="mt-2 text-xs text-muted-foreground">Showing first 8 enrollments.</p>
                    )}
                  </div>

                  <div className="rounded-lg border border-border/80 p-4 bg-muted/20">
                    <p className="text-sm font-semibold text-foreground mb-3">Unlock all sections</p>
                    {!isAdmin ? (
                      <div className="rounded-md border border-warning-line/70 bg-warning-soft p-3 text-xs text-warning">
                        Unlock actions are admin-only. Trainers can still view enrolled students and progress categories.
                      </div>
                    ) : (
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Enrollment</label>
                        <Select value={selectedEnrollmentId} onValueChange={setSelectedEnrollmentId}>
                          <SelectTrigger>
                            <SelectValue placeholder={enrollmentsLoading ? "Loading…" : "Select student…"} />
                          </SelectTrigger>
                          <SelectContent>
                            {enrollments.map((e) => (
                              <SelectItem key={e.id} value={String(e.id)}>
                                {e.student_name ?? e.student_email ?? `Enrollment #${e.id}`} · {getEnrollmentPlanLabel(e)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button onClick={handleUnlockAllSections} disabled={unlockAllLoading || !selectedEnrollmentId} className="w-full">
                        {unlockAllLoading ? "Unlocking…" : "Unlock all sections"}
                      </Button>
                      <p className="text-xs text-muted-foreground">
                        For NCLEX, this also ensures extended access requests are approved.
                      </p>
                    </div>
                    )}
                  </div>
                </div>
              </div>
            )
            }
          </CardContent>
        </Card>

        {/* 4) Students pages (categorical) */}
        <Card className="border-brand-blue/15">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-brand-blue" />
              <CardTitle>Students enrolled in NCLEX</CardTitle>
            </div>
            <CardDescription>Categorized by progress.</CardDescription>
          </CardHeader>
          <CardContent>
            {enrollmentsLoading ? (
              <div className="py-6 text-center text-sm text-muted-foreground">Loading…</div>
            ) : (
              <div className="grid gap-4 lg:grid-cols-3">
                <CategoryCard title="Fully unlocked" count={completed.length} color="emerald">
                  {completed.length === 0 ? (
                    <p className="text-sm text-muted-foreground">None</p>
                  ) : (
                    <div className="space-y-2">
                      {completed.slice(0, 5).map((e) => (
                        <div key={e.id} className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
                          <p className="text-sm font-medium">{e.student_name ?? e.student_email}</p>
                          <p className="text-xs text-muted-foreground">{e.student_email ?? ""}</p>
                          <p className="text-[11px] text-brand-blue mt-1">Plan: {getEnrollmentPlanLabel(e)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CategoryCard>
                <CategoryCard title="In progress" count={inProgress.length} color="blue">
                  {inProgress.length === 0 ? (
                    <p className="text-sm text-muted-foreground">None</p>
                  ) : (
                    <div className="space-y-2">
                      {inProgress.slice(0, 5).map((e) => (
                        <div key={e.id} className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
                          <p className="text-sm font-medium">{e.student_name ?? e.student_email}</p>
                          <p className="text-xs text-muted-foreground">
                            {(e.progress ?? 0).toString()}% · {e.status ?? ""}
                          </p>
                          <p className="text-[11px] text-brand-blue mt-1">Plan: {getEnrollmentPlanLabel(e)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CategoryCard>
                <CategoryCard title="Not started" count={notStarted.length} color="amber">
                  {notStarted.length === 0 ? (
                    <p className="text-sm text-muted-foreground">None</p>
                  ) : (
                    <div className="space-y-2">
                      {notStarted.slice(0, 5).map((e) => (
                        <div key={e.id} className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
                          <p className="text-sm font-medium">{e.student_name ?? e.student_email}</p>
                          <p className="text-xs text-muted-foreground">{e.student_email ?? ""}</p>
                          <p className="text-[11px] text-brand-blue mt-1">Plan: {getEnrollmentPlanLabel(e)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CategoryCard>
              </div>
            )
            }
          </CardContent>
        </Card>

        {/* 5) Forums */}
        <Card className="border-brand-blue/15">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-brand-blue" />
              <CardTitle>NCLEX Forums</CardTitle>
            </div>
            <CardDescription>Respond to queries in the NCLEX discussion forum.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Open the dedicated forum page to reply to threads for course {NCLEX_COURSE_ID}.
            </p>
            <Button asChild>
              <Link href="/trainer/nclex/forums">
                Open forums
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </TrainerLayout>
  )
}

function CategoryCard({
  title,
  count,
  color,
  children,
}: {
  title: string
  count: number
  color: "emerald" | "blue" | "amber"
  children: ReactNode
}) {
  const badgeClass =
    color === "emerald"
      ? "bg-success-soft text-success"
      : color === "blue"
        ? "bg-primary-soft text-primary"
        : "bg-warning-soft text-warning"

  return (
    <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <Badge className={badgeClass} variant="secondary">
          {count}
        </Badge>
      </div>
      <div>{children}</div>
    </div>
  )
}

