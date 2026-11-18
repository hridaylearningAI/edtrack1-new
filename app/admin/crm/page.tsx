'use client'

import { CrmDidacShell } from '@/components/crm/crm-didac-shell'
import { CrmLeadsPanel } from '@/components/crm/crm-leads-panel'

export default function AdminCrmPage() {
  return (
    <CrmDidacShell>
      <CrmLeadsPanel
        detailBasePath="/admin/crm"
        title="CRM"
        description="Performance marketing leads with campaign attribution and pipeline status."
      />
    </CrmDidacShell>
  )
}
