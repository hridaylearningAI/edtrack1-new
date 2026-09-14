'use client'

import { AlertTriangle, CheckCircle2, Clock, type LucideIcon } from 'lucide-react'
import { DemoKpis, DemoModuleShell } from '@/components/platform/demo-module-shell'
import s from '@/components/platform/module.module.css'
import { getPlatformModule } from '@/lib/demo-platform'

type Status = 'compliant' | 'due' | 'attention'

const STATUS: Record<Status, { label: string; tone: string; icon: LucideIcon }> = {
  compliant: { label: 'Compliant', tone: 'green', icon: CheckCircle2 },
  due: { label: 'Due soon', tone: 'blue', icon: Clock },
  attention: { label: 'Needs attention', tone: 'red', icon: AlertTriangle },
}

const ITEMS: { title: string; status: Status; due: string }[] = [
  { title: 'TEQSA provider registration', status: 'compliant', due: 'Current' },
  { title: 'ESOS National Code audit pack', status: 'due', due: 'Due in 12 days' },
  { title: 'Course accreditation renewals', status: 'attention', due: '2 items pending' },
  { title: 'Staff credential matrix', status: 'compliant', due: 'Updated Mar 2026' },
  { title: 'Student grievance register', status: 'compliant', due: 'Current' },
  { title: 'CRICOS capacity report', status: 'due', due: 'Due in 28 days' },
]

export default function ComplyHeDemoPage() {
  const module = getPlatformModule('comply-he')!
  return (
    <DemoModuleShell module={module}>
      <DemoKpis
        items={[
          { label: 'Compliant controls', value: '42' },
          { label: 'Due soon', value: '5' },
          { label: 'Needs attention', value: '2' },
        ]}
      />

      <div className={s.section}>
        <h2>Compliance register</h2>
        <small>{ITEMS.length} obligations</small>
      </div>
      <ul className={s.list}>
        {ITEMS.map((item) => {
          const status = STATUS[item.status]
          return (
            <li key={item.title}>
              <div>
                <b>{item.title}</b>
                <span className={s.meta}>{item.due}</span>
              </div>
              <span className={s.pill} data-tone={status.tone}>
                <status.icon size={13} aria-hidden />
                {status.label}
              </span>
            </li>
          )
        })}
      </ul>
    </DemoModuleShell>
  )
}
