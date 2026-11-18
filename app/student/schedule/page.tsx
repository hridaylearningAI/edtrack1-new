'use client'

import StudentLayout from '@/components/student/student-layout'
import { SchedulingHall } from '@/components/platform/scheduling-hall'

export default function StudentSchedulePage() {
  return (
    <StudentLayout immersive>
      <SchedulingHall
        backHref="/student"
        backLabel="Student workspace"
        storageKey="edtrack-schedule-custom-v1:student"
        afterSignOutUrl="/demo"
        accountLabel="Student schedule"
      />
    </StudentLayout>
  )
}
