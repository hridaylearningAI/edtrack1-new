'use client'

import { ComplianceHall } from '@/components/platform/compliance-hall'
import { MODULE_DETAILS } from '@/components/platform/module-definitions'
import { HE_COMPLIANCE_PACK } from '@/lib/compliance/he-content'

export default function ComplyHeDemoPage() {
  const detail = MODULE_DETAILS['comply-he']
  return (
    <ComplianceHall
      pack={HE_COMPLIANCE_PACK}
      title={detail.title}
      description={HE_COMPLIANCE_PACK.intro}
      accountLabel={detail.title}
    />
  )
}
