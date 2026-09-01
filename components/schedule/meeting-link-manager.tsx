"use client"

import { useEffect, useMemo, useState } from "react"
import { useAuth } from "@clerk/nextjs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Link2 } from "lucide-react"
import { toast } from "sonner"
import {
  NCLEX_SCHEDULE_TIMEZONE_LABEL,
  NCLEX_SCHEDULE_TIMEZONE_LABEL_SHORT,
  adelaideDatetimeLocalValueToUtcIso,
  compareAdelaideDatetimeLocalAsc,
} from "@/lib/schedule/adelaide-datetime"

type TimetableEvent = {
  id: string
  title: string
  date: string
  time: string
  type: string
  course?: string | null
  sheet?: string | null
  meeting_link?: string | null
  recording_link?: string | null
}

type Props = {
  mode: "admin" | "trainer"
}

export function MeetingLinkManager({ mode }: Props) {
  const { getToken } = useAuth()
  const [events, setEvents] = useState<TimetableEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [selectedId, setSelectedId] = useState<string>("")
  const [meetingLink, setMeetingLink] = useState("")
  const [recordingLink, setRecordingLink] = useState("")
  const [startLocal, setStartLocal] = useState("")
  const [endLocal, setEndLocal] = useState("")

  const listEndpoint =
    mode === "admin"
      ? "/api/admin/schedule/nclex-timetable/events?limit=500"
      : "/api/trainer/schedule/nclex-timetable/events?limit=500"

  const saveEndpoint = (id: string) =>
    mode === "admin"
      ? `/api/admin/schedule/nclex-timetable/events/${id}`
      : `/api/trainer/schedule/nclex-timetable/events/${id}/meeting-link`
  const generateEndpoint = (id: string) =>
    mode === "admin"
      ? `/api/admin/schedule/nclex-timetable/events/${id}/generate-meeting`
      : `/api/trainer/schedule/nclex-timetable/events/${id}/generate-meeting`

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const token = await getToken()
        const res = await fetch(listEndpoint, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        })
        const json = await res.json().catch(() => ({}))
        const rows = Array.isArray(json?.data) ? (json.data as TimetableEvent[]) : []
        if (cancelled) return
        setEvents(rows)
        if (rows.length > 0) {
          setSelectedId(rows[0].id)
          setMeetingLink(rows[0].meeting_link || "")
          setRecordingLink(rows[0].recording_link || "")
          if (rows[0].date) {
            setStartLocal(`${rows[0].date}T10:00`)
            setEndLocal(`${rows[0].date}T11:00`)
          }
        }
      } catch {
        if (!cancelled) setEvents([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [getToken, listEndpoint])

  const selectedEvent = useMemo(() => events.find((e) => e.id === selectedId) || null, [events, selectedId])

  const onSelectEvent = (id: string) => {
    setSelectedId(id)
    const evt = events.find((e) => e.id === id)
    setMeetingLink(evt?.meeting_link || "")
    setRecordingLink(evt?.recording_link || "")
    if (evt?.date) {
      const base = `${evt.date}T10:00`
      const end = `${evt.date}T11:00`
      setStartLocal(base)
      setEndLocal(end)
    }
  }

  const onGenerate = async () => {
    if (!selectedId || !startLocal || !endLocal) {
      toast.error("Please set both start and end time")
      return
    }

    let startIso: string
    let endIso: string
    try {
      startIso = adelaideDatetimeLocalValueToUtcIso(startLocal)
      endIso = adelaideDatetimeLocalValueToUtcIso(endLocal)
    } catch {
      toast.error("Invalid meeting start or end")
      return
    }
    if (compareAdelaideDatetimeLocalAsc(startLocal, endLocal) >= 0) {
      toast.error("End time must be after start time")
      return
    }

    setGenerating(true)
    try {
      const token = await getToken()
      const res = await fetch(generateEndpoint(selectedId), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          startDateTime: startIso,
          endDateTime: endIso,
          subject: selectedEvent?.title || "NCLEX Live Class",
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || json?.error || "Failed to generate Teams meeting")
      }

      const joinUrl = json?.data?.joinWebUrl || json?.data?.event?.meeting_link
      if (typeof joinUrl === "string" && joinUrl.trim()) {
        setMeetingLink(joinUrl.trim())
        setEvents((prev) =>
          prev.map((e) => (e.id === selectedId ? { ...e, meeting_link: joinUrl.trim() } : e))
        )
      }

      toast.success("Teams meeting created and linked")
    } catch (e: any) {
      toast.error(e?.message || "Failed to generate Teams meeting")
    } finally {
      setGenerating(false)
    }
  }

  const onSave = async () => {
    if (!selectedId) return
    setSaving(true)
    try {
      const token = await getToken()
      const res = await fetch(saveEndpoint(selectedId), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ meeting_link: meetingLink, recording_link: recordingLink }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || json?.error || "Failed to update meeting link")
      }

      setEvents((prev) =>
        prev.map((e) =>
          e.id === selectedId
            ? { ...e, meeting_link: meetingLink.trim() || null, recording_link: recordingLink.trim() || null }
            : e
        )
      )
      toast.success("Meeting and resource links updated")
    } catch (e: any) {
      toast.error(e?.message || "Failed to update meeting link")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center gap-3 py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Loading timetable events…</span>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-brand-blue/15 dark:border-brand-blue/25">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Link2 className="h-5 w-5 text-brand-blue" />
          Meeting Link Manager
        </CardTitle>
        <CardDescription>
          Select an event and set its live class link. Students can join only when today&apos;s event has a link. Meeting
          start and end times are in {NCLEX_SCHEDULE_TIMEZONE_LABEL} (not your device&apos;s local timezone).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor={`event-${mode}`}>Event</Label>
          <select
            id={`event-${mode}`}
            value={selectedId}
            onChange={(e) => onSelectEvent(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.date} · {ev.title}
              </option>
            ))}
          </select>
        </div>

        {selectedEvent && (
          <div className="rounded-md border border-border/70 bg-muted/30 p-3 text-xs text-muted-foreground">
            <div className="font-medium text-foreground">{selectedEvent.title}</div>
            <div>
              {selectedEvent.date} · {selectedEvent.time}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor={`meeting-link-${mode}`}>Meeting Link</Label>
          <Input
            id={`meeting-link-${mode}`}
            placeholder="https://teams.microsoft.com/l/meetup-join/..."
            value={meetingLink}
            onChange={(e) => setMeetingLink(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`recording-link-${mode}`}>Recorded Meeting Link</Label>
          <Input
            id={`recording-link-${mode}`}
            placeholder="https://... (recording URL after class)"
            value={recordingLink}
            onChange={(e) => setRecordingLink(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor={`meeting-start-${mode}`}>Meeting start ({NCLEX_SCHEDULE_TIMEZONE_LABEL_SHORT})</Label>
            <Input
              id={`meeting-start-${mode}`}
              type="datetime-local"
              value={startLocal}
              onChange={(e) => setStartLocal(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`meeting-end-${mode}`}>Meeting end ({NCLEX_SCHEDULE_TIMEZONE_LABEL_SHORT})</Label>
            <Input
              id={`meeting-end-${mode}`}
              type="datetime-local"
              value={endLocal}
              onChange={(e) => setEndLocal(e.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onGenerate} disabled={!selectedId || generating}>
            {generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Generate Teams Link
          </Button>
          <Button onClick={onSave} disabled={!selectedId || saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Save Link
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

