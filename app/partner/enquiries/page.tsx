'use client'

import PartnerLayout from '@/components/partner/partner-layout'
import { CrmDidacShell } from '@/components/crm/crm-didac-shell'
import { CrmLeadsPanel } from '@/components/crm/crm-leads-panel'

export default function PartnerEnquiriesPage() {
  return (
    <PartnerLayout>
      <CrmDidacShell>
        <CrmLeadsPanel
          detailBasePath="/admin/crm"
          title="Purchase enquiries"
          description="Assigned leads and course-interest follow-ups — same CRM board used by admissions."
        />
      </CrmDidacShell>
    </PartnerLayout>
  )
}
