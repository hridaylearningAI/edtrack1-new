'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { UserButton, useUser } from '@clerk/nextjs'
import { useGSAP } from '@gsap/react'
import { gsap } from 'gsap'
import { ArrowUpRight, Search } from 'lucide-react'
import { DemoAvatar } from '@/components/demo-avatar'
import { DemoClerkAvatarSync } from '@/components/demo-clerk-avatar-sync'
import { DemoCommandPalette } from '@/components/demo-command-palette'
import { DEMO_ACCOUNT_NAME, DEMO_ACCOUNT_SEED } from '@/lib/demo-avatars'
import { EDTRACK_LOGO_SRC } from '@/lib/brand'
import { PLATFORM_MODULES, type PlatformModuleSlug } from '@/lib/demo-platform'
import { DemoSurface } from './demo-surface'
import { MODULE_DETAILS } from './module-definitions'
import { WorkspaceLordIcon } from './workspace-lord-icon'
import { LI_ACTIVE } from './platform-icons'
import { PlatformDoodleBackdrop } from './platform-doodle-backdrop'
import s from './platform-branch-map.module.css'

export { MODULE_DETAILS } from './module-definitions'

if (typeof window !== 'undefined') gsap.registerPlugin(useGSAP)

const VIEW = 1000
const CENTER = VIEW / 2
const MIN_SEP = 158
const PAD = 90

type LiveNode = {
  slug: PlatformModuleSlug
  href: string
  title: string
  description: string
  icon: string
  tone: string
  colors: string
  bend: number
  homeX: number
  homeY: number
  x: number
  y: number
}

function polar(radius: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180
  return {
    x: CENTER + Math.cos(rad) * radius,
    y: CENTER + Math.sin(rad) * radius,
  }
}

