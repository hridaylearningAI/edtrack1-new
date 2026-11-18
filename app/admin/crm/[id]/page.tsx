'use client'

import { use } from 'react'
import { CrmDidacShell } from '@/components/crm/crm-didac-shell'
import { CrmLeadDetail } from '@/components/crm/crm-lead-detail'

export default function AdminCrmLeadPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const leadId = parseInt(id, 10)

  return (
    <CrmDidacShell>
      <CrmLeadDetail leadId={leadId} backHref="/admin/crm" />
    </CrmDidacShell>
  )
}
