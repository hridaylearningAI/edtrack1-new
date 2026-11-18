export type ScheduleKind = 'lecture' | 'workshop' | 'lab' | 'clinic' | 'exam' | 'online'

export type ScheduleFilter = 'all' | 'campus' | 'online' | 'lab' | 'clinic'

export type ScheduleView = 'day' | 'month' | 'year'

export const SCHEDULE_VIEWS: { id: ScheduleView; label: string }[] = [
  { id: 'day', label: 'Days' },
  { id: 'month', label: 'Months' },
  { id: 'year', label: 'Years' },
]

export type ScheduleSession = {
  id: string
  title: string
  course: string
  trainer: string
  room: string
  kind: ScheduleKind
  /** Minutes from midnight */
  startMin: number
  durationMin: number
  /** Day offset from today (0 = today) */
  dayOffset: number
}

export const SCHEDULE_FILTERS: { id: ScheduleFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'campus', label: 'Campus' },
  { id: 'online', label: 'Online' },
  { id: 'lab', label: 'Labs' },
  { id: 'clinic', label: 'Clinics' },
]

export const SCHEDULE_KINDS: { id: ScheduleKind; label: string }[] = [
  { id: 'lecture', label: 'Lecture' },
  { id: 'workshop', label: 'Workshop' },
  { id: 'lab', label: 'Lab' },
  { id: 'clinic', label: 'Clinic' },
  { id: 'exam', label: 'Assessment' },
  { id: 'online', label: 'Live online' },
]

export const SCHEDULE_DURATIONS = [30, 45, 60, 90, 120, 180] as const

export const SCHEDULE_ROOMS = [
  'Room 1',
  'Room 3',
  'Studio A',
  'Studio B',
  'Lab 2',
  'Hall 2',
  'Library',
  'Online',
] as const

export const SCHEDULE_TRAINERS = [
  'Dr Sarah Mitchell',
  'James Whitfield',
  'David Park',
  'Priya Nambiar',
  'Hassan Rahman',
  'Amelia Crowe',
] as const

export const SCHEDULE_TITLE_PRESETS = [
  'Ad-hoc coaching',
  'Catch-up tutorial',
  'Skills refresh',
  'Parent briefing',
  'Staff huddle',
  'Mock viva',
] as const

export function defaultRoomForKind(kind: ScheduleKind): string {
  switch (kind) {
    case 'online':
      return 'Online'
    case 'lab':
      return 'Lab 2'
    case 'clinic':
      return 'Studio A'
    case 'exam':
      return 'Online'
    case 'workshop':
      return 'Studio B'
    case 'lecture':
      return 'Room 1'
    default: {
      const _exhaustive: never = kind
      return _exhaustive
    }
  }
}

export function createCustomSessionId() {
  return `custom:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 7)}`
}

type Template = {
  title: string
  course: string
  trainer: string
  room: string
  kind: ScheduleKind
  /** 0 = Mon … 6 = Sun */
  weekday: number
  hour: number
  minute?: number
  durationMin: number
}

