'use client'

import { ResourcesHall } from '@/components/platform/resources-hall'

export default function AdminResourcesPage() {
  return (
    <ResourcesHall
      backHref="/admin"
      backLabel="Admin workspace"
      afterSignOutUrl="/demo"
      accountLabel="Admin resources"
    />
  )
}
