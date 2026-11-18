'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { UserButton, useUser } from '@clerk/nextjs'
import {
  Armchair,
  ArrowLeft,
  Building2,
  CalendarClock,
  DoorOpen,
  Fan,
  Monitor,
  Presentation,
  ShieldAlert,
  UserRound,
  UserX,
  Wrench,
  X,
} from 'lucide-react'
import { DemoAvatar } from '@/components/demo-avatar'
import { DemoClerkAvatarSync } from '@/components/demo-clerk-avatar-sync'
import { DEMO_ACCOUNT_NAME, DEMO_ACCOUNT_SEED } from '@/lib/demo-avatars'
import {
  ASSET_CATEGORIES,
  CAMPUS_FLOORS,
  CAMPUS_ROOMS,
  OCCUPANCY_LABEL,
  ROOM_KINDS,
  assetCategoryLabel,
  attendanceCounts,
  computeResourceKpis,
  conditionLabel,
  roomKindLabel,
  seatFillPct,
  sessionSummary,
  type AssetCategory,
  type CampusFloor,
  type CampusRoom,
  type RoomKind,
} from '@/lib/resources/demo-resources'
import { DemoSurface } from './demo-surface'
import s from './resources-hall.module.css'

export type ResourcesHallProps = {
  backHref?: string
  backLabel?: string
  afterSignOutUrl?: string
  accountLabel?: string
}

type KindFilter = RoomKind | 'all'
type AssetFilter = AssetCategory | 'all'

