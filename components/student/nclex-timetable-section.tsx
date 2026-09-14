"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useAuth } from "@clerk/nextjs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { MonthlyCalendar, type CalendarEvent } from "@/components/ui/monthly-calendar"
import { Calendar as CalendarIcon, Loader2, AlertCircle, ExternalLink, Link2, Plus, Video, Trash2, Pencil } from "lucide-react"
import { format } from "date-fns"
import { toast } from "sonner"
import type { NclexTimetableEventDTO } from "@/lib/schedule/types"
import {
  NCLEX_SCHEDULE_TIMEZONE_LABEL,
  NCLEX_SCHEDULE_TIMEZONE_LABEL_SHORT,
  adelaideDatetimeLocalValueToUtcIso,
  adelaideMeetingRangeTimeLabel,
  compareAdelaideDatetimeLocalAsc,
} from "@/lib/schedule/adelaide-datetime"

function dtoToCalendarEvents(dtos: NclexTimetableEventDTO[]): CalendarEvent[] {
  return dtos.map((e) => ({
    id: e.id,
    title: e.title,
    course: e.course,
    // yyyy-MM-dd at local noon so calendar cells match the spreadsheet day
    date: new Date(`${e.date}T12:00:00`),
    time: e.time,
    type: e.type,
    color: "dark-grey" as const,
    meeting_link: e.meeting_link ?? null,
    recording_link: e.recording_link ?? null,
  }))
}

const EVENT_TYPES: NclexTimetableEventDTO["type"][] = [
  "lecture",
  "workshop",
  "assessment",
  "exam",
  "lab",
  "due_soon",
  "in_progress",
]

type Props = {
  /** Full schedule page layout vs compact dashboard card */
  variant?: "full" | "compact"
  /** When set, show "Add event" for the selected calendar day (trainer or admin schedule pages). */
  scheduleManagement?: "off" | "trainer" | "admin"
}

