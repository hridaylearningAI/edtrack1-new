'use client'

import { ResourcesHall } from '@/components/platform/resources-hall'

export default function ResourcesDemoPage() {
  return (
    <ResourcesHall
      backHref="/platform"
      backLabel="Platform map"
      afterSignOutUrl="/demo"
      accountLabel="Resource Management"
    />
  )
}
