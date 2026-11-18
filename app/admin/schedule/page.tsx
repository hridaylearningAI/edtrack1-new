'use client'

import { SchedulingHall } from '@/components/platform/scheduling-hall'

export default function AdminSchedulePage() {
  return (
    <SchedulingHall
      backHref="/admin"
      backLabel="Admin workspace"
      storageKey="edtrack-schedule-custom-v1:admin"
      afterSignOutUrl="/demo"
      accountLabel="Admin schedule"
    />
  )
}