function toYyyyMmDd(d: Date) {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}`
}

export function NclexTimetableSection({ variant = "full", scheduleManagement = "off" }: Props) {
  const { getToken } = useAuth()
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())

  const [createOpen, setCreateOpen] = useState(false)
  const [createTitle, setCreateTitle] = useState("")
  const [createType, setCreateType] = useState<NclexTimetableEventDTO["type"]>("lecture")
  const [createCourse, setCreateCourse] = useState("")
  const [createSheet, setCreateSheet] = useState("")
  const [createSubmitting, setCreateSubmitting] = useState(false)
  const [createMeetingLink, setCreateMeetingLink] = useState("")
  const [meetingStartLocal, setMeetingStartLocal] = useState("")
  const [meetingEndLocal, setMeetingEndLocal] = useState("")
  const [generatingMeeting, setGeneratingMeeting] = useState(false)
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null)
  const [savingRecordingEventId, setSavingRecordingEventId] = useState<string | null>(null)
  const [recordingDraftByEventId, setRecordingDraftByEventId] = useState<Record<string, string>>({})
  const [editOpen, setEditOpen] = useState(false)
  const [editingEventId, setEditingEventId] = useState<string | null>(null)
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [editTitle, setEditTitle] = useState("")
  const [editTime, setEditTime] = useState("")
  const [editType, setEditType] = useState<NclexTimetableEventDTO["type"]>("lecture")
  const [editCourse, setEditCourse] = useState("")
  const [editSheet, setEditSheet] = useState("")
  const [editDate, setEditDate] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/schedule/nclex-timetable", { cache: "no-store" })
      const json = await res.json()
      if (!json.success || !Array.isArray(json.events)) {
        setError(json.error || "Could not load timetable")
        setEvents([])
        return
      }
      setEvents(dtoToCalendarEvents(json.events))
    } catch {
      setError("Failed to load timetable")
      setEvents([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const createEndpoint =
    scheduleManagement === "admin"
      ? "/api/admin/schedule/nclex-timetable/events"
      : "/api/trainer/schedule/nclex-timetable/events"

  const generateMeetingEndpoint = (id: string) =>
    scheduleManagement === "admin"
      ? `/api/admin/schedule/nclex-timetable/events/${encodeURIComponent(id)}/generate-meeting`
      : `/api/trainer/schedule/nclex-timetable/events/${encodeURIComponent(id)}/generate-meeting`

  const deleteEndpoint = (id: string) =>
    scheduleManagement === "admin"
      ? `/api/admin/schedule/nclex-timetable/events/${encodeURIComponent(id)}`
      : `/api/trainer/schedule/nclex-timetable/events/${encodeURIComponent(id)}`

  const saveLinksEndpoint = (id: string) =>
    scheduleManagement === "admin"
      ? `/api/admin/schedule/nclex-timetable/events/${encodeURIComponent(id)}`
      : `/api/trainer/schedule/nclex-timetable/events/${encodeURIComponent(id)}/meeting-link`

  const openCreateDialog = () => {
    if (!selectedDate) return
    setCreateTitle("")
    setCreateType("lecture")
    setCreateCourse("")
    setCreateSheet("")
    setCreateMeetingLink("")
    const y = selectedDate.getFullYear()
    const m = String(selectedDate.getMonth() + 1).padStart(2, "0")
    const d = String(selectedDate.getDate()).padStart(2, "0")
    setMeetingStartLocal(`${y}-${m}-${d}T10:00`)
    setMeetingEndLocal(`${y}-${m}-${d}T11:00`)
    setCreateOpen(true)
  }

  const submitCreateEvent = async () => {
    if (!selectedDate || scheduleManagement === "off") return
    const title = createTitle.trim()
    if (!title) {
      toast.error("Enter a title")
      return
    }
    if (!meetingStartLocal || !meetingEndLocal) {
      toast.error("Set meeting start and end — they define the time shown on the calendar")
      return
    }
    if (compareAdelaideDatetimeLocalAsc(meetingStartLocal, meetingEndLocal) >= 0) {
      toast.error("End time must be after start time")
      return
    }
    const time = adelaideMeetingRangeTimeLabel(meetingStartLocal, meetingEndLocal)
    if (!time) {
      toast.error("Invalid meeting start or end")
      return
    }

    setCreateSubmitting(true)
    try {
      const token = await getToken()
      const res = await fetch(createEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          title,
          date: toYyyyMmDd(selectedDate),
          time,
          type: createType,
          ...(createCourse.trim() ? { course: createCourse.trim() } : {}),
          ...(createSheet.trim() ? { sheet: createSheet.trim() } : {}),
          ...(createMeetingLink.trim() ? { meeting_link: createMeetingLink.trim() } : {}),
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || json?.error || "Failed to save event")
      }
      toast.success("Event scheduled")
      setCreateOpen(false)
      await load()
    } catch (e: any) {
      toast.error(e?.message || "Failed to save event")
    } finally {
      setCreateSubmitting(false)
    }
  }

  const generateTeamsForNewEvent = async () => {
    if (!selectedDate || scheduleManagement === "off") return
    const title = createTitle.trim()
    if (!title) {
      toast.error("Enter a title")
      return
    }
    if (!meetingStartLocal || !meetingEndLocal) {
      toast.error("Set meeting start and end for Teams")
      return
    }
    const time = adelaideMeetingRangeTimeLabel(meetingStartLocal, meetingEndLocal)
    if (!time) {
      toast.error("Invalid meeting start or end")
      return
    }
    if (compareAdelaideDatetimeLocalAsc(meetingStartLocal, meetingEndLocal) >= 0) {
      toast.error("End time must be after start time")
      return
    }
    let startIso: string
    let endIso: string
    try {
      startIso = adelaideDatetimeLocalValueToUtcIso(meetingStartLocal)
      endIso = adelaideDatetimeLocalValueToUtcIso(meetingEndLocal)
    } catch {
      toast.error("Invalid meeting start or end")
      return
    }

    setGeneratingMeeting(true)
    try {
      const token = await getToken()
      const createRes = await fetch(createEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          title,
          date: toYyyyMmDd(selectedDate),
          time,
          type: createType,
          ...(createCourse.trim() ? { course: createCourse.trim() } : {}),
          ...(createSheet.trim() ? { sheet: createSheet.trim() } : {}),
        }),
      })
      const createJson = await createRes.json().catch(() => ({}))
      if (!createRes.ok || !createJson?.success) {
        throw new Error(createJson?.message || createJson?.error || "Failed to save event before generating link")
      }
      const eventId = createJson?.data?.id as string | undefined
      if (!eventId) {
        throw new Error("Event saved but response did not include an id")
      }

      const genRes = await fetch(generateMeetingEndpoint(eventId), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          startDateTime: startIso,
          endDateTime: endIso,
          subject: title,
        }),
      })
      const genJson = await genRes.json().catch(() => ({}))
      if (!genRes.ok || !genJson?.success) {
        throw new Error(genJson?.message || genJson?.error || "Failed to generate Teams meeting")
      }
      const joinUrl = genJson?.data?.joinWebUrl ?? genJson?.data?.event?.meeting_link
      if (typeof joinUrl === "string" && joinUrl.trim()) {
        setCreateMeetingLink(joinUrl.trim())
      }
      toast.success("Teams meeting created and linked to this event")
      await load()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to generate Teams meeting"
      toast.error(msg)
    } finally {
      setGeneratingMeeting(false)
    }
  }

  const deleteEvent = async (eventId: string, title: string) => {
    if (scheduleManagement === "off") return
    const confirmed = window.confirm(`Delete "${title}" from the calendar?`)
    if (!confirmed) return

    setDeletingEventId(eventId)
    try {
      const token = await getToken()
      const res = await fetch(deleteEndpoint(eventId), {
        method: "DELETE",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || json?.error || "Failed to delete event")
      }
      toast.success("Event deleted")
      await load()
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete event")
    } finally {
      setDeletingEventId(null)
    }
  }

  const saveRecordingLink = async (eventId: string, meetingLink: string | null, recordingLink: string) => {
    if (scheduleManagement === "off") return
    setSavingRecordingEventId(eventId)
    try {
      const token = await getToken()
      const res = await fetch(saveLinksEndpoint(eventId), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          meeting_link: typeof meetingLink === "string" ? meetingLink : "",
          recording_link: recordingLink,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || json?.error || "Failed to save recording link")
      }
      toast.success("Recording link saved")
      await load()
    } catch (e: any) {
      toast.error(e?.message || "Failed to save recording link")
    } finally {
      setSavingRecordingEventId(null)
    }
  }

  const openEditDialog = (event: CalendarEvent) => {
    const eventDate = new Date(event.date)
    setEditingEventId(event.id)
    setEditTitle(event.title || "")
    setEditTime(event.time || "")
    setEditType(event.type)
    setEditCourse(event.course || "")
    setEditSheet("")
    setEditDate(toYyyyMmDd(eventDate))
    setEditOpen(true)
  }

  const submitEditEvent = async () => {
    if (!editingEventId || scheduleManagement === "off") return
    if (!editTitle.trim() || !editTime.trim() || !editDate.trim()) {
      toast.error("Title, date and time are required")
      return
    }
    setEditSubmitting(true)
    try {
      const token = await getToken()
      const res = await fetch(createEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          id: editingEventId,
          title: editTitle.trim(),
          date: editDate.trim(),
          time: editTime.trim(),
          type: editType,
          ...(editCourse.trim() ? { course: editCourse.trim() } : {}),
          ...(editSheet.trim() ? { sheet: editSheet.trim() } : {}),
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || json?.error || "Failed to update event")
      }
      toast.success("Event updated")
      setEditOpen(false)
      await load()
      if (selectedDate) {
        const [y, m, d] = editDate.split("-").map((v) => parseInt(v, 10))
        if (y && m && d) setSelectedDate(new Date(y, m - 1, d))
      }
    } catch (e: any) {
      toast.error(e?.message || "Failed to update event")
    } finally {
      setEditSubmitting(false)
    }
  }

  const selectedDateEvents = useMemo(() => {
    if (!selectedDate) return []
    return events.filter((event) => {
      const d = new Date(event.date)
      return (
        d.getDate() === selectedDate.getDate() &&
        d.getMonth() === selectedDate.getMonth() &&
        d.getFullYear() === selectedDate.getFullYear()
      )
    })
  }, [events, selectedDate])

  const upcoming = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const end = new Date(today)
    end.setDate(end.getDate() + 21)
    return events
      .filter((e) => {
        const d = new Date(e.date)
        return d >= today && d <= end
      })
      .slice(0, variant === "compact" ? 5 : 12)
  }, [events, variant])

  if (loading) {
    return (
      <Card className={variant === "compact" ? "border-brand-blue/20" : ""}>
        <CardContent className="flex items-center justify-center gap-3 py-12">
          <Loader2 className="h-8 w-8 animate-spin text-brand-blue" />
          <span className="text-muted-foreground">Loading schedule…</span>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-2 py-10 text-center">
          <AlertCircle className="h-10 w-10 text-warning" />
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button variant="outline" size="sm" onClick={load}>
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  const gridClass =
    variant === "compact" ? "grid gap-4 lg:grid-cols-1" : "grid gap-6 lg:grid-cols-3"

  return (
    <div className="space-y-4">
      <div className={gridClass}>
        <div className={variant === "compact" ? "" : "lg:col-span-2"}>
          <Card className="border-brand-blue/15">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <CalendarIcon className="h-5 w-5 text-brand-blue" />
                Schedule
              </CardTitle>
              <CardDescription>
                {variant === "compact"
                  ? "This week across all courses. Select a day for details."
                  : "Shared calendar for all courses. Select a day for details."}
              </CardDescription>
            </CardHeader>
            <CardContent className={variant === "compact" ? "overflow-x-auto pt-0" : ""}>
              <div className={variant === "compact" ? "min-w-0 w-full" : ""}>
                <MonthlyCalendar
                  currentMonth={currentMonth}
                  onMonthChange={setCurrentMonth}
                  events={events}
                  onDateClick={setSelectedDate}
                  viewMode={variant === "compact" ? "week" : "month"}
                  hideLegend={variant === "compact"}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {selectedDate ? format(selectedDate, "EEEE, MMMM d, yyyy") : "Select a date"}
              </CardTitle>
              <CardDescription>
                {selectedDateEvents.length > 0
                  ? `${selectedDateEvents.length} block(s) this day`
                  : "No blocks on this date"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 max-h-[min(60vh,420px)] overflow-y-auto">
              {scheduleManagement !== "off" && selectedDate && (
                <Button type="button" variant="secondary" size="sm" className="w-full gap-2" onClick={openCreateDialog}>
                  <Plus className="h-4 w-4" />
                  Add event for this date
                </Button>
              )}
              {selectedDateEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No entries</p>
              ) : (
                selectedDateEvents.map((ev) => {
                  const link = typeof ev.meeting_link === "string" ? ev.meeting_link.trim() : ""
                  const existingRecordingLink = typeof ev.recording_link === "string" ? ev.recording_link.trim() : ""
                  const draftRecordingLink = recordingDraftByEventId[ev.id] ?? existingRecordingLink
                  const isDeletingThis = deletingEventId === ev.id
                  const isSavingRecordingThis = savingRecordingEventId === ev.id
                  return (
                    <div
                      key={ev.id}
                      className="rounded-lg border border-border/80 p-3 text-sm bg-muted/30"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium leading-snug">{ev.title}</p>
                        {scheduleManagement !== "off" ? (
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => openEditDialog(ev)}
                              title="Edit event"
                              aria-label="Edit event"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => deleteEvent(ev.id, ev.title)}
                              disabled={isDeletingThis}
                              title="Delete event"
                              aria-label="Delete event"
                            >
                              {isDeletingThis ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                            </Button>
                          </div>
                        ) : null}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{ev.time}</p>
                      {link ? (
                        <Button variant="secondary" size="sm" className="mt-2 w-full gap-1.5" asChild>
                          <a href={link} target="_blank" rel="noopener noreferrer" title="Open meeting in a new tab">
                            <Video className="h-4 w-4 shrink-0" />
                            Join meeting
                          </a>
                        </Button>
                      ) : null}
                      {scheduleManagement !== "off" ? (
                        <div className="mt-2 space-y-2">
                          <Label htmlFor={`recording-link-${ev.id}`} className="text-xs text-muted-foreground">
                            Recorded meeting link
                          </Label>
                          <div className="flex items-center gap-2">
                            <Input
                              id={`recording-link-${ev.id}`}
                              placeholder="https://... recording URL"
                              value={draftRecordingLink}
                              onChange={(e) =>
                                setRecordingDraftByEventId((prev) => ({
                                  ...prev,
                                  [ev.id]: e.target.value,
                                }))
                              }
                            />
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={isSavingRecordingThis}
                              onClick={() => saveRecordingLink(ev.id, ev.meeting_link ?? null, draftRecordingLink.trim())}
                            >
                              {isSavingRecordingThis ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                            </Button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Schedule an event</DialogTitle>
            <DialogDescription>
              {selectedDate
                ? `Creates a block on ${format(selectedDate, "MMM d, yyyy")} for the shared NCLEX calendar. The time shown to students comes from meeting start/end below (${NCLEX_SCHEDULE_TIMEZONE_LABEL_SHORT}).`
                : "Pick a date on the calendar first."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <Label htmlFor="nclex-create-title">Title</Label>
              <Input
                id="nclex-create-title"
                placeholder="e.g. Pharmacology review"
                value={createTitle}
                onChange={(e) => setCreateTitle(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nclex-create-type">Type</Label>
              <select
                id="nclex-create-type"
                value={createType}
                onChange={(e) => setCreateType(e.target.value as NclexTimetableEventDTO["type"])}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {EVENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nclex-create-course">Course (optional)</Label>
              <Input
                id="nclex-create-course"
                value={createCourse}
                onChange={(e) => setCreateCourse(e.target.value)}
                placeholder="NCLEX"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nclex-create-sheet">Sheet / notes (optional)</Label>
              <Input id="nclex-create-sheet" value={createSheet} onChange={(e) => setCreateSheet(e.target.value)} />
            </div>

            {scheduleManagement !== "off" && (
              <div className="space-y-3 rounded-lg border border-border/80 bg-muted/20 p-3 pt-3">
                <p className="text-xs font-medium text-foreground flex items-center gap-2">
                  <Link2 className="h-3.5 w-3.5 shrink-0" />
                  Live meeting link (optional)
                </p>
                <p className="text-xs text-muted-foreground">
                  Paste a Teams link, or set start/end below and generate one. Graph env vars and Teams app access policy must be configured.
                  Start and end below are interpreted as {NCLEX_SCHEDULE_TIMEZONE_LABEL} (not your computer&apos;s local zone).
                </p>
                <div className="space-y-1.5">
                  <Label htmlFor="nclex-create-meeting-link">Meeting link</Label>
                  <Input
                    id="nclex-create-meeting-link"
                    placeholder="https://teams.microsoft.com/l/meetup-join/..."
                    value={createMeetingLink}
                    onChange={(e) => setCreateMeetingLink(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="nclex-meeting-start">Teams meeting start ({NCLEX_SCHEDULE_TIMEZONE_LABEL_SHORT})</Label>
                    <Input
                      id="nclex-meeting-start"
                      type="datetime-local"
                      value={meetingStartLocal}
                      onChange={(e) => setMeetingStartLocal(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="nclex-meeting-end">Teams meeting end ({NCLEX_SCHEDULE_TIMEZONE_LABEL_SHORT})</Label>
                    <Input
                      id="nclex-meeting-end"
                      type="datetime-local"
                      value={meetingEndLocal}
                      onChange={(e) => setMeetingEndLocal(e.target.value)}
                    />
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={generateTeamsForNewEvent}
                  disabled={generatingMeeting || createSubmitting || !selectedDate}
                >
                  {generatingMeeting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Generate Teams link
                </Button>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCreateOpen(false)}
              disabled={createSubmitting || generatingMeeting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={submitCreateEvent}
              disabled={createSubmitting || generatingMeeting || !selectedDate}
            >
              {createSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Saving…
                </>
              ) : (
                "Save event"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit event</DialogTitle>
            <DialogDescription>
              Update this schedule block. The time field is {NCLEX_SCHEDULE_TIMEZONE_LABEL}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <Label htmlFor="nclex-edit-title">Title</Label>
              <Input id="nclex-edit-title" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="nclex-edit-date">Date</Label>
                <Input id="nclex-edit-date" type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nclex-edit-time">Time ({NCLEX_SCHEDULE_TIMEZONE_LABEL_SHORT})</Label>
                <Input id="nclex-edit-time" value={editTime} onChange={(e) => setEditTime(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nclex-edit-type">Type</Label>
              <select
                id="nclex-edit-type"
                value={editType}
                onChange={(e) => setEditType(e.target.value as NclexTimetableEventDTO["type"])}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {EVENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nclex-edit-course">Course (optional)</Label>
              <Input id="nclex-edit-course" value={editCourse} onChange={(e) => setEditCourse(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nclex-edit-sheet">Sheet / notes (optional)</Label>
              <Input id="nclex-edit-sheet" value={editSheet} onChange={(e) => setEditSheet(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditOpen(false)} disabled={editSubmitting}>
              Cancel
            </Button>
            <Button type="button" onClick={submitEditEvent} disabled={editSubmitting || !editingEventId}>
              {editSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Saving…
                </>
              ) : (
                "Save changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {variant === "full" && upcoming.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Next few weeks</CardTitle>
            <CardDescription>Upcoming schedule blocks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {upcoming.map((ev) => {
              const link = typeof ev.meeting_link === "string" ? ev.meeting_link.trim() : ""
              return (
                <div
                  key={ev.id}
                  className="flex flex-col gap-2 border-b border-border/60 pb-2 last:border-0"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-sm font-medium">{ev.title}</span>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(ev.date), "MMM d, yyyy")} · {ev.time}
                    </span>
                  </div>
                  {link ? (
                    <Button variant="secondary" size="sm" className="w-full sm:w-fit gap-1.5" asChild>
                      <a href={link} target="_blank" rel="noopener noreferrer" title="Open meeting in a new tab">
                        <Video className="h-4 w-4 shrink-0" />
                        Join meeting
                      </a>
                    </Button>
                  ) : null}
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {variant === "compact" && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            {upcoming.length > 0
              ? `${upcoming.length} block(s) in the next 3 weeks`
              : "Open the full schedule for the complete calendar"}
          </p>
          <Button variant="outline" size="sm" asChild>
            <Link href="/student/schedule">
              Full schedule
              <ExternalLink className="h-3.5 w-3.5 ml-1" />
            </Link>
          </Button>
        </div>
      )}
    </div>
  )
}