const TEMPLATES: Template[] = [
  {
    title: 'ETHTL115 fundamentals',
    course: 'ETHTL115 Fundamentals of Nursing',
    trainer: 'Dr Sarah Mitchell',
    room: 'Room 1',
    kind: 'lecture',
    weekday: 0,
    hour: 9,
    minute: 30,
    durationMin: 90,
  },
  {
    title: 'NCLEX live class',
    course: 'NCLEX-RN Strategies',
    trainer: 'James Whitfield',
    room: 'Online',
    kind: 'online',
    weekday: 0,
    hour: 19,
    durationMin: 90,
  },
  {
    title: 'Clinical skills lab',
    course: 'ETHTL124 Core Clinical Skills',
    trainer: 'Amelia Crowe',
    room: 'Lab 2',
    kind: 'lab',
    weekday: 1,
    hour: 10,
    durationMin: 120,
  },
  {
    title: 'OET Speaking clinic',
    course: 'OET Test Preparation',
    trainer: 'David Park',
    room: 'Online',
    kind: 'clinic',
    weekday: 1,
    hour: 18,
    durationMin: 75,
  },
  {
    title: 'BSBCRT511 critical thinking',
    course: 'BSB50120 Diploma of Business',
    trainer: 'Priya Nambiar',
    room: 'Room 3',
    kind: 'workshop',
    weekday: 2,
    hour: 14,
    durationMin: 90,
  },
  {
    title: 'NGN case study workshop',
    course: 'NCLEX-RN Strategies',
    trainer: 'James Whitfield',
    room: 'Studio B',
    kind: 'workshop',
    weekday: 2,
    hour: 10,
    durationMin: 120,
  },
  {
    title: 'ICT database lab',
    course: 'ICTDBS506 Design databases',
    trainer: 'Hassan Rahman',
    room: 'Lab 2',
    kind: 'lab',
    weekday: 3,
    hour: 14,
    durationMin: 120,
  },
  {
    title: 'OET Listening strategies',
    course: 'OET Test Preparation',
    trainer: 'David Park',
    room: 'Online',
    kind: 'online',
    weekday: 3,
    hour: 18,
    durationMin: 75,
  },
  {
    title: 'Assessment clinic',
    course: 'GNPS clinical',
    trainer: 'Dr Sarah Mitchell',
    room: 'Studio A',
    kind: 'clinic',
    weekday: 4,
    hour: 11,
    durationMin: 60,
  },
  {
    title: 'Manage budgets & plans',
    course: 'BSBFIN501 Manage budgets',
    trainer: 'Priya Nambiar',
    room: 'Hall 2',
    kind: 'lecture',
    weekday: 4,
    hour: 10,
    durationMin: 90,
  },
  {
    title: 'Open study hall',
    course: 'Campus commons',
    trainer: 'Library desk',
    room: 'Library',
    kind: 'workshop',
    weekday: 5,
    hour: 10,
    durationMin: 180,
  },
  {
    title: 'NCLEX mock exam',
    course: 'NCLEX-RN Strategies',
    trainer: 'Proctor desk',
    room: 'Online',
    kind: 'exam',
    weekday: 5,
    hour: 13,
    durationMin: 180,
  },
  {
    title: 'Partner webinar',
    course: 'Partnerships',
    trainer: 'EdTrack One',
    room: 'Online',
    kind: 'online',
    weekday: 6,
    hour: 15,
    durationMin: 60,
  },
]

function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export function dayOffsetToDate(dayOffset: number, now = new Date()) {
  const d = startOfLocalDay(now)
  d.setDate(d.getDate() + dayOffset)
  return d
}

export function dateToDayOffset(date: Date, now = new Date()) {
  const a = startOfLocalDay(now).getTime()
  const b = startOfLocalDay(date).getTime()
  return Math.round((b - a) / 86_400_000)
}

export function monthOffsetToDate(monthOffset: number, now = new Date()) {
  return new Date(now.getFullYear(), now.getMonth() + monthOffset, 1)
}

export function yearOffsetToDate(yearOffset: number, now = new Date()) {
  return new Date(now.getFullYear() + yearOffset, 0, 1)
}

export function daysInMonth(year: number, monthIndex: number) {
  return new Date(year, monthIndex + 1, 0).getDate()
}

/** Monday-first weekday index for calendar grids. */
export function mondayIndex(date: Date) {
  return (date.getDay() + 6) % 7
}

export function formatDayLabel(dayOffset: number, now = new Date()) {
  const d = dayOffsetToDate(dayOffset, now)
  if (dayOffset === 0) return { eyebrow: 'Today', title: d.toLocaleDateString('en-AU', { weekday: 'long' }) }
  if (dayOffset === 1) return { eyebrow: 'Tomorrow', title: d.toLocaleDateString('en-AU', { weekday: 'long' }) }
  if (dayOffset === -1) return { eyebrow: 'Yesterday', title: d.toLocaleDateString('en-AU', { weekday: 'long' }) }
  return {
    eyebrow: d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }),
    title: d.toLocaleDateString('en-AU', { weekday: 'long' }),
  }
}

function weekdayIndex(date: Date) {
  // JS Sun=0 → Mon=0 … Sun=6
  return (date.getDay() + 6) % 7
}

function isCampus(session: ScheduleSession) {
  return session.kind !== 'online' && session.kind !== 'lab' && session.kind !== 'clinic' && session.room !== 'Online'
}

export function sessionMatchesFilter(session: ScheduleSession, filter: ScheduleFilter) {
  switch (filter) {
    case 'all':
      return true
    case 'campus':
      return isCampus(session)
    case 'online':
      return session.kind === 'online' || session.room === 'Online'
    case 'lab':
      return session.kind === 'lab'
    case 'clinic':
      return session.kind === 'clinic'
    default: {
      const _exhaustive: never = filter
      return _exhaustive
    }
  }
}

