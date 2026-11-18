'use client'

import { SchedulingHall } from '@/components/platform/scheduling-hall'

export default function SchedulingDemoPage() {
  return (
    <SchedulingHall
      backHref="/platform"
      backLabel="Platform map"
      storageKey="edtrack-schedule-custom-v1:platform"
      afterSignOutUrl="/demo"
      accountLabel="Schedule"
    />
  )
}
