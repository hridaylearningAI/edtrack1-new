'use client'

import dynamic from 'next/dynamic'
import { CrmDidacShell } from '@/components/crm/crm-didac-shell'
import { CrmLeadsPanel } from '@/components/crm/crm-leads-panel'
import s from './home-tour-live-screen.module.css'

const SchedulingHall = dynamic(
  () => import('@/components/platform/scheduling-hall').then((m) => m.SchedulingHall),
  { ssr: false }
)
const InsightHall = dynamic(
  () => import('@/components/platform/insight-hall').then((m) => m.InsightHall),
  { ssr: false }
)
const ResourcesHall = dynamic(
  () => import('@/components/platform/resources-hall').then((m) => m.ResourcesHall),
  { ssr: false }
)
const PlatformOverviewMap = dynamic(
  () => import('@/components/platform/platform-overview-map').then((m) => m.PlatformOverviewMap),
  { ssr: false }
)

export type TourScreenStation = 1 | 2 | 3 | 4 | 5

const DESIGN_W = 1440
const DESIGN_H = 900

type Props = {
  station: TourScreenStation
  mode: 'monitor' | 'dialog'
  width?: number
  height?: number
}

function TourScreenBody({ station }: { station: TourScreenStation }) {
  switch (station) {
    case 1:
      return (
        <div className={s.crmPad}>
          <CrmDidacShell>
            <CrmLeadsPanel
              detailBasePath="/admin/crm"
              title="CRM & Enquiries"
              description="Follow enquiries from first contact to enrolment — same pipeline as the live campus CRM."
              publicPreview
            />
          </CrmDidacShell>
        </div>
      )
    case 2:
      return (
        <SchedulingHall
          backHref="/platform"
          backLabel="Platform map"
          storageKey="edtrack-tour-schedule-preview"
          accountLabel="Schedule"
        />
      )
    case 3:
      return (
        <InsightHall
          backHref="/platform"
          backLabel="Platform map"
          accountLabel="Insight Analytics"
        />
      )
    case 4:
      return <PlatformOverviewMap />
    case 5:
      return (
        <ResourcesHall
          backHref="/platform"
          backLabel="Platform map"
          accountLabel="Resource Management"
        />
      )
    default: {
      const _exhaustive: never = station
      return _exhaustive
    }
  }
}

export function HomeTourLiveScreen({ station, mode, width = DESIGN_W, height = DESIGN_H }: Props) {
  const scale = Math.min(width / DESIGN_W, height / DESIGN_H)

  return (
    <div
      className={s.root}
      data-mode={mode}
      style={{ width, height }}
      aria-hidden={mode === 'monitor' ? true : undefined}
    >
      <div
        className={s.stage}
        style={{
          width: DESIGN_W,
          height: DESIGN_H,
          transform: `scale(${scale})`,
        }}
      >
        <TourScreenBody station={station} />
      </div>
    </div>
  )
}
