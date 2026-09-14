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
  { title: 'ASQA scope of registration', status: 'compliant', due: 'Current' },
  { title: 'Training & assessment strategies', status: 'attention', due: '3 units to refresh' },
  { title: 'Trainer currency matrix', status: 'compliant', due: 'Updated Feb 2026' },
  { title: 'Validation schedule 2026', status: 'due', due: 'Next cycle in 6 weeks' },
  { title: 'AVETMISS reporting pack', status: 'due', due: 'Due end of month' },
  { title: 'USI compliance checks', status: 'compliant', due: 'Automated nightly' },
]

export default function ComplyVetDemoPage() {
  const module = getPlatformModule('comply-vet')!
  return (
    <DemoModuleShell module={module}>
      <DemoKpis
        items={[
          { label: 'Units on scope', value: '86' },
          { label: 'Validations due', value: '4' },
          { label: 'Risk flags', value: '1' },
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
