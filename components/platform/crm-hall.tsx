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
  CheckCircle2,
  Dices,
  Mail,
  MessageCircle,
  Move,
  Phone,
  Plus,
  Search,
  Send,
  Sparkles,
  TrendingUp,
  Users,
  X,
} from 'lucide-react'
import { DemoAvatar } from '@/components/demo-avatar'
import { DemoClerkAvatarSync } from '@/components/demo-clerk-avatar-sync'
import { DEMO_ACCOUNT_NAME, DEMO_ACCOUNT_SEED } from '@/lib/demo-avatars'
import {
  CRM_ASSIGNEES,
  CRM_COURSE_PRESETS,
  CRM_FILTERS,
  CRM_LEAD_STATUSES,
  CRM_LEAD_STATUS_LABELS,
  CRM_STATUS_FILTERS,
  CRM_VIEWS,
  CRM_WHATSAPP_TEMPLATES,
  DEMO_CRM_LEADS,
  DEMO_INTAKE_ITEMS,
  computeCrmKpis,
  createActivityId,
  createLeadId,
  distributeLeadsEvenly,
  filterMatchesPlatform,
  formatRelative,
  formatStamp,
  intakeMatchesQuery,
  leadBlurb,
  leadMatchesQuery,
  platformLabel,
  platformTone,
  statusTone,
  welcomeEmailSubject,
  welcomeWhatsAppBody,
  type CrmFilter,
  type CrmHallView,
  type CrmLeadStatus,
  type CrmPlatform,
  type DemoCrmLead,
  type DemoIntakeItem,
} from '@/lib/crm/demo-crm'
import { DemoSurface } from './demo-surface'
import s from './crm-hall.module.css'

const COLUMN_W = 300
const COLUMN_GAP = 16
const SIDE_PAD = 48
const INTAKE_W = 420
const INTAKE_GAP = 22
const GRID_W = 1180
const DEFAULT_STORAGE_KEY = 'edtrack-crm-leads-v2'

export type CrmHallProps = {
  backHref?: string
  backLabel?: string
  storageKey?: string
  afterSignOutUrl?: string
  accountLabel?: string
  partnerMode?: boolean
}

type DraftLead = {
  fullName: string
  email: string
  phone: string
  course: string
  education: string
  currentStatus: string
  platform: CrmPlatform
  city: string
  state: string
  country: string
  notes: string
  assignee: string
}

function loadLeads(storageKey: string): DemoCrmLead[] | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(storageKey)
    if (!raw) return null
    const parsed = JSON.parse(raw) as DemoCrmLead[]
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : null
  } catch {
    return null
  }
}

