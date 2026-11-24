'use client'

import { ComplianceHall } from '@/components/platform/compliance-hall'
import { MODULE_DETAILS } from '@/components/platform/module-definitions'
import { VET_COMPLIANCE_PACK } from '@/lib/compliance/vet-content'

export default function ComplyVetDemoPage() {
  const detail = MODULE_DETAILS['comply-vet']
  return (
    <ComplianceHall
      pack={VET_COMPLIANCE_PACK}
      title={detail.title}
      description={VET_COMPLIANCE_PACK.intro}
      accountLabel={detail.title}
    />
  )
}
