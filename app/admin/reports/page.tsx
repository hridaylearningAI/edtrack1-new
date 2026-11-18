'use client'

import { InsightHall } from '@/components/platform/insight-hall'

export default function ReportsAnalyticsPage() {
  return (
    <InsightHall
      backHref="/admin"
      backLabel="Admin workspace"
      afterSignOutUrl="/demo"
      accountLabel="Reports & Analytics"
    />
  )
}