export function ResourcesHall({
  backHref = '/platform',
  backLabel = 'Platform map',
  afterSignOutUrl = '/demo',
  accountLabel = 'Resource Management',
}: ResourcesHallProps) {
  const { user } = useUser()
  const [floor, setFloor] = useState<CampusFloor | 'all'>('all')
  const [kind, setKind] = useState<KindFilter>('all')
  const [assetFilter, setAssetFilter] = useState<AssetFilter>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const kpis = useMemo(() => computeResourceKpis(CAMPUS_ROOMS), [])

  const rooms = useMemo(() => {
    return CAMPUS_ROOMS.filter((room) => {
      if (floor !== 'all' && room.floor !== floor) return false
      if (kind !== 'all' && room.kind !== kind) return false
      return true
    })
  }, [floor, kind])

  const assetTotals = useMemo(() => {
    const source = rooms.flatMap((r) => r.assets)
    const map = new Map<AssetCategory, { qty: number; service: number }>()
    for (const cat of ASSET_CATEGORIES) {
      if (cat.id === 'all') continue
      map.set(cat.id, { qty: 0, service: 0 })
    }
    for (const asset of source) {
      const cur = map.get(asset.category) ?? { qty: 0, service: 0 }
      cur.qty += asset.qty
      if (asset.condition === 'service') cur.service += 1
      map.set(asset.category, cur)
    }
    return map
  }, [rooms])

  const serviceQueue = useMemo(() => {
    return rooms
      .flatMap((room) =>
        room.assets
          .filter((a) => a.condition === 'service' || a.condition === 'fair')
          .map((asset) => ({ room, asset }))
      )
      .slice(0, 6)
  }, [rooms])

  const selected = CAMPUS_ROOMS.find((r) => r.id === selectedId) ?? null

  const inventory = useMemo(() => {
    if (!selected) {
      return rooms
        .flatMap((room) => room.assets.map((asset) => ({ room, asset })))
        .filter(({ asset }) => assetFilter === 'all' || asset.category === assetFilter)
        .slice(0, 12)
    }
    return selected.assets
      .filter((asset) => assetFilter === 'all' || asset.category === assetFilter)
      .map((asset) => ({ room: selected, asset }))
  }, [selected, rooms, assetFilter])

  const floorLabel =
    floor === 'all' ? 'All floors' : CAMPUS_FLOORS.find((f) => f.id === floor)?.label ?? 'Campus'

  const openRoom = (room: CampusRoom) => {
    setSelectedId(room.id)
  }

  const occupancyTone = (status: CampusRoom['occupancy']) => {
    switch (status) {
      case 'free':
        return 'green' as const
      case 'occupied':
        return 'warm' as const
      case 'reserved':
        return 'amber' as const
      case 'maintenance':
        return undefined
      default: {
        const _exhaustive: never = status
        return _exhaustive
      }
    }
  }

  return (
    <DemoSurface>
      <DemoClerkAvatarSync />
      <div className={s.hall}>
        <div className={s.ambient} aria-hidden />

        <div className={s.chrome} data-chrome>
          <Link href={backHref} className={s.backLink}>
            <ArrowLeft size={14} aria-hidden />
            {backLabel}
          </Link>

          <div className={s.metricsRail} aria-label="Campus resource metrics">
            <div className={s.metric}>
              <span className={s.metricIcon} data-tone="green">
                <DoorOpen size={14} aria-hidden />
              </span>
              <div className={s.metricMeta}>
                <small>Rooms free</small>
                <b>
                  {kpis.roomsFree}/{kpis.roomsTotal}
                </b>
              </div>
            </div>
            <div className={s.metric}>
              <span className={s.metricIcon}>
                <Armchair size={14} aria-hidden />
              </span>
              <div className={s.metricMeta}>
                <small>Seats free</small>
                <b>{kpis.seatsFree}</b>
              </div>
            </div>
            <div className={s.metric}>
              <span className={s.metricIcon} data-tone="amber">
                <Building2 size={14} aria-hidden />
              </span>
              <div className={s.metricMeta}>
                <small>Occupancy</small>
                <b>{kpis.occupancyPct}%</b>
              </div>
            </div>
            <div className={s.metric}>
              <span className={s.metricIcon} data-tone="warm">
                <Wrench size={14} aria-hidden />
              </span>
              <div className={s.metricMeta}>
                <small>Needs service</small>
                <b>{kpis.assetsService}</b>
              </div>
            </div>
          </div>

          <div className={s.chromeRight}>
            <div className={s.filterBar} role="group" aria-label="Floor">
              <button
                type="button"
                aria-pressed={floor === 'all'}
                onClick={() => setFloor('all')}
              >
                All
              </button>
              {CAMPUS_FLOORS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={floor === item.id}
                  onClick={() => setFloor(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className={s.accountMenu} data-chrome>
              <div className={s.accountPanel}>
                <div className={s.accountHead}>
                  <div className={s.accountMeta}>
                    <b>{user?.fullName || DEMO_ACCOUNT_NAME}</b>
                    <small>{accountLabel}</small>
                  </div>
                  <div className={s.accountAvatar}>
                    <DemoAvatar
                      seed={user?.id || DEMO_ACCOUNT_SEED}
                      name={user?.fullName || DEMO_ACCOUNT_NAME}
                      size={36}
                    />
                    <div style={{ position: 'absolute', inset: 0, opacity: 0 }}>
                      <UserButton afterSignOutUrl={afterSignOutUrl} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={s.scroll}>
          <div className={s.bento}>
            <div className={s.sectionLabel}>
              <h2>Campus floor</h2>
              <p>
                {rooms.length} spaces · {floorLabel}
              </p>
            </div>

            <div className={s.kindRow}>
              {ROOM_KINDS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={s.kindChip}
                  aria-pressed={kind === item.id}
                  onClick={() => setKind(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className={`${s.span12} ${s.floorPlan}`}>
              {rooms.map((room) => {
                const fill = seatFillPct(room)
                const roll = attendanceCounts(room)
                const session = room.currentSession
                const next = room.nextSession
                return (
                  <button
                    key={room.id}
                    type="button"
                    className={s.roomTile}
                    data-status={room.occupancy}
                    data-selected={selectedId === room.id || undefined}
                    onClick={() => openRoom(room)}
                  >
                    <span className={s.statusDot} data-status={room.occupancy} aria-hidden />
                    <div className={s.roomTop}>
                      <small>
                        {room.code} · {roomKindLabel(room.kind)}
                      </small>
                      <h3>{room.name}</h3>
                    </div>
                    <div className={s.roomMeta}>
                      <span className={s.pill} data-tone={occupancyTone(room.occupancy)}>
                        {OCCUPANCY_LABEL[room.occupancy]}
                      </span>
                      <span className={s.pill}>
                        Seats <strong>{room.occupiedSeats}/{room.capacity}</strong>
                      </span>
                      {roll ? (
                        <span className={s.pill} data-tone={roll.missing > 0 ? 'amber' : 'green'}>
                          Roll <strong>{roll.present}/{roll.expected}</strong>
                        </span>
                      ) : (
                        <span className={s.pill}>
                          Assets <strong>{room.assets.reduce((n, a) => n + a.qty, 0)}</strong>
                        </span>
                      )}
                    </div>
                    <div className={s.seatBar} aria-hidden>
                      <i style={{ width: `${fill}%` }} />
                    </div>
                    <div className={s.sessionBlock}>
                      {session ? (
                        <>
                          <p className={s.roomNow}>
                            <UserRound size={11} aria-hidden /> {session.trainer}
                          </p>
                          <p className={s.sessionMeta}>
                            {session.title} · {session.startsAt}–{session.endsAt} (
                            {session.durationLabel})
                          </p>
                        </>
                      ) : (
                        <p className={s.roomNow}>{sessionSummary(room)}</p>
                      )}
                      <p className={s.nextLine}>
                        <CalendarClock size={11} aria-hidden />
                        {next
                          ? `Next · ${next.title} ${next.startsAt}`
                          : 'No schedule lined up after'}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>

            <div className={s.sectionLabel}>
              <h2>Physical inventory</h2>
              <p>Seats, boards, fans, AV, lab gear — everything on campus</p>
            </div>

            <div className={`${s.panel} ${s.span12}`}>
              <div className={s.panelHead}>
                <div>
                  <h3>Asset categories</h3>
                  <p>Totals across the filtered floor plan</p>
                </div>
                <div className={s.legend}>
                  <span>
                    <i style={{ background: 'var(--green)' }} /> Free
                  </span>
                  <span>
                    <i style={{ background: 'var(--warm)' }} /> Occupied
                  </span>
                  <span>
                    <i style={{ background: 'var(--amber)' }} /> Reserved
                  </span>
                  <span>
                    <i style={{ background: 'var(--muted)' }} /> Maintenance
                  </span>
                </div>
              </div>
              <div className={s.assetStrip}>
                {ASSET_CATEGORIES.filter((c) => c.id !== 'all').map((cat) => {
                  const totals = assetTotals.get(cat.id) ?? { qty: 0, service: 0 }
                  const Icon =
                    cat.id === 'seating'
                      ? Armchair
                      : cat.id === 'board'
                        ? Presentation
                        : cat.id === 'av'
                          ? Monitor
                          : cat.id === 'climate'
                            ? Fan
                            : cat.id === 'safety'
                              ? ShieldAlert
                              : Building2
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      className={s.assetCat}
                      aria-pressed={assetFilter === cat.id}
                      onClick={() =>
                        setAssetFilter((prev) => (prev === cat.id ? 'all' : cat.id))
                      }
                    >
                      <small>
                        <Icon size={11} style={{ verticalAlign: -1, marginRight: 4 }} />
                        {cat.label}
                      </small>
                      <b>{totals.qty}</b>
                      <span>
                        {totals.service > 0 ? `${totals.service} service` : 'Healthy'}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className={`${s.panel} ${s.span7}`}>
              <div className={s.panelHead}>
                <div>
                  <h3>
                    {selected
                      ? `${selected.name} inventory`
                      : assetFilter === 'all'
                        ? 'Campus asset roll-up'
                        : `${assetCategoryLabel(assetFilter)} across campus`}
                  </h3>
                  <p>
                    {selected
                      ? `${selected.code} · ${selected.areaSqm} m²`
                      : 'Select a room for a full kit list'}
                  </p>
                </div>
                {selected ? (
                  <button type="button" className={s.kindChip} onClick={() => setSelectedId(null)}>
                    Clear room
                  </button>
                ) : null}
              </div>
              <div className={s.inventory}>
                {inventory.length === 0 ? (
                  <div className={s.invRow}>
                    <div>
                      <strong>No matching assets</strong>
                      <small>Try another category or floor</small>
                    </div>
                  </div>
                ) : (
                  inventory.map(({ room, asset }) => (
                    <div key={`${room.id}-${asset.id}`} className={s.invRow}>
                      <div>
                        <strong>{asset.name}</strong>
                        <small>
                          {selected ? assetCategoryLabel(asset.category) : `${room.name} · ${assetCategoryLabel(asset.category)}`}
                          {asset.note ? ` · ${asset.note}` : ''}
                        </small>
                      </div>
                      <span className={s.invQty}>×{asset.qty}</span>
                      <span className={s.cond} data-tone={asset.condition}>
                        {conditionLabel(asset.condition)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className={`${s.panel} ${s.span5}`}>
              <div className={s.panelHead}>
                <div>
                  <h3>Service queue</h3>
                  <p>Fair or needs-service assets</p>
                </div>
              </div>
              <div className={s.serviceList}>
                {serviceQueue.length === 0 ? (
                  <div className={s.serviceItem}>
                    <div>
                      <b>All clear</b>
                      <small>No assets flagged on this floor filter</small>
                    </div>
                  </div>
                ) : (
                  serviceQueue.map(({ room, asset }) => (
                    <button
                      key={`${room.id}-${asset.id}-svc`}
                      type="button"
                      className={s.serviceItem}
                      onClick={() => openRoom(room)}
                    >
                      <div>
                        <b>{asset.name}</b>
                        <small>
                          {room.name} · {asset.note || conditionLabel(asset.condition)}
                        </small>
                      </div>
                      <span className={s.cond} data-tone={asset.condition}>
                        {conditionLabel(asset.condition)}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {selected ? (
          <aside className={s.drawer} data-drawer aria-label={`${selected.name} detail`}>
            <div className={s.drawerHead}>
              <div>
                <h2>{selected.name}</h2>
                <p>
                  {selected.code} · {roomKindLabel(selected.kind)} ·{' '}
                  {OCCUPANCY_LABEL[selected.occupancy]}
                </p>
              </div>
              <button
                type="button"
                className={s.closeBtn}
                onClick={() => setSelectedId(null)}
                aria-label="Close"
              >
                <X size={14} />
              </button>
            </div>
            <div className={s.drawerBody}>
              <div className={s.kv}>
                <div>
                  <small>Seats</small>
                  <b>
                    {selected.occupiedSeats}/{selected.capacity}
                  </b>
                </div>
                <div>
                  <small>Area</small>
                  <b>{selected.areaSqm} m²</b>
                </div>
                <div>
                  <small>Floor</small>
                  <b>{CAMPUS_FLOORS.find((f) => f.id === selected.floor)?.label}</b>
                </div>
                <div>
                  <small>Status</small>
                  <b style={{ fontSize: 12, fontWeight: 650 }}>
                    {OCCUPANCY_LABEL[selected.occupancy]}
                  </b>
                </div>
              </div>

              {selected.currentSession ? (
                <div className={s.bookingCard}>
                  <small>Current session</small>
                  <b>{selected.currentSession.title}</b>
                  <p>
                    <UserRound size={12} aria-hidden /> {selected.currentSession.trainer}
                    {selected.currentSession.cohort
                      ? ` · ${selected.currentSession.cohort}`
                      : ''}
                  </p>
                  <p>
                    <CalendarClock size={12} aria-hidden /> {selected.currentSession.startsAt}–
                    {selected.currentSession.endsAt} · {selected.currentSession.durationLabel}
                  </p>
                </div>
              ) : (
                <div className={s.bookingCard} data-empty>
                  <small>Current session</small>
                  <b>Unoccupied right now</b>
                  <p>No class or booking in progress</p>
                </div>
              )}

              {selected.nextSession ? (
                <div className={s.bookingCard} data-next>
                  <small>Next on schedule</small>
                  <b>{selected.nextSession.title}</b>
                  <p>
                    <UserRound size={12} aria-hidden /> {selected.nextSession.trainer}
                    {selected.nextSession.cohort ? ` · ${selected.nextSession.cohort}` : ''}
                  </p>
                  <p>
                    <CalendarClock size={12} aria-hidden /> {selected.nextSession.startsAt}–
                    {selected.nextSession.endsAt} · {selected.nextSession.durationLabel}
                  </p>
                </div>
              ) : (
                <div className={s.bookingCard} data-empty>
                  <small>Next on schedule</small>
                  <b>Nothing lined up</b>
                  <p>No follow-on booking after this block</p>
                </div>
              )}

              {selected.attendance ? (
                <div className={s.attendanceBlock}>
                  <div className={s.attendanceHead}>
                    <div>
                      <h3>Class roll</h3>
                      <p>
                        {selected.currentSession?.trainer
                          ? `With ${selected.currentSession.trainer}`
                          : 'Live attendance'}
                      </p>
                    </div>
                    <div className={s.attendanceStats}>
                      <span data-tone="green">
                        {selected.attendance.present.length} present
                      </span>
                      <span data-tone="warm">
                        {selected.attendance.missing.length} missing
                      </span>
                    </div>
                  </div>

                  <div className={s.rollSection}>
                    <small>
                      <UserRound size={11} aria-hidden /> Present
                    </small>
                    <ul className={s.rollList}>
                      {selected.attendance.present.map((student) => (
                        <li key={student.id}>
                          <span>{student.name}</span>
                          <em>{student.code}</em>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className={s.rollSection} data-missing>
                    <small>
                      <UserX size={11} aria-hidden /> Missing
                    </small>
                    {selected.attendance.missing.length === 0 ? (
                      <p className={s.rollEmpty}>Full attendance</p>
                    ) : (
                      <ul className={s.rollList}>
                        {selected.attendance.missing.map((student) => (
                          <li key={student.id}>
                            <span>{student.name}</span>
                            <em>{student.code}</em>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              ) : null}

              <div className={s.seatBar} aria-hidden>
                <i style={{ width: `${seatFillPct(selected)}%` }} />
              </div>
              <div className={s.inventory} style={{ maxHeight: 'none' }}>
                {selected.assets.map((asset) => (
                  <div key={asset.id} className={s.invRow}>
                    <div>
                      <strong>{asset.name}</strong>
                      <small>
                        {assetCategoryLabel(asset.category)}
                        {asset.note ? ` · ${asset.note}` : ''}
                      </small>
                    </div>
                    <span className={s.invQty}>×{asset.qty}</span>
                    <span className={s.cond} data-tone={asset.condition}>
                      {conditionLabel(asset.condition)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        ) : null}
      </div>
    </DemoSurface>
  )
}
