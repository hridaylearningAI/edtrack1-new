'use client'

import PartnerLayout from '@/components/partner/partner-layout'
import { SchedulingHall } from '@/components/platform/scheduling-hall'

export default function PartnerSchedulePage() {
  return (
    <PartnerLayout>
      <SchedulingHall
        backHref="/partner"
        backLabel="Partner workspace"
        storageKey="edtrack-schedule-custom-v1:partner"
        afterSignOutUrl="/demo"
        accountLabel="Partner schedule"
      />
    </PartnerLayout>
  )
}