function persistLeads(storageKey: string, leads: DemoCrmLead[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(storageKey, JSON.stringify(leads))
}

function emptyDraft(): DraftLead {
  return {
    fullName: '',
    email: '',
    phone: '',
    course: CRM_COURSE_PRESETS[0]!,
    education: '',
    currentStatus: '',
    platform: 'Direct',
    city: 'Adelaide',
    state: 'SA',
    country: 'Australia',
    notes: '',
    assignee: '',
  }
}

function initials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

export function CrmHall({
  backHref = '/platform',
  backLabel = 'Platform map',
  storageKey = DEFAULT_STORAGE_KEY,
  afterSignOutUrl = '/demo',
  accountLabel = 'CRM & Enquiries',
  partnerMode = false,
}: CrmHallProps) {
  const { user } = useUser()
  const storageKeyRef = useRef(storageKey)
  storageKeyRef.current = storageKey
  const rootRef = useRef<HTMLDivElement>(null)
  const worldRef = useRef<HTMLDivElement>(null)
  const camXRef = useRef(0)
  const didCenterRef = useRef(false)
  const gestureRef = useRef<{
    pointerId: number
    startX: number
    startY: number
    originX: number
    moved: boolean
  } | null>(null)
  const dragRef = useRef<{
    leadId: string
    pointerId: number
    originStatus: CrmLeadStatus
    startX: number
    startY: number
  } | null>(null)

  const [leads, setLeads] = useState<DemoCrmLead[]>(DEMO_CRM_LEADS)
  const [intake] = useState<DemoIntakeItem[]>(DEMO_INTAKE_ITEMS)
  const [hydrated, setHydrated] = useState(false)
  const [filter, setFilter] = useState<CrmFilter>(partnerMode ? 'partner' : 'all')
  const [statusFilter, setStatusFilter] = useState<'all' | CrmLeadStatus>('all')
  const [query, setQuery] = useState('')
  const [view, setView] = useState<CrmHallView>('board')
  const [panning, setPanning] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [dropStatus, setDropStatus] = useState<CrmLeadStatus | null>(null)
  const [settled, setSettled] = useState(false)
  const [viewport, setViewport] = useState({ w: 1200, h: 800 })
  const [camTick, setCamTick] = useState(0)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [composerOpen, setComposerOpen] = useState(false)
  const [distributeOpen, setDistributeOpen] = useState(false)
  const [redistributeAssigned, setRedistributeAssigned] = useState(false)
  const [waOpen, setWaOpen] = useState(false)
  const [waDraft, setWaDraft] = useState('')
  const [draft, setDraft] = useState<DraftLead>(emptyDraft)
  const [toast, setToast] = useState<string | null>(null)
  const [noteDraft, setNoteDraft] = useState('')

  useEffect(() => {
    const stored = loadLeads(storageKey)
    if (stored) setLeads(stored)
    setHydrated(true)
  }, [storageKey])

  useEffect(() => {
    if (!hydrated) return
    persistLeads(storageKeyRef.current, leads)
  }, [leads, hydrated])

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(null), 2200)
    return () => window.clearTimeout(t)
  }, [toast])

  const applyCamera = useCallback(() => {
    const world = worldRef.current
    if (!world) return
    world.style.transform = `translate3d(${camXRef.current}px, 0, 0)`
    setCamTick((n) => n + 1)
  }, [])

  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    const measure = () => {
      const rect = el.getBoundingClientRect()
      setViewport({ w: rect.width, h: rect.height })
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const filteredLeads = useMemo(() => {
    return leads.filter(
      (lead) =>
        filterMatchesPlatform(filter, lead.platform) &&
        (statusFilter === 'all' || lead.status === statusFilter) &&
        leadMatchesQuery(lead, query.trim())
    )
  }, [leads, filter, statusFilter, query])

  const filteredIntake = useMemo(() => {
    return intake.filter((item) => intakeMatchesQuery(item, query.trim()))
  }, [intake, query])

  const kpis = useMemo(() => computeCrmKpis(leads), [leads])
  const unassignedCount = useMemo(
    () => filteredLeads.filter((l) => !l.assignee).length,
    [filteredLeads]
  )

  const selected = useMemo(
    () => (selectedId ? leads.find((l) => l.id === selectedId) ?? null : null),
    [leads, selectedId]
  )

  const countsByStatus = useMemo(() => {
    const map = new Map<CrmLeadStatus, number>()
    for (const status of CRM_LEAD_STATUSES) map.set(status, 0)
    for (const lead of filteredLeads) {
      map.set(lead.status, (map.get(lead.status) ?? 0) + 1)
    }
    return map
  }, [filteredLeads])

  const maxColumnCount = useMemo(() => {
    let max = 1
    for (const n of countsByStatus.values()) max = Math.max(max, n)
    return max
  }, [countsByStatus])

  const worldWidth = useMemo(() => {
    if (view === 'intake') return SIDE_PAD * 2 + INTAKE_W * 2 + INTAKE_GAP
    if (view === 'grid') return SIDE_PAD * 2 + GRID_W
    return (
      SIDE_PAD * 2 +
      CRM_LEAD_STATUSES.length * COLUMN_W +
      (CRM_LEAD_STATUSES.length - 1) * COLUMN_GAP
    )
  }, [view])

  const clampCam = useCallback(
    (x: number) => {
      const minX = Math.min(0, viewport.w - worldWidth)
      return Math.max(minX, Math.min(0, x))
    },
    [viewport.w, worldWidth]
  )

  useEffect(() => {
    if (didCenterRef.current) {
      camXRef.current = clampCam(camXRef.current)
      applyCamera()
      return
    }
    if (viewport.w <= 0) return
    const focusIndex = partnerMode ? 0 : 2
    const focusX =
      view === 'intake' || view === 'grid'
        ? SIDE_PAD + 200
        : SIDE_PAD + focusIndex * (COLUMN_W + COLUMN_GAP) + COLUMN_W / 2
    camXRef.current = clampCam(viewport.w / 2 - focusX)
    applyCamera()
    didCenterRef.current = true
  }, [applyCamera, clampCam, partnerMode, view, viewport.w])

  useEffect(() => {
    didCenterRef.current = false
  }, [view])

  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    const onWheel = (event: WheelEvent) => {
      const target = event.target as HTMLElement | null
      const scrollParent = target?.closest(`.${s.leadList}, .${s.gridWorld}, .${s.drawerBody}, .${s.waThread}`) as
        | HTMLElement
        | null
      if (scrollParent && Math.abs(event.deltaY) >= Math.abs(event.deltaX)) {
        const canScrollDown =
          event.deltaY > 0 &&
          scrollParent.scrollTop + scrollParent.clientHeight < scrollParent.scrollHeight - 1
        const canScrollUp = event.deltaY < 0 && scrollParent.scrollTop > 0
        if (canScrollDown || canScrollUp) return
      }
      event.preventDefault()
      const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY
      camXRef.current = clampCam(camXRef.current - delta)
      setSettled(true)
      applyCamera()
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [applyCamera, clampCam])

  void camTick

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    const target = event.target as HTMLElement
    if (
      target.closest(
        '[data-chrome], [data-drawer], [data-composer], [data-card], [data-modal], [data-wa], [data-grid]'
      )
    ) {
      return
    }
    gestureRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: camXRef.current,
      moved: false,
    }
    rootRef.current?.setPointerCapture(event.pointerId)
  }

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const g = gestureRef.current
    if (!g || g.pointerId !== event.pointerId) return
    const dx = event.clientX - g.startX
    if (!g.moved && Math.abs(dx) < 4) return
    g.moved = true
    setPanning(true)
    setSettled(true)
    camXRef.current = clampCam(g.originX + dx)
    applyCamera()
  }

  const endPan = (event: ReactPointerEvent<HTMLDivElement>) => {
    const g = gestureRef.current
    if (!g || g.pointerId !== event.pointerId) return
    gestureRef.current = null
    setPanning(false)
    try {
      rootRef.current?.releasePointerCapture(event.pointerId)
    } catch {
      /* already released */
    }
  }

  const moveLeadStatus = (leadId: string, status: CrmLeadStatus) => {
    setLeads((prev) =>
      prev.map((lead) => {
        if (lead.id !== leadId || lead.status === status) return lead
        const activity = {
          id: createActivityId(),
          kind: 'status_changed' as const,
          label: `Moved to ${CRM_LEAD_STATUS_LABELS[status]}`,
          at: new Date().toISOString(),
          author: user?.fullName || DEMO_ACCOUNT_NAME,
        }
        return {
          ...lead,
          status,
          lastContactedAt: new Date().toISOString(),
          activities: [activity, ...lead.activities],
        }
      })
    )
    setToast(`Status updated · ${CRM_LEAD_STATUS_LABELS[status]}`)
  }

  const onCardPointerDown = (event: ReactPointerEvent<HTMLButtonElement>, lead: DemoCrmLead) => {
    event.stopPropagation()
    dragRef.current = {
      leadId: lead.id,
      pointerId: event.pointerId,
      originStatus: lead.status,
      startX: event.clientX,
      startY: event.clientY,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const onCardPointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    if (!dragging) {
      const dx = Math.abs(event.clientX - drag.startX)
      const dy = Math.abs(event.clientY - drag.startY)
      if (dx < 8 && dy < 8) return
      setDragging(true)
      setSettled(true)
    }
    const el = document.elementFromPoint(event.clientX, event.clientY)
    const col = el?.closest('[data-status]') as HTMLElement | null
    const status = col?.dataset.status as CrmLeadStatus | undefined
    if (status && (CRM_LEAD_STATUSES as readonly string[]).includes(status)) {
      setDropStatus(status)
    }
  }

  const onCardPointerUp = (event: ReactPointerEvent<HTMLButtonElement>, lead: DemoCrmLead) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    const wasDragging = dragging
    const nextStatus = dropStatus
    dragRef.current = null
    setDragging(false)
    setDropStatus(null)
    try {
      event.currentTarget.releasePointerCapture(event.pointerId)
    } catch {
      /* already released */
    }
    if (wasDragging && nextStatus && nextStatus !== lead.status) {
      moveLeadStatus(lead.id, nextStatus)
      return
    }
    setSelectedId(lead.id)
    setNoteDraft('')
    setWaOpen(false)
  }

  const updateSelected = (patch: Partial<DemoCrmLead>) => {
    if (!selectedId) return
    setLeads((prev) =>
      prev.map((lead) => (lead.id === selectedId ? { ...lead, ...patch } : lead))
    )
  }

  const addNote = () => {
    const text = noteDraft.trim()
    if (!selectedId || !text) return
    const activity = {
      id: createActivityId(),
      kind: 'note' as const,
      label: text,
      at: new Date().toISOString(),
      author: user?.fullName || DEMO_ACCOUNT_NAME,
    }
    setLeads((prev) =>
      prev.map((lead) =>
        lead.id === selectedId
          ? {
              ...lead,
              notes: text,
              activities: [activity, ...lead.activities],
            }
          : lead
      )
    )
    setNoteDraft('')
    setToast('Note saved')
  }

  const logContact = (kind: 'call' | 'email' | 'whatsapp') => {
    if (!selectedId) return
    const labels = {
      call: 'Outbound call logged',
      email: 'Email logged',
      whatsapp: 'WhatsApp message logged',
    } as const
    const activity = {
      id: createActivityId(),
      kind,
      label: labels[kind],
      at: new Date().toISOString(),
      author: user?.fullName || DEMO_ACCOUNT_NAME,
    }
    setLeads((prev) =>
      prev.map((lead) =>
        lead.id === selectedId
          ? {
              ...lead,
              lastContactedAt: activity.at,
              activities: [activity, ...lead.activities],
            }
          : lead
      )
    )
    setToast(labels[kind])
  }

  const createLead = () => {
    const name = draft.fullName.trim()
    const email = draft.email.trim()
    if (!name || !email) {
      setToast('Name and email required')
      return
    }
    const now = new Date().toISOString()
    const lead: DemoCrmLead = {
      id: createLeadId(),
      leadNumber: `AA${Math.floor(2410 + Math.random() * 80)}`,
      fullName: name,
      email,
      phone: draft.phone.trim() || '+61 400 000 000',
      course: draft.course,
      education: draft.education.trim(),
      currentStatus: draft.currentStatus.trim(),
      status: 'new_lead',
      platform: draft.platform,
      source: draft.platform === 'Direct' ? 'Direct Entry' : platformLabel(draft.platform),
      campaign: '',
      adSet: '',
      adName: '',
      formId: '',
      utmSource: draft.platform === 'Direct' ? 'direct' : draft.platform.toLowerCase(),
      utmMedium: 'offline',
      utmCampaign: '',
      gclid: '',
      externalLeadId: '',
      city: draft.city.trim() || 'Adelaide',
      state: draft.state.trim() || 'SA',
      country: draft.country.trim() || 'Australia',
      assignee: draft.assignee || null,
      notes: draft.notes.trim(),
      taskDue: new Date(Date.now() + 4 * 3600000).toISOString(),
      lastContactedAt: null,
      createdAt: now,
      activities: [
        {
          id: createActivityId(),
          kind: 'created',
          label: 'Lead created from CRM hall',
          at: now,
          author: user?.fullName || DEMO_ACCOUNT_NAME,
        },
      ],
      whatsapp: [],
      edbotEmailSent: false,
      edbotWhatsappSent: false,
      sessionOpen: false,
    }
    setLeads((prev) => [lead, ...prev])
    setComposerOpen(false)
    setDraft(emptyDraft())
    setSelectedId(lead.id)
    setView('board')
    setToast(`Added · ${lead.leadNumber}`)
  }

  const runDistribute = () => {
    const next = distributeLeadsEvenly(filteredLeads, CRM_ASSIGNEES, redistributeAssigned)
    const ids = new Set(next.map((l) => l.id))
    setLeads((prev) => prev.map((lead) => (ids.has(lead.id) ? next.find((n) => n.id === lead.id)! : lead)))
    setDistributeOpen(false)
    setRedistributeAssigned(false)
    const count = redistributeAssigned ? filteredLeads.length : unassignedCount
    setToast(`Distributed ${count} lead(s) across ${CRM_ASSIGNEES.length} teammates`)
  }

  const sendWhatsApp = (body: string) => {
    const text = body.trim()
    if (!selectedId || !text) return
    const at = new Date().toISOString()
    setLeads((prev) =>
      prev.map((lead) => {
        if (lead.id !== selectedId) return lead
        return {
          ...lead,
          sessionOpen: true,
          lastContactedAt: at,
          whatsapp: [
            ...lead.whatsapp,
            { id: `wa:${Date.now().toString(36)}`, direction: 'outbound', body: text, at },
          ],
          activities: [
            {
              id: createActivityId(),
              kind: 'whatsapp',
              label: 'WhatsApp message sent',
              at,
              author: user?.fullName || DEMO_ACCOUNT_NAME,
            },
            ...lead.activities,
          ],
        }
      })
    )
    setWaDraft('')
    setToast('WhatsApp sent')
  }

  const filterLabel = CRM_FILTERS.find((f) => f.id === filter)?.label ?? 'All platforms'
  const panelOpen = Boolean(selected && !composerOpen && !distributeOpen && !waOpen)
  const interests = filteredIntake.filter((i) => i.kind === 'interest')
  const eligibility = filteredIntake.filter((i) => i.kind === 'eligibility')
  const draggingId = dragging ? dragRef.current?.leadId ?? null : null
  const noteActivities = selected?.activities.filter((a) => a.kind === 'note') ?? []
  const otherActivities = selected?.activities.filter((a) => a.kind !== 'note') ?? []

  return (
    <DemoSurface>
      <DemoClerkAvatarSync />
      <div
        ref={rootRef}
        className={s.hall}
        data-panning={panning || undefined}
        data-dragging={dragging || undefined}
        data-settled={settled || undefined}
        data-drawer={panelOpen || waOpen ? 'open' : undefined}
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
            <div className={s.viewSwitch} role="group" aria-label="CRM view" data-chrome>
              {CRM_VIEWS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={view === item.id}
                  onClick={() => {
                    setView(item.id)
                    setSelectedId(null)
                    setWaOpen(false)
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              className={s.ghostBtn}
              onClick={() => setDistributeOpen(true)}
              disabled={filteredLeads.length === 0}
            >
              <Dices size={14} aria-hidden />
              Distribute
            </button>

            {view !== 'intake' && (
              <button
                type="button"
                className={s.addBtn}
                onClick={() => {
                  setComposerOpen(true)
                  setSelectedId(null)
                  setWaOpen(false)
                }}
              >
                <Plus size={15} aria-hidden />
                Add lead
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
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search name, email, phone, course…"
                    aria-label="Search leads"
                  />
                </label>

                <div className={s.filters} role="group" aria-label="Platform filters">
                  {CRM_FILTERS.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      aria-pressed={filter === item.id}
                      onClick={() => setFilter(item.id)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                <div className={s.statusSelects} role="group" aria-label="Status filters">
                  {CRM_STATUS_FILTERS.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={s.pill}
                      data-tone={statusFilter === item.id ? 'blue' : undefined}
                      aria-pressed={statusFilter === item.id}
                      onClick={() => setStatusFilter(item.id)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={s.metricsRail} aria-label="CRM metrics">
          <div className={s.metric}>
            <span className={s.metricIcon} data-tone="ink">
              <Users size={15} aria-hidden />
            </span>
            <div className={s.metricMeta}>
              <small>Total leads</small>
              <b>{kpis.total}</b>
            </div>
          </div>
          <div className={s.metric}>
            <span className={s.metricIcon}>
              <TrendingUp size={15} aria-hidden />
            </span>
            <div className={s.metricMeta}>
              <small>New this week</small>
              <b>{kpis.recent7d}</b>
            </div>
          </div>
          <div className={s.metric}>
            <span className={s.metricIcon} data-tone="warm">
              <Sparkles size={15} aria-hidden />
            </span>
            <div className={s.metricMeta}>
              <small>Qualified</small>
              <b>{kpis.qualified}</b>
            </div>
          </div>
          <div className={s.metric}>
            <span className={s.metricIcon} data-tone="green">
              <CheckCircle2 size={15} aria-hidden />
            </span>
            <div className={s.metricMeta}>
              <small>Enrolled</small>
              <b>{kpis.enrolled}</b>
            </div>
          </div>
        </div>

        <div ref={worldRef} className={s.world} style={{ width: worldWidth }}>
          {view === 'board' && (
            <div className={s.stageRow}>
              {CRM_LEAD_STATUSES.map((status) => {
                const columnLeads = filteredLeads.filter((l) => l.status === status)
                const count = countsByStatus.get(status) ?? 0
                return (
                  <section
                    key={status}
                    className={s.column}
                    data-status={status}
                    data-drop={dropStatus === status || undefined}
                  >
                    <div className={s.columnHead}>
                      <span className={s.dot} data-tone={statusTone(status)} />
                      <h3>{CRM_LEAD_STATUS_LABELS[status]}</h3>
                      <small>{count}</small>
                    </div>
                    <div className={s.heat} aria-hidden>
                      <i style={{ transform: `scaleX(${count / maxColumnCount})` }} />
                    </div>
                    <div className={s.leadList}>
                      {columnLeads.length === 0 && <div className={s.empty}>No leads</div>}
                      {columnLeads.map((lead) => (
                        <button
                          key={lead.id}
                          type="button"
                          className={s.card}
                          data-card
                          data-tone={platformTone(lead.platform)}
                          data-selected={selectedId === lead.id || undefined}
                          data-dragging={draggingId === lead.id || undefined}
                          onPointerDown={(e) => onCardPointerDown(e, lead)}
                          onPointerMove={onCardPointerMove}
                          onPointerUp={(e) => onCardPointerUp(e, lead)}
                          onPointerCancel={(e) => onCardPointerUp(e, lead)}
                        >
                          <div className={s.cardTop}>
                            <span className={s.leadNo}>{lead.leadNumber}</span>
                            <span className={s.badge} data-tone={platformTone(lead.platform)}>
                              {platformLabel(lead.platform)}
                            </span>
                          </div>
                          <b>{lead.fullName}</b>
                          <div className={s.cardContact}>
                            <span>{lead.email}</span>
                            <span>{lead.phone}</span>
                          </div>
                          <div className={s.pills}>
                            {lead.course && <span className={s.pill}>{lead.course}</span>}
                            {lead.source && (
                              <span className={s.pill} data-tone={platformTone(lead.platform)}>
                                {lead.source}
                              </span>
                            )}
                          </div>
                          <div className={s.cardFoot}>
                            <span>{lead.assignee ?? 'Unassigned'}</span>
                            <em>{leadBlurb(lead)}</em>
                          </div>
                        </button>
                      ))}
                    </div>
                  </section>
                )
              })}
            </div>
          )}

          {view === 'grid' && (
            <div className={s.gridWorld} data-grid>
              <table className={s.gridTable}>
                <thead>
                  <tr>
                    <th>Lead #</th>
                    <th>Lead</th>
                    <th>Course</th>
                    <th>Source</th>
                    <th>Campaign</th>
                    <th>Assigned</th>
                    <th>Created</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeads.map((lead) => (
                    <tr
                      key={lead.id}
                      onClick={() => {
                        setSelectedId(lead.id)
                        setNoteDraft('')
                        setWaOpen(false)
                      }}
                    >
                      <td>{lead.leadNumber}</td>
                      <td>
                        <div className={s.gridName}>
                          <b>{lead.fullName}</b>
                          <span>
                            {lead.email} · {lead.phone}
                          </span>
                        </div>
                      </td>
                      <td>{lead.course}</td>
                      <td>
                        {platformLabel(lead.platform)}
                        {lead.utmSource ? (
                          <div className={s.cardContact}>
                            <span>
                              {lead.utmSource}/{lead.utmMedium}
                            </span>
                          </div>
                        ) : null}
                      </td>
                      <td>{lead.campaign || '—'}</td>
                      <td>{lead.assignee ?? '—'}</td>
                      <td>{formatStamp(lead.createdAt)}</td>
                      <td>
                        <span className={s.badge} data-tone={statusTone(lead.status)}>
                          {CRM_LEAD_STATUS_LABELS[lead.status]}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {view === 'intake' && (
            <div className={s.intakeRow}>
              <section className={s.intakeLane} data-kind="interest">
                <div className={s.intakeHead}>
                  <small>Pre-enrolment</small>
                  <h3>Course interests</h3>
                  <p>Catalogue interest captures waiting for unlock or guidance.</p>
                </div>
                <div className={s.leadList}>
                  {interests.map((item) => (
                    <div
                      key={item.id}
                      className={s.card}
                      data-tone={item.state === 'unlocked' ? 'green' : 'blue'}
                    >
                      <div className={s.cardTop}>
                        <b>{item.fullName}</b>
                        <span
                          className={s.badge}
                          data-tone={item.state === 'unlocked' ? 'green' : 'blue'}
                        >
                          {item.state}
                        </span>
                      </div>
                      <span className={s.meta}>{item.course}</span>
                      <div className={s.cardFoot}>
                        <span>{item.region}</span>
                        <em>{item.detail}</em>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className={s.intakeLane} data-kind="eligibility">
                <div className={s.intakeHead}>
                  <small>Review queue</small>
                  <h3>Eligibility</h3>
                  <p>Questionnaire outcomes — pending, eligible, or needs review.</p>
                </div>
                <div className={s.leadList}>
                  {eligibility.map((item) => {
                    const tone =
                      item.state === 'eligible'
                        ? 'green'
                        : item.state === 'not_eligible'
                          ? 'warm'
                          : 'blue'
                    return (
                      <div key={item.id} className={s.card} data-tone={tone}>
                        <div className={s.cardTop}>
                          <b>{item.fullName}</b>
                          <span className={s.badge} data-tone={tone}>
                            {item.state.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <span className={s.meta}>{item.course}</span>
                        <div className={s.cardFoot}>
                          <span>{item.region}</span>
                          <em>{item.detail}</em>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            </div>
          )}
        </div>

        <div className={s.hint}>
          <Move size={13} aria-hidden />
          Scroll or drag to pan · Drag cards across stages · Click for detail
        </div>

        {panelOpen && selected && (
          <aside className={s.drawer} data-drawer>
            <div className={s.drawerHead}>
              <div>
                <h2>{selected.fullName}</h2>
                <p>
                  {selected.leadNumber} · {selected.email} · {selected.phone}
                </p>
              </div>
              <button
                type="button"
                className={s.closeBtn}
                aria-label="Close lead detail"
                onClick={() => setSelectedId(null)}
              >
                <X size={16} />
              </button>
            </div>
            <div className={s.drawerBody}>
              <div className={s.actions}>
                <button
                  type="button"
                  data-primary="true"
                  onClick={() => {
                    setWaOpen(true)
                  }}
                >
                  <MessageCircle size={13} aria-hidden />
                  WhatsApp
                </button>
                <button type="button" onClick={() => logContact('call')}>
                  <Phone size={13} aria-hidden />
                  Call
                </button>
                <button type="button" onClick={() => logContact('email')}>
                  <Mail size={13} aria-hidden />
                  Email
                </button>
              </div>

              <div className={s.fieldGrid}>
                <div className={s.field}>
                  <label htmlFor="crm-status">Status</label>
                  <select
                    id="crm-status"
                    value={selected.status}
                    onChange={(e) => moveLeadStatus(selected.id, e.target.value as CrmLeadStatus)}
                  >
                    {CRM_LEAD_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {CRM_LEAD_STATUS_LABELS[status]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={s.field}>
                  <label htmlFor="crm-assignee">Assigned to</label>
                  <select
                    id="crm-assignee"
                    value={selected.assignee ?? ''}
                    onChange={(e) => {
                      const assignee = e.target.value || null
                      updateSelected({
                        assignee,
                        activities: [
                          {
                            id: createActivityId(),
                            kind: 'updated',
                            label: assignee ? `Assigned to ${assignee}` : 'Unassigned',
                            at: new Date().toISOString(),
                            author: user?.fullName || DEMO_ACCOUNT_NAME,
                          },
                          ...selected.activities,
                        ],
                      })
                    }}
                  >
                    <option value="">Unassigned</option>
                    {CRM_ASSIGNEES.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className={s.sectionCard}>
                <h3>Profile</h3>
                <div className={s.kv}>
                  <span>Course</span>
                  <b>{selected.course || '—'}</b>
                  <span>Education</span>
                  <b>{selected.education || '—'}</b>
                  <span>Current status</span>
                  <b>{selected.currentStatus || '—'}</b>
                  <span>Location</span>
                  <b>
                    {[selected.city, selected.state, selected.country].filter(Boolean).join(', ') ||
                      '—'}
                  </b>
                  <span>Created</span>
                  <b>{formatStamp(selected.createdAt)}</b>
                </div>
              </div>

              <div className={s.sectionCard}>
                <h3>Attribution</h3>
                <div className={s.kv}>
                  <span>Lead source</span>
                  <b>{selected.source || '—'}</b>
                  <span>Platform</span>
                  <b>{platformLabel(selected.platform)}</b>
                  <span>Campaign</span>
                  <b>{selected.campaign || '—'}</b>
                  <span>Ad set</span>
                  <b>{selected.adSet || '—'}</b>
                  <span>Ad</span>
                  <b>{selected.adName || '—'}</b>
                  <span>Form ID</span>
                  <b>{selected.formId || '—'}</b>
                  <span>UTM</span>
                  <b>
                    {[selected.utmSource, selected.utmMedium, selected.utmCampaign]
                      .filter(Boolean)
                      .join(' / ') || '—'}
                  </b>
                  <span>GCLID</span>
                  <b>{selected.gclid || '—'}</b>
                  <span>External ID</span>
                  <b>{selected.externalLeadId || '—'}</b>
                </div>
              </div>

              <div className={s.sectionCard}>
                <h3>EdBot messages</h3>
                <div className={s.edbotGrid}>
                  <div className={s.edbotPane}>
                    <header>
                      <span>
                        <Mail size={13} aria-hidden /> Email
                      </span>
                      <span className={s.badge} data-tone={selected.edbotEmailSent ? 'green' : 'warm'}>
                        {selected.edbotEmailSent ? 'Sent' : 'Preview'}
                      </span>
                    </header>
                    <small className={s.meta}>Subject: {welcomeEmailSubject(selected.course)}</small>
                    <div className={s.edbotMail}>
                      Hi {selected.fullName.split(' ')[0]}, we received your enquiry for{' '}
                      {selected.course}. Our admissions team will follow up shortly.
                    </div>
                  </div>
                  <div className={s.edbotPane}>
                    <header>
                      <span>
                        <MessageCircle size={13} aria-hidden /> WhatsApp
                      </span>
                      <span
                        className={s.badge}
                        data-tone={selected.edbotWhatsappSent ? 'green' : 'warm'}
                      >
                        {selected.edbotWhatsappSent ? 'Sent' : 'Preview'}
                      </span>
                    </header>
                    <div className={s.edbotBubble}>
                      {welcomeWhatsAppBody(selected.fullName, selected.course)}
                    </div>
                  </div>
                </div>
              </div>

              <div className={s.field} data-span="2">
                <label htmlFor="crm-note">Notes</label>
                <textarea
                  id="crm-note"
                  value={noteDraft}
                  onChange={(e) => setNoteDraft(e.target.value)}
                  placeholder="Write a follow-up note…"
                />
              </div>
              <div className={s.actions}>
                <button type="button" data-primary="true" onClick={addNote}>
                  Add note
                </button>
              </div>
              {noteActivities.length > 0 && (
                <div className={s.timeline}>
                  {noteActivities.map((event) => (
                    <div key={event.id} className={s.event} data-kind="note">
                      <i aria-hidden />
                      <div>
                        <b>{event.label}</b>
                        <time dateTime={event.at}>
                          {event.author ? `${event.author} · ` : ''}
                          {formatStamp(event.at)}
                        </time>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {selected.notes && (
                <div className={s.sectionCard}>
                  <h3>Legacy notes</h3>
                  <p className={s.meta}>{selected.notes}</p>
                </div>
              )}

              <div className={s.timeline}>
                <h3>Activity</h3>
                {otherActivities.map((event) => (
                  <div key={event.id} className={s.event} data-kind={event.kind}>
                    <i aria-hidden />
                    <div>
                      <b>{event.label}</b>
                      <time dateTime={event.at}>
                        {event.author ? `${event.author} · ` : ''}
                        {formatStamp(event.at)}
                      </time>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        )}

        {waOpen && selected && (
          <aside className={s.waDrawer} data-wa>
            <div className={s.waHead}>
              <div className={s.waAvatar}>{initials(selected.fullName)}</div>
              <div>
                <b>{selected.fullName}</b>
                <small>
                  {selected.phone}
                  {selected.sessionOpen ? ' · Free chat open' : ' · Session closed'}
                </small>
              </div>
              <button
                type="button"
                className={s.waClose}
                aria-label="Close WhatsApp"
                onClick={() => setWaOpen(false)}
              >
                <X size={16} />
              </button>
            </div>
            {!selected.sessionOpen && (
              <div className={s.waBanner}>
                Outside the 24-hour window — send a utility template, then wait for a reply to continue
                free chat.
              </div>
            )}
            <div className={s.waThread}>
              {selected.whatsapp.length === 0 && (
                <div className={s.empty}>No messages yet</div>
              )}
              {selected.whatsapp.map((msg) => (
                <div
                  key={msg.id}
                  className={s.waBubble}
                  data-dir={msg.direction}
                  data-failed={msg.failed || undefined}
                >
                  {msg.body}
                  <time dateTime={msg.at}>{formatRelative(msg.at)}</time>
                </div>
              ))}
            </div>
            <div className={s.waFooter}>
              {!selected.sessionOpen && (
                <div className={s.waTemplates}>
                  {CRM_WHATSAPP_TEMPLATES.map((tpl) => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() =>
                        sendWhatsApp(
                          tpl.id === 'lead_received'
                            ? tpl.preview(selected.fullName.split(' ')[0]!, selected.course)
                            : tpl.preview(selected.fullName.split(' ')[0]!)
                        )
                      }
                    >
                      {tpl.label}
                    </button>
                  ))}
                </div>
              )}
              <div className={s.waCompose}>
                <input
                  value={waDraft}
                  onChange={(e) => setWaDraft(e.target.value)}
                  placeholder={
                    selected.sessionOpen ? 'Type a message…' : 'Use a template while session is closed'
                  }
                  disabled={!selected.sessionOpen}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') sendWhatsApp(waDraft)
                  }}
                />
                <button
                  type="button"
                  aria-label="Send"
                  disabled={!selected.sessionOpen}
                  onClick={() => sendWhatsApp(waDraft)}
                >
                  <Send size={15} />
                </button>
              </div>
            </div>
          </aside>
        )}

        {composerOpen && (
          <div className={s.composer} data-composer>
            <div className={s.composerHead}>
              <b>Add lead</b>
              <button
                type="button"
                className={s.closeBtn}
                aria-label="Close composer"
                onClick={() => setComposerOpen(false)}
              >
                <X size={16} />
              </button>
            </div>
            <div className={s.composerRow}>
              <select
                value={draft.platform}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, platform: e.target.value as CrmPlatform }))
                }
                aria-label="Source platform"
              >
                <option value="Direct">Direct Entry</option>
                <option value="Referred">Referred</option>
                <option value="Website">Website</option>
                <option value="WhatsApp">WhatsApp</option>
              </select>
              <select
                value={draft.assignee}
                onChange={(e) => setDraft((d) => ({ ...d, assignee: e.target.value }))}
                aria-label="Assign to"
              >
                <option value="">Unassigned</option>
                {CRM_ASSIGNEES.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
            <div className={s.composerRow}>
              <input
                value={draft.fullName}
                onChange={(e) => setDraft((d) => ({ ...d, fullName: e.target.value }))}
                placeholder="Full name *"
                aria-label="Full name"
              />
              <input
                value={draft.email}
                onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))}
                placeholder="Email *"
                aria-label="Email"
              />
            </div>
            <div className={s.composerRow}>
              <input
                value={draft.phone}
                onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value }))}
                placeholder="Phone"
                aria-label="Phone"
              />
              <select
                value={draft.course}
                onChange={(e) => setDraft((d) => ({ ...d, course: e.target.value }))}
                aria-label="Course"
              >
                {CRM_COURSE_PRESETS.map((course) => (
                  <option key={course} value={course}>
                    {course}
                  </option>
                ))}
              </select>
            </div>
            <div className={s.composerRow}>
              <input
                value={draft.education}
                onChange={(e) => setDraft((d) => ({ ...d, education: e.target.value }))}
                placeholder="Education"
                aria-label="Education"
              />
              <input
                value={draft.currentStatus}
                onChange={(e) => setDraft((d) => ({ ...d, currentStatus: e.target.value }))}
                placeholder="Current status"
                aria-label="Current status"
              />
            </div>
            <div className={s.composerRow}>
              <input
                value={draft.city}
                onChange={(e) => setDraft((d) => ({ ...d, city: e.target.value }))}
                placeholder="City"
                aria-label="City"
              />
              <input
                value={draft.state}
                onChange={(e) => setDraft((d) => ({ ...d, state: e.target.value }))}
                placeholder="State"
                aria-label="State"
              />
            </div>
            <div className={s.composerActions}>
              <button type="button" onClick={() => setComposerOpen(false)}>
                Cancel
              </button>
              <button type="button" data-primary="true" onClick={createLead}>
                Create lead
              </button>
            </div>
          </div>
        )}

        {distributeOpen && (
          <div className={s.modalScrim} data-modal onClick={() => setDistributeOpen(false)}>
            <div
              className={s.modal}
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <h2>Distribute leads randomly</h2>
              <p>
                Shuffle the current lead list and assign them evenly across marketing teammates.
              </p>
              <p>
                Marketing teammates available: <b>{CRM_ASSIGNEES.length}</b>
                <br />
                Unassigned in this list: <b>{unassignedCount}</b>
              </p>
              <label>
                <input
                  type="checkbox"
                  checked={redistributeAssigned}
                  onChange={(e) => setRedistributeAssigned(e.target.checked)}
                />
                <span>
                  Also reassign leads that already have an owner
                  {redistributeAssigned
                    ? ` — will redistribute all ${filteredLeads.length} leads currently shown.`
                    : ''}
                </span>
              </label>
              <div className={s.modalActions}>
                <button type="button" onClick={() => setDistributeOpen(false)}>
                  Cancel
                </button>
                <button
                  type="button"
                  data-primary="true"
                  onClick={runDistribute}
                  disabled={redistributeAssigned ? filteredLeads.length === 0 : unassignedCount === 0}
                >
                  Distribute
                </button>
              </div>
            </div>
          </div>
        )}

        {toast && <div className={s.toast}>{toast}</div>}
      </div>
    </DemoSurface>
  )
}
