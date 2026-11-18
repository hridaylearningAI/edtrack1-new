'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import Link from 'next/link'
import { UserButton, useUser } from '@clerk/nextjs'
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  MapPin,
  Move,
  Plus,
  Search,
  Trash2,
  Video,
  X,
} from 'lucide-react'
import { DemoAvatar } from '@/components/demo-avatar'
import { DemoClerkAvatarSync } from '@/components/demo-clerk-avatar-sync'
import { DEMO_ACCOUNT_NAME, DEMO_ACCOUNT_SEED } from '@/lib/demo-avatars'
import {
  SCHEDULE_DURATIONS,
  SCHEDULE_FILTERS,
  SCHEDULE_KINDS,
  SCHEDULE_ROOMS,
  SCHEDULE_TITLE_PRESETS,
  SCHEDULE_TRAINERS,
  SCHEDULE_VIEWS,
  buildSessionsForRange,
  createCustomSessionId,
  dateToDayOffset,
  dayOffsetToDate,
  daysInMonth,
  defaultRoomForKind,
  formatDayLabel,
  formatTime,
  kindLabel,
  kindTone,
  mondayIndex,
  monthOffsetToDate,
  sessionBlurb,
  sessionMatchesFilter,
  yearOffsetToDate,
  type ScheduleFilter,
  type ScheduleKind,
  type ScheduleSession,
  type ScheduleView,
} from '@/lib/scheduling/demo-schedule'
import { DemoSurface } from './demo-surface'
import s from './scheduling-hall.module.css'

const DAY_W = 220
const DAY_HEAD = 56
const START_HOUR = 7
const END_HOUR = 20
const BUFFER_DAYS = 1
const GUTTER = 72
const TOP_PAD = 72
const BOTTOM_PAD = 28
const MONTH_W = 460
const YEAR_W = 980
const DEFAULT_STORAGE_KEY = 'edtrack-schedule-custom-v1'

export type SchedulingHallProps = {
  backHref?: string
  backLabel?: string
  storageKey?: string
  afterSignOutUrl?: string
  accountLabel?: string
}

function loadCustomSessions(storageKey: string): ScheduleSession[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(storageKey)
    if (!raw) return []
    const parsed = JSON.parse(raw) as ScheduleSession[]
    return Array.isArray(parsed) ? parsed.filter((item) => item?.id?.startsWith('custom:')) : []
  } catch {
    return []
  }
}

