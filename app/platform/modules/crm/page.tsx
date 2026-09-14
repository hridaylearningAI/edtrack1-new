'use client'

import { DemoKpis, DemoModuleShell } from '@/components/platform/demo-module-shell'
import s from '@/components/platform/module.module.css'
import { getPlatformModule } from '@/lib/demo-platform'

const COLUMNS = [
  {
    name: 'New',
    tone: undefined,
    leads: [
      { name: 'Aisha Rahman', detail: 'Diploma of Nursing enquiry' },
      { name: 'Marcus Lee', detail: 'NCLEX prep webinar' },
    ],
  },
  {
    name: 'Contacted',
    tone: 'blue',
    leads: [
      { name: 'Priya Nair', detail: 'Follow-up call scheduled' },
      { name: 'James Okonkwo', detail: 'Sent brochure pack' },
    ],
  },
  {
    name: 'Qualified',
    tone: 'red',
    leads: [{ name: 'Elena Costa', detail: 'Ready for enrolment' }],
  },
  {
    name: 'Won',
    tone: 'green',
    leads: [{ name: 'Noah Patel', detail: 'Enrolled · GNPS Stage 1' }],
  },
]

export default function CrmDemoPage() {
  const module = getPlatformModule('crm')!
  return (
    <DemoModuleShell module={module}>
      <DemoKpis
        items={[
          { label: 'Open leads', value: '128' },
          { label: 'Conversion (30d)', value: '18%' },
          { label: 'Tasks due today', value: '9' },
        ]}
      />

      <div className={s.section}>
        <h2>Enquiry pipeline</h2>
        <small>Recent activity</small>
      </div>
      <div className={s.board}>
        {COLUMNS.map((col) => (
          <section key={col.name} className={s.column}>
            <h3>
              <span className={s.dot} data-tone={col.tone} />
              {col.name}
              <small>{col.leads.length}</small>
            </h3>
            <ul className={s.leads}>
              {col.leads.map((lead) => (
                <li key={lead.name} className={s.lead}>
                  <b>{lead.name}</b>
                  <span className={s.meta}>{lead.detail}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </DemoModuleShell>
  )
}
