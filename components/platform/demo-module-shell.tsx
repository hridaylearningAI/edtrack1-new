'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import type { PlatformModuleDef } from '@/lib/demo-platform'
import { MODULE_DETAILS } from './module-definitions'
import { DidacPortalShell } from '@/components/portal/didac-portal-shell'
import { WorkspaceLordIcon } from './workspace-lord-icon'
import { useWorkspaceMotion } from './use-workspace-motion'
import {
  LI_BLUE,
  LI_BLUSH,
  LI_LILAC,
  LI_SAGE,
  PLATFORM_ICONS,
} from './platform-icons'
import w from './workspace.module.css'
import s from './module.module.css'

const KPI_TONES = [
  { tone: 'lilac' as const, colors: LI_LILAC, icon: PLATFORM_ICONS.learners },
  { tone: 'mint' as const, colors: LI_SAGE, icon: PLATFORM_ICONS.learning },
  { tone: 'blue' as const, colors: LI_BLUE, icon: PLATFORM_ICONS.fees },
  { tone: 'blush' as const, colors: LI_BLUSH, icon: PLATFORM_ICONS.assessments },
]

const moduleSections = [
  {
    label: 'Explore',
    items: [
      { title: 'Learning', href: '/platform/modules/lms', icon: PLATFORM_ICONS.learning },
      { title: 'Fees', href: '/platform/modules/fees', icon: PLATFORM_ICONS.fees },
      { title: 'Scheduling', href: '/platform/modules/scheduling', icon: PLATFORM_ICONS.schedule },
      { title: 'Compliance', href: '/platform/modules/comply-vet', icon: PLATFORM_ICONS.compliance },
    ],
  },
  {
    label: 'Portals',
    items: [
      { title: 'Admin SMS', href: '/admin', icon: PLATFORM_ICONS.docs },
      { title: 'Student portal', href: '/student', icon: PLATFORM_ICONS.students },
      { title: 'Trainer portal', href: '/trainer', icon: PLATFORM_ICONS.learning },
      { title: 'Partner portal', href: '/partner', icon: PLATFORM_ICONS.fees },
    ],
  },
]

export function DemoModuleShell({ module, children }: { module: PlatformModuleDef; children: ReactNode }) {
  const detail = MODULE_DETAILS[module.slug]
  return (
    <DidacPortalShell
      brandTitle="EdTrack ONE"
      brandSubtitle="Module preview"
      brandHref="/platform"
      showPlatformMap
      showCommandPalette
      sections={moduleSections}
    >
      <div className={w.moduleHeading}>
        <Link href="/platform">← Platform map</Link>
        <h1>{detail.title}</h1>
        <p>{detail.description}</p>
      </div>
      <div className={w.notice}>
        <i />
        Demo workspace · Sample data for illustration
      </div>
      <div className={s.page} data-tone={detail.tone}>
        {children}
      </div>
    </DidacPortalShell>
  )
}

export function DemoKpis({
  items,
  columns,
}: {
  items: { label: string; value: string }[]
  columns?: 2 | 3 | 4
}) {
  const motionRef = useWorkspaceMotion([items.map((item) => item.value).join('|')])
  const cols = columns ?? (items.length <= 3 ? (items.length as 2 | 3) : 4)
  return (
    <div
      className={w.metrics}
      ref={motionRef}
      style={{ marginBottom: 0, gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {items.map((kpi, index) => {
        const tone = KPI_TONES[index % KPI_TONES.length]
        return (
          <div className={w.metric} data-tone={tone.tone} data-animate="metric" key={kpi.label}>
            <span className={w.metricBg} data-metric-icon>
              <WorkspaceLordIcon src={tone.icon} trigger="hover" target="[data-animate='metric']" colors={tone.colors} size={96} />
            </span>
            <div className={w.metricBody}>
              <strong>{kpi.value}</strong>
              <small>{kpi.label}</small>
            </div>
          </div>
        )
      })}
    </div>
  )
}