function persistCustomSessions(storageKey: string, sessions: ScheduleSession[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(storageKey, JSON.stringify(sessions))
}

type DraftSession = {
  dayOffset: number
  startMin: number
  title: string
  course: string
  trainer: string
  room: string
  kind: ScheduleKind
  durationMin: number
}

function clampStartMin(startMin: number) {
  const min = START_HOUR * 60
  const max = (END_HOUR - 1) * 60
  return Math.min(max, Math.max(min, startMin))
}

function snapToQuarter(startMin: number) {
  return Math.round(startMin / 15) * 15
}

function clampDuration(startMin: number, durationMin: number) {
  const maxDuration = Math.max(30, END_HOUR * 60 - startMin)
  return Math.min(maxDuration, Math.max(30, durationMin))
}

function makeDraft(dayOffset: number, startMin: number, durationMin = 60): DraftSession {
  const start = clampStartMin(snapToQuarter(startMin))
  return {
    dayOffset,
    startMin: start,
    title: SCHEDULE_TITLE_PRESETS[0]!,
    course: 'Custom campus session',
    trainer: SCHEDULE_TRAINERS[0]!,
    room: defaultRoomForKind('workshop'),
    kind: 'workshop',
    durationMin: clampDuration(start, snapToQuarter(durationMin) || 60),
  }
}

function rangeToDraftTimes(anchorMin: number, edgeMin: number) {
  const a = clampStartMin(snapToQuarter(anchorMin))
  const b = clampStartMin(snapToQuarter(edgeMin))
  const startMin = Math.min(a, b)
  const endMin = Math.max(a, b)
  const durationMin = clampDuration(startMin, Math.max(30, endMin - startMin || 60))
  return { startMin, durationMin }
}

export function SchedulingHall({
  backHref = '/platform',
  backLabel = 'Platform map',
  storageKey = DEFAULT_STORAGE_KEY,
  afterSignOutUrl = '/demo',
  accountLabel = 'Schedule',
}: SchedulingHallProps) {
  const { user } = useUser()
  const now = useMemo(() => new Date(), [])
  const storageKeyRef = useRef(storageKey)
  storageKeyRef.current = storageKey
  const rootRef = useRef<HTMLDivElement>(null)
  const worldRef = useRef<HTMLDivElement>(null)
  const gutterRef = useRef<HTMLDivElement>(null)
  const camXRef = useRef(0)
  const didCenterRef = useRef(false)
  const hourHRef = useRef(48)
  const gestureRef = useRef<{
    pointerId: number
    startX: number
    startY: number
    originX: number
    moved: boolean
    mode: 'undecided' | 'pan' | 'create' | 'ticket'
    sessionId: string | null
    createDay: number | null
    createAnchorMin: number | null
    clientX: number
    clientY: number
  } | null>(null)

  const [filter, setFilter] = useState<ScheduleFilter>('all')
  const [query, setQuery] = useState('')
  const [panning, setPanning] = useState(false)
  const [view, setView] = useState<ScheduleView>('day')
  const viewRef = useRef<ScheduleView>('day')
  viewRef.current = view
  const [creating, setCreating] = useState(false)
  const [resizing, setResizing] = useState(false)
  const [moving, setMoving] = useState(false)
  const [settled, setSettled] = useState(false)
  const [viewport, setViewport] = useState({ w: 1200, h: 800 })
  const [camTick, setCamTick] = useState(0)
  const [selected, setSelected] = useState<ScheduleSession | null>(null)
  const [draft, setDraft] = useState<DraftSession | null>(null)
  const draftRef = useRef<DraftSession | null>(null)
  const [customSessions, setCustomSessions] = useState<ScheduleSession[]>([])
  const [dayRange, setDayRange] = useState({ min: -7, max: 14 })
  const [monthRange, setMonthRange] = useState({ min: -2, max: 3 })
  const [yearRange, setYearRange] = useState({ min: -1, max: 2 })
  const [toast, setToast] = useState<string | null>(null)
  const resizeRef = useRef<{
    pointerId: number
    edge: 'start' | 'end'
    fixedMin: number
  } | null>(null)
  const moveRef = useRef<{
    pointerId: number
    originStartMin: number
    originDay: number
    durationMin: number
    startClientX: number
    startClientY: number
  } | null>(null)

  useEffect(() => {
    setCustomSessions(loadCustomSessions(storageKey))
  }, [storageKey])

  const setDraftState = useCallback((next: DraftSession | null | ((prev: DraftSession | null) => DraftSession | null)) => {
    setDraft((prev) => {
      const value = typeof next === 'function' ? next(prev) : next
      draftRef.current = value
      return value
    })
  }, [])

  const hourH = useMemo(() => {
    const hours = END_HOUR - START_HOUR
    const available = Math.max(320, viewport.h - TOP_PAD - BOTTOM_PAD - DAY_HEAD)
    return Math.min(68, Math.max(36, available / hours))
  }, [viewport.h])
  hourHRef.current = hourH

  const worldHeight = DAY_HEAD + (END_HOUR - START_HOUR) * hourH + 24

  const hourToY = useCallback((hour: number) => DAY_HEAD + (hour - START_HOUR) * hourH, [hourH])
  const minToY = useCallback(
    (startMin: number) => DAY_HEAD + ((startMin - START_HOUR * 60) / 60) * hourH,
    [hourH]
  )
  const durationToH = useCallback(
    (durationMin: number) => Math.max(44, (durationMin / 60) * hourH - 6),
    [hourH]
  )

  const centerForView = useCallback(
    (next: ScheduleView, width: number) => {
      if (next === 'day') {
        camXRef.current = width / 2 - DAY_W / 2 - GUTTER
      } else if (next === 'month') {
        camXRef.current = width / 2 - MONTH_W / 2
      } else {
        camXRef.current = width / 2 - YEAR_W / 2
      }
    },
    []
  )

  const applyCamera = useCallback(() => {
    const world = worldRef.current
    const y = viewRef.current === 'day' ? TOP_PAD : TOP_PAD + 8
    if (world) {
      world.style.transform = `translate3d(${camXRef.current}px, ${y}px, 0)`
    }
    if (gutterRef.current) {
      gutterRef.current.style.transform = `translate3d(0, ${TOP_PAD}px, 0)`
    }
    setCamTick((n) => n + 1)
  }, [])

  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    const measure = () => {
      const rect = el.getBoundingClientRect()
      setViewport({ w: rect.width, h: rect.height })
      if (!didCenterRef.current) {
        didCenterRef.current = true
        centerForView(viewRef.current, rect.width)
        applyCamera()
      }
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [applyCamera, centerForView])

  useEffect(() => {
    applyCamera()
  }, [hourH, applyCamera])

  const switchView = useCallback(
    (next: ScheduleView) => {
      setView(next)
      viewRef.current = next
      setSelected(null)
      setDraftState(null)
      setCreating(false)
      centerForView(next, viewport.w || rootRef.current?.clientWidth || 1200)
      applyCamera()
      setToast(next === 'day' ? 'Day timeline' : next === 'month' ? 'Month wall' : 'Year wall')
    },
    [applyCamera, centerForView, setDraftState, viewport.w]
  )

  useEffect(() => {
    const timer = window.setTimeout(() => setSettled(true), 4200)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 2400)
    return () => window.clearTimeout(timer)
  }, [toast])

  const visible = useMemo(() => {
    void camTick
    const minDay = Math.floor((-camXRef.current - GUTTER - BUFFER_DAYS * DAY_W) / DAY_W)
    const maxDay = Math.ceil((-camXRef.current + viewport.w + BUFFER_DAYS * DAY_W) / DAY_W)
    const minMonth = Math.floor((-camXRef.current - MONTH_W) / MONTH_W)
    const maxMonth = Math.ceil((-camXRef.current + viewport.w + MONTH_W) / MONTH_W)
    const minYear = Math.floor((-camXRef.current - YEAR_W) / YEAR_W)
    const maxYear = Math.ceil((-camXRef.current + viewport.w + YEAR_W) / YEAR_W)
    return { minDay, maxDay, minMonth, maxMonth, minYear, maxYear }
  }, [viewport.w, camTick])

  useEffect(() => {
    setDayRange((prev) => {
      const nextMin = Math.min(prev.min, visible.minDay - 7)
      const nextMax = Math.max(prev.max, visible.maxDay + 7)
      if (nextMin === prev.min && nextMax === prev.max) return prev
      return { min: nextMin, max: nextMax }
    })
  }, [visible.minDay, visible.maxDay])

  useEffect(() => {
    setMonthRange((prev) => {
      const nextMin = Math.min(prev.min, visible.minMonth - 2)
      const nextMax = Math.max(prev.max, visible.maxMonth + 2)
      if (nextMin === prev.min && nextMax === prev.max) return prev
      return { min: nextMin, max: nextMax }
    })
  }, [visible.minMonth, visible.maxMonth])

  useEffect(() => {
    setYearRange((prev) => {
      const nextMin = Math.min(prev.min, visible.minYear - 1)
      const nextMax = Math.max(prev.max, visible.maxYear + 1)
      if (nextMin === prev.min && nextMax === prev.max) return prev
      return { min: nextMin, max: nextMax }
    })
  }, [visible.minYear, visible.maxYear])

  const catalogSpan = useMemo(() => {
    if (view === 'day') return dayRange
    if (view === 'month') {
      const start = monthOffsetToDate(monthRange.min, now)
      const end = monthOffsetToDate(monthRange.max + 1, now)
      end.setDate(0)
      return { min: dateToDayOffset(start, now) - 1, max: dateToDayOffset(end, now) + 1 }
    }
    const start = yearOffsetToDate(yearRange.min, now)
    const end = yearOffsetToDate(yearRange.max + 1, now)
    end.setDate(0)
    return { min: dateToDayOffset(start, now) - 1, max: dateToDayOffset(end, now) + 1 }
  }, [view, dayRange, monthRange, yearRange, now])

  const catalogSessions = useMemo(
    () => buildSessionsForRange(catalogSpan.min, catalogSpan.max, now),
    [catalogSpan.min, catalogSpan.max, now]
  )

  const sessions = useMemo(
    () => [...catalogSessions, ...customSessions].sort((a, b) => a.dayOffset - b.dayOffset || a.startMin - b.startMin),
    [catalogSessions, customSessions]
  )
  const sessionsRef = useRef(sessions)
  sessionsRef.current = sessions

  const q = query.trim().toLowerCase()
  const filtered = useMemo(() => {
    return sessions.filter((session) => {
      if (!sessionMatchesFilter(session, filter)) return false
      if (!q) return true
      return `${session.title} ${session.course} ${session.trainer} ${session.room} ${session.kind}`
        .toLowerCase()
        .includes(q)
    })
  }, [sessions, filter, q])

  const sessionsByDay = useMemo(() => {
    const map = new Map<number, ScheduleSession[]>()
    for (const session of filtered) {
      const list = map.get(session.dayOffset)
      if (list) list.push(session)
      else map.set(session.dayOffset, [session])
    }
    return map
  }, [filtered])

  const days = useMemo(() => {
    const list: number[] = []
    for (let d = visible.minDay; d <= visible.maxDay; d++) list.push(d)
    return list
  }, [visible.minDay, visible.maxDay])

  const hours = useMemo(() => {
    const list: number[] = []
    for (let h = START_HOUR; h <= END_HOUR; h++) list.push(h)
    return list
  }, [])

  const nowMin = now.getHours() * 60 + now.getMinutes()
  const showNow = nowMin >= START_HOUR * 60 && nowMin <= END_HOUR * 60

  const openComposerAt = useCallback(
    (dayOffset: number, startMin: number, durationMin = 60) => {
      setSelected(null)
      setCreating(false)
      setDraftState(makeDraft(dayOffset, startMin, durationMin))
      camXRef.current = viewport.w / 2 - DAY_W / 2 - GUTTER - dayOffset * DAY_W
      applyCamera()
    },
    [applyCamera, viewport.w, setDraftState]
  )

  const openComposerQuick = () => {
    const start = clampStartMin(snapToQuarter(Math.max(nowMin + 30, 10 * 60)))
    openComposerAt(0, start)
  }

  const minutesFromClientY = (clientY: number) => {
    const yInWorld = clientY - TOP_PAD
    const yInDay = yInWorld - DAY_HEAD
    return START_HOUR * 60 + (yInDay / hourHRef.current) * 60
  }

  const slotFromPoint = (clientX: number, clientY: number) => {
    const xInWorld = clientX - camXRef.current
    const dayOffset = Math.floor((xInWorld - GUTTER) / DAY_W)
    const yInDay = clientY - TOP_PAD - DAY_HEAD
    if (yInDay < 0) return null
    return {
      dayOffset,
      startMin: clampStartMin(snapToQuarter(minutesFromClientY(clientY))),
    }
  }

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    const target = event.target as HTMLElement
    if (target.closest('[data-chrome]')) return

    // Month/year boards only pan horizontally (or use dedicated cell buttons).
    if (viewRef.current !== 'day') {
      gestureRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        originX: camXRef.current,
        moved: false,
        mode: 'pan',
        sessionId: null,
        createDay: null,
        createAnchorMin: null,
        clientX: event.clientX,
        clientY: event.clientY,
      }
      setPanning(true)
      setSettled(true)
      event.currentTarget.setPointerCapture(event.pointerId)
      return
    }

    const ticket = target.closest('[data-session-id]') as HTMLElement | null
    gestureRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: camXRef.current,
      moved: false,
      mode: ticket ? 'ticket' : 'undecided',
      sessionId: ticket?.dataset.sessionId ?? null,
      createDay: null,
      createAnchorMin: null,
      clientX: event.clientX,
      clientY: event.clientY,
    }
    setPanning(false)
    setCreating(false)
    setSettled(true)
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const gesture = gestureRef.current
    if (!gesture || gesture.pointerId !== event.pointerId) return

    const dx = event.clientX - gesture.startX
    const dy = event.clientY - gesture.startY
    gesture.clientX = event.clientX
    gesture.clientY = event.clientY

    if (gesture.mode === 'ticket') {
      if (!gesture.moved && Math.abs(dx) > 5) {
        gesture.moved = true
        gesture.mode = 'pan'
        setPanning(true)
      }
      if (gesture.mode === 'pan') {
        camXRef.current = gesture.originX + dx
        applyCamera()
      }
      return
    }

    if (gesture.mode === 'undecided') {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return
      gesture.moved = true

      if (Math.abs(dy) > Math.abs(dx)) {
        const slot = slotFromPoint(gesture.startX, gesture.startY)
        if (!slot) {
          gesture.mode = 'pan'
          setPanning(true)
          camXRef.current = gesture.originX + dx
          applyCamera()
          return
        }
        gesture.mode = 'create'
        gesture.createDay = slot.dayOffset
        gesture.createAnchorMin = slot.startMin
        setSelected(null)
        setCreating(true)
        setPanning(false)
        const edge = minutesFromClientY(event.clientY)
        const times = rangeToDraftTimes(slot.startMin, edge)
        setDraftState(makeDraft(slot.dayOffset, times.startMin, times.durationMin))
        return
      }

      gesture.mode = 'pan'
      setPanning(true)
      camXRef.current = gesture.originX + dx
      applyCamera()
      return
    }

    if (gesture.mode === 'pan') {
      camXRef.current = gesture.originX + dx
      applyCamera()
      return
    }

    if (gesture.mode === 'create' && gesture.createDay != null && gesture.createAnchorMin != null) {
      const edge = minutesFromClientY(event.clientY)
      const times = rangeToDraftTimes(gesture.createAnchorMin, edge)
      setDraftState((prev) =>
        prev
          ? {
              ...prev,
              dayOffset: gesture.createDay!,
              startMin: times.startMin,
              durationMin: times.durationMin,
            }
          : makeDraft(gesture.createDay!, times.startMin, times.durationMin)
      )
    }
  }

  const endPan = (event: ReactPointerEvent<HTMLDivElement>) => {
    const gesture = gestureRef.current
    if (!gesture || gesture.pointerId !== event.pointerId) return
    const snapshot = { ...gesture }
    gestureRef.current = null
    setPanning(false)
    setCreating(false)
    try {
      event.currentTarget.releasePointerCapture(event.pointerId)
    } catch {
      /* already released */
    }

    if (snapshot.mode === 'ticket' || (snapshot.mode === 'pan' && snapshot.sessionId)) {
      if (!snapshot.moved && snapshot.sessionId) {
        const match = sessionsRef.current.find((item) => item.id === snapshot.sessionId)
        if (match) {
          setDraftState(null)
          setSelected(match)
        }
      }
      return
    }

    if (snapshot.mode === 'create') {
      const live = draftRef.current
      if (live) {
        setCreating(false)
        setToast(`Block set · ${formatTime(live.startMin)} · ${live.durationMin} min`)
        camXRef.current = viewport.w / 2 - DAY_W / 2 - GUTTER - live.dayOffset * DAY_W
        applyCamera()
      }
      return
    }

    if (snapshot.mode === 'pan') return

    // Plain tap on empty slot — open composer with a default hour.
    const slot = slotFromPoint(snapshot.clientX, snapshot.clientY)
    if (slot) openComposerAt(slot.dayOffset, slot.startMin, 60)
  }

  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY
      camXRef.current -= delta
      setSettled(true)
      applyCamera()
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [applyCamera])

  const jumpToday = () => {
    camXRef.current = viewport.w / 2 - DAY_W / 2 - GUTTER
    applyCamera()
  }

  const commitCustomSessions = useCallback((next: ScheduleSession[]) => {
    setCustomSessions(next)
    persistCustomSessions(storageKeyRef.current, next)
  }, [])

  const saveDraft = () => {
    if (!draft) return
    const title = draft.title.trim()
    if (title.length < 2) {
      setToast('Give the session a short title first.')
      return
    }
    const session: ScheduleSession = {
      id: createCustomSessionId(),
      title,
      course: draft.course.trim() || 'Custom campus session',
      trainer: draft.trainer,
      room: draft.kind === 'online' ? 'Online' : draft.room,
      kind: draft.kind,
      startMin: draft.startMin,
      durationMin: draft.durationMin,
      dayOffset: draft.dayOffset,
    }
    commitCustomSessions([...customSessions, session])
    setDraftState(null)
    setSelected(session)
    setToast(`Saved “${session.title}” to your schedule.`)
  }

  const removeCustom = (id: string) => {
    commitCustomSessions(customSessions.filter((item) => item.id !== id))
    setSelected(null)
    setToast('Removed from this demo schedule.')
  }

  const onResizePointerDown = (edge: 'start' | 'end', event: ReactPointerEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    event.preventDefault()
    const live = draftRef.current
    if (!live) return
    const endMin = live.startMin + live.durationMin
    resizeRef.current = {
      pointerId: event.pointerId,
      edge,
      fixedMin: edge === 'start' ? endMin : live.startMin,
    }
    setResizing(true)
    setSettled(true)
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const onResizePointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const resize = resizeRef.current
    if (!resize || resize.pointerId !== event.pointerId) return
    const edgeMin = snapToQuarter(minutesFromClientY(event.clientY))
    if (resize.edge === 'end') {
      const times = rangeToDraftTimes(resize.fixedMin, Math.max(resize.fixedMin + 30, edgeMin))
      setDraftState((prev) =>
        prev
          ? { ...prev, startMin: times.startMin, durationMin: times.durationMin }
          : prev
      )
      return
    }
    const times = rangeToDraftTimes(Math.min(resize.fixedMin - 30, edgeMin), resize.fixedMin)
    setDraftState((prev) =>
      prev ? { ...prev, startMin: times.startMin, durationMin: times.durationMin } : prev
    )
  }

  const onResizePointerUp = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const resize = resizeRef.current
    if (!resize || resize.pointerId !== event.pointerId) return
    resizeRef.current = null
    setResizing(false)
    try {
      event.currentTarget.releasePointerCapture(event.pointerId)
    } catch {
      /* already released */
    }
    const live = draftRef.current
    if (live) {
      setToast(`Span · ${formatTime(live.startMin)} – ${formatTime(live.startMin + live.durationMin)}`)
    }
  }

  const onMovePointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    event.preventDefault()
    const live = draftRef.current
    if (!live) return
    moveRef.current = {
      pointerId: event.pointerId,
      originStartMin: live.startMin,
      originDay: live.dayOffset,
      durationMin: live.durationMin,
      startClientX: event.clientX,
      startClientY: event.clientY,
    }
    setMoving(true)
    setSettled(true)
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const onMovePointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const move = moveRef.current
    if (!move || move.pointerId !== event.pointerId) return
    const dy = event.clientY - move.startClientY
    const dx = event.clientX - move.startClientX
    const deltaMin = snapToQuarter((dy / hourHRef.current) * 60)
    const deltaDay = Math.round(dx / DAY_W)
    let nextStart = clampStartMin(snapToQuarter(move.originStartMin + deltaMin))
    const duration = move.durationMin
    const latestStart = Math.max(START_HOUR * 60, END_HOUR * 60 - duration)
    nextStart = Math.min(nextStart, latestStart)
    setDraftState((prev) =>
      prev
        ? {
            ...prev,
            dayOffset: move.originDay + deltaDay,
            startMin: nextStart,
            durationMin: duration,
          }
        : prev
    )
  }

  const onMovePointerUp = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const move = moveRef.current
    if (!move || move.pointerId !== event.pointerId) return
    moveRef.current = null
    setMoving(false)
    try {
      event.currentTarget.releasePointerCapture(event.pointerId)
    } catch {
      /* already released */
    }
    const live = draftRef.current
    if (live) {
      setToast(
        `Moved · ${formatDayLabel(live.dayOffset, now).eyebrow} · ${formatTime(live.startMin)} (${live.durationMin}m)`
      )
    }
  }

  const openDayFromOffset = (dayOffset: number) => {
    setView('day')
    viewRef.current = 'day'
    setSelected(null)
    setDraftState(null)
    camXRef.current = (viewport.w || 1200) / 2 - DAY_W / 2 - GUTTER - dayOffset * DAY_W
    applyCamera()
    setToast(formatDayLabel(dayOffset, now).title)
  }

  const openMonthFromOffset = (monthOffset: number) => {
    setView('month')
    viewRef.current = 'month'
    setSelected(null)
    setDraftState(null)
    camXRef.current = (viewport.w || 1200) / 2 - MONTH_W / 2 - monthOffset * MONTH_W
    applyCamera()
  }

  const nudgeDraftTime = (deltaMin: number) => {
    setDraftState((prev) => {
      if (!prev) return prev
      const latestStart = Math.max(START_HOUR * 60, END_HOUR * 60 - prev.durationMin)
      const nextStart = Math.min(
        latestStart,
        clampStartMin(snapToQuarter(prev.startMin + deltaMin))
      )
      return { ...prev, startMin: nextStart, durationMin: prev.durationMin }
    })
  }

  const nudgeDraftDay = (deltaDay: number) => {
    setDraftState((prev) => (prev ? { ...prev, dayOffset: prev.dayOffset + deltaDay } : prev))
  }

  const filterLabel = SCHEDULE_FILTERS.find((f) => f.id === filter)?.label ?? 'All'
  const selectedDate = selected ? dayOffsetToDate(selected.dayOffset, now) : null
  const isOnline = selected ? selected.kind === 'online' || selected.room === 'Online' : false
  const isCustom = selected?.id.startsWith('custom:') ?? false
  const panelOpen = Boolean((selected || draft) && !creating && view === 'day')

  const countsByDay = useMemo(() => {
    const map = new Map<number, number>()
    for (const session of filtered) {
      map.set(session.dayOffset, (map.get(session.dayOffset) ?? 0) + 1)
    }
    return map
  }, [filtered])

  const months = useMemo(() => {
    const list: number[] = []
    for (let m = visible.minMonth; m <= visible.maxMonth; m++) list.push(m)
    return list
  }, [visible.minMonth, visible.maxMonth])

  const years = useMemo(() => {
    const list: number[] = []
    for (let y = visible.minYear; y <= visible.maxYear; y++) list.push(y)
    return list
  }, [visible.minYear, visible.maxYear])

  return (
    <DemoSurface>
      <DemoClerkAvatarSync />
      <div
        ref={rootRef}
        className={s.hall}
        data-view={view}
        data-panning={panning || undefined}
        data-creating={creating || undefined}
        data-resizing={resizing || undefined}
        data-moving={moving || undefined}
        data-settled={settled || undefined}
        data-drawer={panelOpen ? 'open' : undefined}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPan}
        onPointerCancel={endPan}
      >
        <div className={s.ambient} aria-hidden />

        <div className={s.chrome} data-chrome>
          <Link href={backHref} className={s.backLink}>
            <ArrowLeft size={14} aria-hidden />
            {backLabel}
          </Link>

          <div className={s.chromeRight}>
            <div className={s.viewSwitch} role="group" aria-label="Calendar scale" data-chrome>
              {SCHEDULE_VIEWS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={view === item.id}
                  onClick={() => switchView(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {view === 'day' && (
              <button type="button" className={s.addBtn} onClick={openComposerQuick}>
                <Plus size={15} aria-hidden />
                Add session
              </button>
            )}

            <div className={s.accountMenu}>
              <div className={s.accountPanel}>
                <div className={s.accountHead}>
                  <div className={s.accountMeta}>
                    <b>{user?.fullName || DEMO_ACCOUNT_NAME}</b>
                    <small>
                      {accountLabel} · {filterLabel}
                    </small>
                  </div>
                  <div className={s.accountAvatar}>
                    <DemoAvatar seed={DEMO_ACCOUNT_SEED} name={DEMO_ACCOUNT_NAME} size={36} />
                    <div style={{ position: 'absolute', inset: 0, opacity: 0 }}>
                      <UserButton afterSignOutUrl={afterSignOutUrl} />
                    </div>
                  </div>
                </div>

                <label className={s.accountSearch}>
                  <Search size={14} aria-hidden />
                  <input
                    type="search"
                    placeholder="Search sessions, rooms…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    aria-label="Search schedule"
                  />
                </label>

                <div className={s.filters} role="group" aria-label="Session filters">
                  {SCHEDULE_FILTERS.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={s.filterChip}
                      aria-pressed={filter === item.id}
                      onClick={() => setFilter(item.id)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={s.stage} aria-label="Schedule wall">
          {view === 'day' && (
            <div ref={gutterRef} className={s.timeGutter} style={{ height: worldHeight }} aria-hidden>
              {hours.map((hour) => (
                <div key={hour} className={s.timeLabel} style={{ top: hourToY(hour) }}>
                  {String(hour).padStart(2, '0')}:00
                </div>
              ))}
            </div>
          )}

          <div
            ref={worldRef}
            className={s.world}
            style={{ height: view === 'day' ? worldHeight : Math.max(520, viewport.h - TOP_PAD - 40) }}
          >
            {view === 'day' &&
              days.map((dayOffset) => {
                const label = formatDayLabel(dayOffset, now)
                const daySessions = sessionsByDay.get(dayOffset) ?? []
                const showGhost = draft?.dayOffset === dayOffset
                return (
                  <div
                    key={dayOffset}
                    className={s.dayCol}
                    data-today={dayOffset === 0 || undefined}
                    style={{
                      left: GUTTER + dayOffset * DAY_W,
                      width: DAY_W,
                      height: worldHeight,
                    }}
                  >
                    <div className={s.dayHead}>
                      <small>{label.eyebrow}</small>
                      <strong>{label.title}</strong>
                    </div>

                    {hours.map((hour) => (
                      <div
                        key={`${dayOffset}-${hour}`}
                        className={s.hourLine}
                        style={{ top: hourToY(hour) }}
                        aria-hidden
                      />
                    ))}

                    {dayOffset === 0 && showNow && (
                      <div className={s.nowLine} style={{ top: minToY(nowMin) }} aria-hidden />
                    )}

                    {daySessions.map((session) => (
                      <button
                        key={session.id}
                        type="button"
                        className={s.ticket}
                        data-tone={kindTone(session.kind)}
                        data-session-id={session.id}
                        data-custom={session.id.startsWith('custom:') || undefined}
                        data-active={selected?.id === session.id || undefined}
                        style={{
                          top: minToY(session.startMin),
                          height: durationToH(session.durationMin),
                        }}
                        aria-label={`${session.title} at ${formatTime(session.startMin)} in ${session.room}`}
                      >
                        <time>{formatTime(session.startMin)}</time>
                        <b>{session.title}</b>
                        <span>
                          {session.room} · {session.trainer}
                        </span>
                      </button>
                    ))}

                    {showGhost && draft && (
                      <div
                        className={s.ghost}
                        data-tone={kindTone(draft.kind)}
                        data-resizing={resizing || undefined}
                        data-moving={moving || undefined}
                        style={{
                          top: minToY(draft.startMin),
                          height: durationToH(draft.durationMin),
                        }}
                      >
                        <button
                          type="button"
                          className={s.resizeDot}
                          data-edge="start"
                          data-chrome
                          aria-label="Drag to change duration from the start"
                          onPointerDown={(event) => onResizePointerDown('start', event)}
                          onPointerMove={onResizePointerMove}
                          onPointerUp={onResizePointerUp}
                          onPointerCancel={onResizePointerUp}
                        />
                        <button
                          type="button"
                          className={s.ghostBody}
                          data-chrome
                          aria-label="Drag to move session in time"
                          onPointerDown={onMovePointerDown}
                          onPointerMove={onMovePointerMove}
                          onPointerUp={onMovePointerUp}
                          onPointerCancel={onMovePointerUp}
                        >
                          <time>{formatTime(draft.startMin)}</time>
                          <b>{draft.title || 'New session'}</b>
                          <span>
                            {draft.room} · {draft.durationMin} min
                          </span>
                        </button>
                        <button
                          type="button"
                          className={s.spanHandle}
                          data-chrome
                          aria-label="Drag dots to stretch duration"
                          onPointerDown={(event) => onResizePointerDown('end', event)}
                          onPointerMove={onResizePointerMove}
                          onPointerUp={onResizePointerUp}
                          onPointerCancel={onResizePointerUp}
                        >
                          <i />
                          <i />
                        </button>
                        <button
                          type="button"
                          className={s.resizeDot}
                          data-edge="end"
                          data-chrome
                          aria-label="Drag to change duration from the end"
                          onPointerDown={(event) => onResizePointerDown('end', event)}
                          onPointerMove={onResizePointerMove}
                          onPointerUp={onResizePointerUp}
                          onPointerCancel={onResizePointerUp}
                        />
                      </div>
                    )}
                  </div>
                )
              })}

            {view === 'month' &&
              months.map((monthOffset) => {
                const monthDate = monthOffsetToDate(monthOffset, now)
                const year = monthDate.getFullYear()
                const monthIndex = monthDate.getMonth()
                const totalDays = daysInMonth(year, monthIndex)
                const lead = mondayIndex(new Date(year, monthIndex, 1))
                const monthName = monthDate.toLocaleDateString('en-AU', { month: 'long' })
                const cells: Array<{
                  key: string
                  dayOffset: number | null
                  dayNum: number | null
                  weekend: boolean
                }> = []
                for (let i = 0; i < lead; i++) {
                  cells.push({ key: `pad-${monthOffset}-${i}`, dayOffset: null, dayNum: null, weekend: false })
                }
                let monthTotal = 0
                let busiest = 0
                for (let day = 1; day <= totalDays; day++) {
                  const date = new Date(year, monthIndex, day)
                  const dayOffset = dateToDayOffset(date, now)
                  const count = countsByDay.get(dayOffset) ?? 0
                  monthTotal += count
                  busiest = Math.max(busiest, count)
                  cells.push({
                    key: `d-${monthOffset}-${day}`,
                    dayOffset,
                    dayNum: day,
                    weekend: date.getDay() === 0 || date.getDay() === 6,
                  })
                }
                return (
                  <section
                    key={monthOffset}
                    className={s.monthCard}
                    data-current={monthOffset === 0 || undefined}
                    style={{ left: monthOffset * MONTH_W, width: MONTH_W - 28 }}
                  >
                    <div className={s.monthHalo} aria-hidden />
                    <header className={s.monthHeader}>
                      <div>
                        <small>
                          {monthOffset === 0 ? 'This month' : year}
                          {monthOffset === 0 ? ` · ${year}` : ''}
                        </small>
                        <strong>{monthName}</strong>
                      </div>
                      <div className={s.monthStat}>
                        <b>{monthTotal}</b>
                        <span>sessions</span>
                      </div>
                    </header>
                    <div className={s.monthDow} aria-hidden>
                      {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((dow, index) => (
                        <span key={`${dow}-${index}`} data-weekend={index >= 5 || undefined}>
                          {dow}
                        </span>
                      ))}
                    </div>
                    <div className={s.monthGrid}>
                      {cells.map((cell) => {
                        if (cell.dayOffset == null || cell.dayNum == null) {
                          return <div key={cell.key} className={s.monthCell} data-empty />
                        }
                        const count = countsByDay.get(cell.dayOffset) ?? 0
                        const heat = busiest > 0 ? Math.min(1, count / busiest) : 0
                        return (
                          <button
                            key={cell.key}
                            type="button"
                            className={s.monthCell}
                            data-chrome
                            data-today={cell.dayOffset === 0 || undefined}
                            data-busy={count > 0 || undefined}
                            data-weekend={cell.weekend || undefined}
                            style={
                              count > 0
                                ? {
                                    ['--heat' as string]: String(heat),
                                  }
                                : undefined
                            }
                            onClick={() => openDayFromOffset(cell.dayOffset!)}
                          >
                            <b>{cell.dayNum}</b>
                            {count > 0 ? (
                              <em>
                                <i style={{ width: `${Math.max(18, heat * 100)}%` }} />
                              </em>
                            ) : (
                              <em data-quiet />
                            )}
                            {count > 0 && <small>{count}</small>}
                          </button>
                        )
                      })}
                    </div>
                    <footer className={s.monthFoot}>Tap a day to open its timeline</footer>
                  </section>
                )
              })}

            {view === 'year' &&
              years.map((yearOffset) => {
                const yearDate = yearOffsetToDate(yearOffset, now)
                const year = yearDate.getFullYear()
                const monthStats = Array.from({ length: 12 }, (_, monthIndex) => {
                  const monthDate = new Date(year, monthIndex, 1)
                  const monthOffset =
                    (year - now.getFullYear()) * 12 + (monthIndex - now.getMonth())
                  const start = dateToDayOffset(monthDate, now)
                  const end = start + daysInMonth(year, monthIndex) - 1
                  let count = 0
                  const dayLoads: number[] = []
                  for (let d = start; d <= end; d++) {
                    const c = countsByDay.get(d) ?? 0
                    count += c
                    dayLoads.push(c)
                  }
                  return { monthIndex, monthDate, monthOffset, count, dayLoads, start, end }
                })
                const peak = Math.max(1, ...monthStats.map((item) => item.count))
                const yearTotal = monthStats.reduce((sum, item) => sum + item.count, 0)
                return (
                  <section
                    key={yearOffset}
                    className={s.yearCard}
                    data-current={yearOffset === 0 || undefined}
                    style={{ left: yearOffset * YEAR_W, width: YEAR_W - 32 }}
                  >
                    <div className={s.yearHalo} aria-hidden />
                    <header className={s.yearHeader}>
                      <div>
                        <small>{yearOffset === 0 ? 'This year' : 'Archive year'}</small>
                        <strong>{year}</strong>
                      </div>
                      <div className={s.yearStat}>
                        <b>{yearTotal}</b>
                        <span>sessions across {monthStats.filter((m) => m.count > 0).length} active months</span>
                      </div>
                    </header>
                    <div className={s.yearLanes}>
                      {monthStats.map((item) => {
                        const intensity = item.count / peak
                        return (
                          <button
                            key={`${year}-${item.monthIndex}`}
                            type="button"
                            className={s.yearLane}
                            data-chrome
                            data-current={item.monthOffset === 0 || undefined}
                            data-busy={item.count > 0 || undefined}
                            onClick={() => openMonthFromOffset(item.monthOffset)}
                          >
                            <div className={s.yearLaneMeta}>
                              <b>{item.monthDate.toLocaleDateString('en-AU', { month: 'long' })}</b>
                              <span>{item.count} sessions</span>
                            </div>
                            <div className={s.yearSpark} aria-hidden>
                              {item.dayLoads.map((load, index) => (
                                <i
                                  key={index}
                                  style={{
                                    opacity: load > 0 ? 0.35 + Math.min(0.65, load / 3) : 0.08,
                                    transform: `scaleY(${load > 0 ? 0.35 + Math.min(0.65, load / 3) : 0.18})`,
                                  }}
                                />
                              ))}
                            </div>
                            <div className={s.yearMeter} aria-hidden>
                              <i style={{ width: `${Math.max(8, intensity * 100)}%` }} />
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </section>
                )
              })}
          </div>
        </div>

        {!draft && (
          <div className={s.hint}>
            <Move size={13} aria-hidden />
            {view === 'day'
              ? 'Body moves time · dots change duration · switch Days/Months/Years above'
              : view === 'month'
                ? 'Pan months · tap a date to open the day timeline'
                : 'Pan years · tap a month to zoom into that month'}
          </div>
        )}

        {creating && draft && (
          <div className={s.createBadge} role="status">
            {formatTime(draft.startMin)} – {formatTime(draft.startMin + draft.durationMin)} · {draft.durationMin} min
          </div>
        )}

        {toast && (
          <div className={s.toast} role="status">
            {toast}
          </div>
        )}

        {draft && !creating && (
          <aside className={s.drawer} data-chrome role="dialog" aria-label="Add session">
            <div className={s.drawerTop}>
              <div>
                <small>New session</small>
                <h2>Place on the wall</h2>
              </div>
              <button type="button" className={s.iconClose} onClick={() => setDraftState(null)} aria-label="Close">
                <X size={16} />
              </button>
            </div>

            <p className={s.drawerLead}>
              Drag the dots on the ghost card to set the span, then hit{' '}
              <strong>Save schedule</strong>. Currently{' '}
              <strong>
                {formatDayLabel(draft.dayOffset, now).eyebrow} · {formatTime(draft.startMin)} –{' '}
                {formatTime(draft.startMin + draft.durationMin)}
              </strong>
              .
            </p>

            <div className={s.composerBlock}>
              <span className={s.composerLabel}>Quick titles</span>
              <div className={s.chipRow}>
                {SCHEDULE_TITLE_PRESETS.map((title) => (
                  <button
                    key={title}
                    type="button"
                    className={s.choiceChip}
                    data-active={draft.title === title || undefined}
                    onClick={() => setDraftState((prev) => (prev ? { ...prev, title } : prev))}
                  >
                    {title}
                  </button>
                ))}
              </div>
              <input
                className={s.field}
                value={draft.title}
                onChange={(e) => setDraftState((prev) => (prev ? { ...prev, title: e.target.value } : prev))}
                placeholder="Session title"
                aria-label="Session title"
              />
            </div>

            <div className={s.composerBlock}>
              <span className={s.composerLabel}>Type</span>
              <div className={s.chipRow}>
                {SCHEDULE_KINDS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={s.choiceChip}
                    data-active={draft.kind === item.id || undefined}
                    onClick={() =>
                      setDraftState((prev) =>
                        prev
                          ? {
                              ...prev,
                              kind: item.id,
                              room: defaultRoomForKind(item.id),
                            }
                          : prev
                      )
                    }
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className={s.composerBlock}>
              <span className={s.composerLabel}>When</span>
              <div className={s.nudgeRow}>
                <button type="button" onClick={() => nudgeDraftDay(-1)}>
                  ← Day
                </button>
                <button type="button" onClick={() => nudgeDraftTime(-15)}>
                  −15m
                </button>
                <b>
                  {formatDayLabel(draft.dayOffset, now).title} · {formatTime(draft.startMin)}
                </b>
                <button type="button" onClick={() => nudgeDraftTime(15)}>
                  +15m
                </button>
                <button type="button" onClick={() => nudgeDraftDay(1)}>
                  Day →
                </button>
              </div>
              <div className={s.chipRow}>
                {SCHEDULE_DURATIONS.map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    className={s.choiceChip}
                    data-active={draft.durationMin === mins || undefined}
                    onClick={() => setDraftState((prev) => (prev ? { ...prev, durationMin: mins } : prev))}
                  >
                    {mins}m
                  </button>
                ))}
              </div>
            </div>

            <div className={s.composerBlock}>
              <span className={s.composerLabel}>Room</span>
              <div className={s.chipRow}>
                {SCHEDULE_ROOMS.map((room) => (
                  <button
                    key={room}
                    type="button"
                    className={s.choiceChip}
                    data-active={draft.room === room || undefined}
                    onClick={() =>
                      setDraftState((prev) =>
                        prev
                          ? {
                              ...prev,
                              room,
                              kind: room === 'Online' ? 'online' : prev.kind === 'online' ? 'lecture' : prev.kind,
                            }
                          : prev
                      )
                    }
                  >
                    {room}
                  </button>
                ))}
              </div>
            </div>

            <div className={s.composerBlock}>
              <span className={s.composerLabel}>Lead</span>
              <div className={s.chipRow}>
                {SCHEDULE_TRAINERS.map((trainer) => (
                  <button
                    key={trainer}
                    type="button"
                    className={s.choiceChip}
                    data-active={draft.trainer === trainer || undefined}
                    onClick={() => setDraftState((prev) => (prev ? { ...prev, trainer } : prev))}
                  >
                    {trainer.split(' ')[0]}
                  </button>
                ))}
              </div>
              <div className={s.trainer}>
                <DemoAvatar seed={draft.trainer} name={draft.trainer} size={36} />
                <div>
                  <b>{draft.trainer}</b>
                  <span>Will appear on the ticket</span>
                </div>
              </div>
            </div>

            <div className={s.drawerActions}>
              <button type="button" data-primary="true" onClick={saveDraft}>
                <Check size={14} aria-hidden />
                Save schedule
              </button>
              <button type="button" onClick={() => setDraftState(null)}>
                Cancel
              </button>
            </div>
          </aside>
        )}

        {draft && !creating && (
          <div className={s.saveBar} data-chrome>
            <div>
              <small>Ready to pin</small>
              <b>
                {draft.title || 'New session'} · {formatTime(draft.startMin)} · {draft.durationMin}m
              </b>
            </div>
            <button type="button" onClick={saveDraft}>
              <Check size={14} aria-hidden />
              Save schedule
            </button>
          </div>
        )}

        {selected && selectedDate && !draft && (
          <aside className={s.drawer} data-chrome role="dialog" aria-label={selected.title}>
            <div className={s.drawerTop}>
              <div>
                <small>
                  {kindLabel(selected.kind)}
                  {isCustom ? ' · Added by you' : ''}
                </small>
                <h2>{selected.title}</h2>
              </div>
              <button type="button" className={s.iconClose} onClick={() => setSelected(null)} aria-label="Close">
                <X size={16} />
              </button>
            </div>

            <p className={s.drawerLead}>{sessionBlurb(selected)}</p>

            <div className={s.drawerFacts}>
              <div>
                <CalendarDays size={14} aria-hidden />
                <div>
                  <b>
                    {formatDayLabel(selected.dayOffset, now).eyebrow} · {formatDayLabel(selected.dayOffset, now).title}
                  </b>
                  <span>
                    {formatTime(selected.startMin)} – {formatTime(selected.startMin + selected.durationMin)} ·{' '}
                    {selected.durationMin} min
                  </span>
                </div>
              </div>
              <div>
                <MapPin size={14} aria-hidden />
                <div>
                  <b>{selected.room}</b>
                  <span>{selected.course}</span>
                </div>
              </div>
            </div>

            <div className={s.trainer}>
              <DemoAvatar seed={selected.trainer} name={selected.trainer} size={40} />
              <div>
                <b>{selected.trainer}</b>
                <span>Session lead</span>
              </div>
            </div>

            <div className={s.drawerActions}>
              {isOnline ? (
                <button
                  type="button"
                  data-primary="true"
                  onClick={() => setToast('Demo meeting link opened for this live session.')}
                >
                  <Video size={14} aria-hidden />
                  Join session
                </button>
              ) : (
                <button
                  type="button"
                  data-primary="true"
                  onClick={() => setToast(`Directions noted for ${selected.room}.`)}
                >
                  <MapPin size={14} aria-hidden />
                  View room
                </button>
              )}
              <button type="button" onClick={() => setToast('Added to your demo calendar.')}>
                Add to calendar
              </button>
              {isCustom && (
                <button type="button" data-danger="true" onClick={() => removeCustom(selected.id)}>
                  <Trash2 size={14} aria-hidden />
                  Remove session
                </button>
              )}
              {selected.dayOffset !== 0 && (
                <button
                  type="button"
                  onClick={() => {
                    jumpToday()
                    setSelected(null)
                  }}
                >
                  Jump to today
                  <ArrowRight size={14} aria-hidden />
                </button>
              )}
            </div>
          </aside>
        )}
      </div>
    </DemoSurface>
  )
}
