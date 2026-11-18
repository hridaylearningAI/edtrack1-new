'use client'

import TrainerLayout from '@/components/trainer/trainer-layout'
import { SchedulingHall } from '@/components/platform/scheduling-hall'

export default function TrainerSchedulePage() {
  return (
    <TrainerLayout>
      <SchedulingHall
        backHref="/trainer"
        backLabel="Trainer workspace"
        storageKey="edtrack-schedule-custom-v1:trainer"
        afterSignOutUrl="/demo"
        accountLabel="Trainer schedule"
      />
    </TrainerLayout>
  )
}
