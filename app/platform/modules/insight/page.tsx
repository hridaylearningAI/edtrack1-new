'use client'

import { InsightHall } from '@/components/platform/insight-hall'

export default function InsightDemoPage() {
  return (
    <InsightHall
      backHref="/platform"
      backLabel="Platform map"
      afterSignOutUrl="/demo"
      accountLabel="Insight Analytics"
    />
  )
}