export function formatTime(startMin: number) {
  const h = Math.floor(startMin / 60)
  const m = startMin % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function kindTone(kind: ScheduleKind): 'blue' | 'green' | 'warm' | 'ink' {
  switch (kind) {
    case 'lecture':
      return 'blue'
    case 'workshop':
      return 'ink'
    case 'lab':
      return 'green'
    case 'clinic':
      return 'warm'
    case 'exam':
      return 'warm'
    case 'online':
      return 'blue'
    default: {
      const _exhaustive: never = kind
      return _exhaustive
    }
  }
}

export function kindLabel(kind: ScheduleKind): string {
  switch (kind) {
    case 'lecture':
      return 'Lecture'
    case 'workshop':
      return 'Workshop'
    case 'lab':
      return 'Lab'
    case 'clinic':
      return 'Clinic'
    case 'exam':
      return 'Assessment'
    case 'online':
      return 'Live online'
    default: {
      const _exhaustive: never = kind
      return _exhaustive
    }
  }
}

export function sessionBlurb(session: ScheduleSession): string {
  switch (session.kind) {
    case 'lecture':
      return `${session.trainer} leads this campus session for ${session.course}. Arrive a few minutes early so the room is ready.`
    case 'workshop':
      return `Hands-on workshop with ${session.trainer}. Bring notes from the previous module — activities run in small groups.`
    case 'lab':
      return `Practical lab in ${session.room}. Wear closed shoes and follow the clinical skills checklist.`
    case 'clinic':
      return `Clinic-style practice with ${session.trainer}. Expect timed role-plays and criteria-based feedback.`
    case 'exam':
      return `Timed assessment for ${session.course}. Ensure your device and ID are ready before the start time.`
    case 'online':
      return `Live online session with ${session.trainer}. Join from the meeting link when the session opens.`
    default: {
      const _exhaustive: never = session.kind
      return _exhaustive
    }
  }
}

/**
 * Build sessions for a contiguous day-offset range.
 * Recurring weekly templates + a few anchored one-offs near today.
 */
export function buildSessionsForRange(minDay: number, maxDay: number, now = new Date()): ScheduleSession[] {
  const sessions: ScheduleSession[] = []

  for (let dayOffset = minDay; dayOffset <= maxDay; dayOffset++) {
    const date = dayOffsetToDate(dayOffset, now)
    const wd = weekdayIndex(date)

    for (const template of TEMPLATES) {
      if (template.weekday !== wd) continue
      const startMin = template.hour * 60 + (template.minute ?? 0)
      sessions.push({
        id: `${dayOffset}:${template.title}:${startMin}`,
        title: template.title,
        course: template.course,
        trainer: template.trainer,
        room: template.room,
        kind: template.kind,
        startMin,
        durationMin: template.durationMin,
        dayOffset,
      })
    }

    // Occasional placement briefing every other Wednesday relative to today
    if (wd === 2 && Math.abs(dayOffset) % 14 < 7) {
      sessions.push({
        id: `${dayOffset}:placement-briefing`,
        title: 'Placement briefing',
        course: 'Clinical placements',
        trainer: 'Campus ops',
        room: 'Hall 2',
        kind: 'lecture',
        startMin: 9 * 60,
        durationMin: 45,
        dayOffset,
      })
    }
  }

  // One-off near-term anchors (from demo timetable seed)
  const anchors: Array<Omit<ScheduleSession, 'id'> & { id?: string }> = [
    {
      dayOffset: 0,
      title: 'Physiological adaptation',
      course: 'NCLEX-RN Strategies',
      trainer: 'James Whitfield',
      room: 'Online',
      kind: 'online',
      startMin: 19 * 60,
      durationMin: 90,
    },
    {
      dayOffset: 2,
      title: 'Psychosocial integrity',
      course: 'NCLEX-RN Strategies',
      trainer: 'James Whitfield',
      room: 'Online',
      kind: 'online',
      startMin: 19 * 60,
      durationMin: 90,
    },
    {
      dayOffset: -1,
      title: 'Team effectiveness due',
      course: 'BSBTWK502',
      trainer: 'Priya Nambiar',
      room: 'Room 3',
      kind: 'workshop',
      startMin: 14 * 60,
      durationMin: 60,
    },
  ]

  for (const anchor of anchors) {
    if (anchor.dayOffset < minDay || anchor.dayOffset > maxDay) continue
    const id = anchor.id ?? `anchor:${anchor.dayOffset}:${anchor.title}`
    if (sessions.some((s) => s.dayOffset === anchor.dayOffset && s.startMin === anchor.startMin && s.title === anchor.title)) {
      continue
    }
    sessions.push({ ...anchor, id })
  }

  return sessions.sort((a, b) => a.dayOffset - b.dayOffset || a.startMin - b.startMin)
}
