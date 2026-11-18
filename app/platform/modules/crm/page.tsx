'use client'

import { DemoModuleShell } from '@/components/platform/demo-module-shell'
import { CrmDidacShell } from '@/components/crm/crm-didac-shell'
import { CrmLeadsPanel } from '@/components/crm/crm-leads-panel'
import { getPlatformModule } from '@/lib/demo-platform'

export default function CrmDemoPage() {
  const module = getPlatformModule('crm')!
  return (
    <DemoModuleShell module={module}>
      <CrmDidacShell>
        <CrmLeadsPanel
          detailBasePath="/admin/crm"
          title="CRM & Enquiries"
          description="Follow enquiries from first contact to enrolment — same pipeline as the live EdTec CRM."
        />
      </CrmDidacShell>
    </DemoModuleShell>
  )
}