function branchPath(toX: number, toY: number, bend: number) {
  const mx = (CENTER + toX) / 2
  const my = (CENTER + toY) / 2
  const dx = toX - CENTER
  const dy = toY - CENTER
  const len = Math.hypot(dx, dy) || 1
  const cx = mx + (-dy / len) * bend
  const cy = my + (dx / len) * bend
  return `M ${CENTER} ${CENTER} Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${toX.toFixed(1)} ${toY.toFixed(1)}`
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

/** Uneven radii so the constellation feels organic, not a perfect ring. */
const RADIUS_PATTERN = [360, 428, 392, 448, 372, 416, 454, 384, 434, 404]

function buildNodes(): LiveNode[] {
  const ordered = [...PLATFORM_MODULES].sort((a, b) => {
    if (a.slug === 'sms') return -1
    if (b.slug === 'sms') return 1
    return 0
  })

  return ordered.map((module, index) => {
    const detail = MODULE_DETAILS[module.slug]
    const angle = -90 + (360 / ordered.length) * index + (index % 3 === 0 ? -6 : index % 3 === 1 ? 5 : 0)
    const radius = RADIUS_PATTERN[index % RADIUS_PATTERN.length] ?? 400
    const point = polar(radius, angle)
    const bend = (48 + (index % 4) * 12) * (index % 2 === 0 ? 1 : -1)
    return {
      slug: module.slug,
      href: module.href,
      title: detail.title,
      description: detail.description,
      icon: detail.icon,
      tone: detail.tone,
      colors: detail.colors,
      bend,
      homeX: point.x,
      homeY: point.y,
      x: point.x,
      y: point.y,
    }
  })
}

function interact(nodes: LiveNode[], draggedSlug: PlatformModuleSlug): LiveNode[] {
  const next = nodes.map((node) => ({ ...node }))
  const dragged = next.find((node) => node.slug === draggedSlug)
  if (!dragged) return next

  for (const node of next) {
    if (node.slug === draggedSlug) continue
    const dx = node.x - dragged.x
    const dy = node.y - dragged.y
    const dist = Math.hypot(dx, dy) || 0.01
    if (dist < MIN_SEP) {
      const push = ((MIN_SEP - dist) / dist) * 0.42
      node.x = clamp(node.x + dx * push, PAD, VIEW - PAD)
      node.y = clamp(node.y + dy * push, PAD, VIEW - PAD)
    } else {
      // Soft elastic pull back toward home while not colliding.
      node.x += (node.homeX - node.x) * 0.05
      node.y += (node.homeY - node.y) * 0.05
    }
  }

  return next
}

export function PlatformOverviewMap() {
  const { user } = useUser()
  const router = useRouter()
  const rootRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const homeNodes = useMemo(() => buildNodes(), [])
  const [nodes, setNodes] = useState<LiveNode[]>(homeNodes)
  const [draggingSlug, setDraggingSlug] = useState<PlatformModuleSlug | null>(null)
  const dragRef = useRef<{
    slug: PlatformModuleSlug
    pointerId: number
    offsetX: number
    offsetY: number
    moved: boolean
  } | null>(null)
  const nodesRef = useRef(nodes)
  nodesRef.current = nodes

  useGSAP(
    () => {
      const root = rootRef.current
      if (!root) return

      const media = gsap.matchMedia()

      media.add('(prefers-reduced-motion: reduce)', () => {
        gsap.set('[data-hub]', { autoAlpha: 1, scale: 1 })
        gsap.set('[data-branch]', { strokeDashoffset: 0 })
        gsap.set('[data-node]', { autoAlpha: 1, y: 0, scale: 1 })
      })

      media.add('(prefers-reduced-motion: no-preference) and (min-width: 901px)', () => {
        const hub = root.querySelector<HTMLElement>('[data-hub]')
        const branches = gsap.utils.toArray<SVGPathElement>('[data-branch]')
        const cards = gsap.utils.toArray<HTMLElement>('[data-node]')

        gsap.set(hub, { autoAlpha: 0, scale: 0.9 })
        branches.forEach((path) => {
          const length = path.getTotalLength()
          gsap.set(path, {
            strokeDasharray: length,
            strokeDashoffset: length,
          })
        })
        gsap.set(cards, { autoAlpha: 0, y: 14, scale: 0.94 })

        const timeline = gsap.timeline({ defaults: { ease: 'power3.out' } })
        timeline.to(hub, { autoAlpha: 1, scale: 1, duration: 1.15 })

        branches.forEach((path, index) => {
          const card = cards[index]
          const start = 0.85 + index * 0.28
          timeline.to(
            path,
            {
              strokeDashoffset: 0,
              duration: 0.95,
              ease: 'power2.inOut',
            },
            start,
          )
          if (card) {
            timeline.to(
              card,
              {
                autoAlpha: 1,
                y: 0,
                scale: 1,
                duration: 0.55,
                ease: 'power3.out',
              },
              start + 0.72,
            )
          }
        })
      })

      media.add('(prefers-reduced-motion: no-preference) and (max-width: 900px)', () => {
        const hub = root.querySelector<HTMLElement>('[data-hub]')
        const cards = gsap.utils.toArray<HTMLElement>('[data-node]')
        gsap.set(hub, { autoAlpha: 0, y: 12 })
        gsap.set(cards, { autoAlpha: 0, y: 18 })
        const timeline = gsap.timeline({ defaults: { ease: 'power3.out' } })
        timeline.to(hub, { autoAlpha: 1, y: 0, duration: 0.8 })
        timeline.to(cards, { autoAlpha: 1, y: 0, duration: 0.5, stagger: 0.08 }, '-=0.2')
      })

      return () => media.revert()
    },
    { scope: rootRef },
  )

  const clientToView = useCallback((clientX: number, clientY: number) => {
    const stage = stageRef.current
    if (!stage) return { x: CENTER, y: CENTER }
    const rect = stage.getBoundingClientRect()
    return {
      x: ((clientX - rect.left) / Math.max(rect.width, 1)) * VIEW,
      y: ((clientY - rect.top) / Math.max(rect.height, 1)) * VIEW,
    }
  }, [])

  const springHome = useCallback(() => {
    const current = nodesRef.current.map((node) => ({ ...node }))
    gsap.to(current, {
      x: (index) => current[index]!.homeX,
      y: (index) => current[index]!.homeY,
      duration: 0.9,
      ease: 'elastic.out(1, 0.58)',
      stagger: 0.02,
      onUpdate: () => {
        setNodes(current.map((node) => ({ ...node })))
      },
      onComplete: () => {
        setNodes(current.map((node) => ({ ...node, x: node.homeX, y: node.homeY })))
      },
    })
  }, [])

  const onPointerDown = (slug: PlatformModuleSlug, event: React.PointerEvent) => {
    if (window.matchMedia('(max-width: 900px)').matches) return
    const node = nodesRef.current.find((item) => item.slug === slug)
    if (!node) return
    const point = clientToView(event.clientX, event.clientY)
    dragRef.current = {
      slug,
      pointerId: event.pointerId,
      offsetX: point.x - node.x,
      offsetY: point.y - node.y,
      moved: false,
    }
    setDraggingSlug(slug)
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const onPointerMove = (event: React.PointerEvent) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    const point = clientToView(event.clientX, event.clientY)
    const nextX = clamp(point.x - drag.offsetX, PAD, VIEW - PAD)
    const nextY = clamp(point.y - drag.offsetY, PAD, VIEW - PAD)
    if (Math.hypot(nextX - (nodesRef.current.find((n) => n.slug === drag.slug)?.x ?? 0), nextY - (nodesRef.current.find((n) => n.slug === drag.slug)?.y ?? 0)) > 2) {
      drag.moved = true
    }

    const withDrag = nodesRef.current.map((node) =>
      node.slug === drag.slug ? { ...node, x: nextX, y: nextY } : { ...node },
    )
    setNodes(interact(withDrag, drag.slug))
  }

  const onPointerUp = (slug: PlatformModuleSlug, event: React.PointerEvent) => {
    const drag = dragRef.current
    if (!drag || drag.slug !== slug) return
    const moved = drag.moved
    const href = nodesRef.current.find((node) => node.slug === slug)?.href
    dragRef.current = null
    setDraggingSlug(null)
    try {
      event.currentTarget.releasePointerCapture(event.pointerId)
    } catch {
      /* capture may already be released */
    }

    if (!moved && href) {
      router.push(href)
      return
    }
    springHome()
  }

  return (
    <DemoSurface>
      <DemoClerkAvatarSync />
      <DemoCommandPalette hideTrigger open={paletteOpen} onOpenChange={setPaletteOpen} />
      <div ref={rootRef} className={s.map}>
        <PlatformDoodleBackdrop />
        <div className={s.chrome}>
          <div className={s.accountMenu}>
            <div className={s.accountPanel}>
              <div className={s.accountHead}>
                <div className={s.accountMeta}>
                  <b>{user?.fullName || DEMO_ACCOUNT_NAME}</b>
                  <small>Demo Platform</small>
                </div>
                <div className={s.accountAvatar}>
                  <DemoAvatar seed={DEMO_ACCOUNT_SEED} name={DEMO_ACCOUNT_NAME} size={36} />
                  <div style={{ position: 'absolute', inset: 0, opacity: 0 }}>
                    <UserButton afterSignOutUrl="/demo" />
                  </div>
                </div>
              </div>
              <button
                type="button"
                className={s.accountSearch}
                onClick={() => setPaletteOpen(true)}
                aria-label="Search EdTrack"
              >
                <Search size={14} aria-hidden />
                Search or jump to…
                <kbd>/</kbd>
              </button>
            </div>
          </div>
        </div>

        <div ref={stageRef} className={s.stage} aria-label="EdTrack ONE module map">
          <svg className={s.branches} viewBox={`0 0 ${VIEW} ${VIEW}`} aria-hidden>
            {nodes.map((node) => (
              <path
                key={node.slug}
                className={s.branch}
                data-branch
                data-tone={node.tone}
                d={branchPath(node.x, node.y, node.bend)}
              />
            ))}
          </svg>

          <div className={s.hub} data-hub>
            <Image
              className={s.hubLogo}
              src={EDTRACK_LOGO_SRC}
              alt="EdTrack ONE"
              width={1967}
              height={800}
              priority
            />
            <p className={s.hubCaption}>Learn · Manage · Comply</p>
          </div>

          {nodes.map((node) => (
            <div
              key={node.slug}
              className={s.node}
              data-node
              data-dragging={draggingSlug === node.slug || undefined}
              style={{
                left: `${(node.x / VIEW) * 100}%`,
                top: `${(node.y / VIEW) * 100}%`,
              }}
              onPointerDown={(event) => onPointerDown(node.slug, event)}
              onPointerMove={onPointerMove}
              onPointerUp={(event) => onPointerUp(node.slug, event)}
              onPointerCancel={(event) => onPointerUp(node.slug, event)}
            >
              <div className={s.card} data-tone={node.tone} role="link" tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    router.push(node.href)
                  }
                }}
              >
                <span className={s.cardIcon} aria-hidden>
                  <WorkspaceLordIcon src={node.icon} trigger="hover" target="[data-tone]" colors={LI_ACTIVE} size={88} />
                </span>
                <div className={s.cardBody}>
                  <strong>{node.title}</strong>
                  <span className={s.cardCopy}>{node.description}</span>
                  <span className={s.cardFoot}>
                    Open <ArrowUpRight size={13} />
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DemoSurface>
  )
}
