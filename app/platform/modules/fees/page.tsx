'use client'

import { DemoKpis, DemoModuleShell } from '@/components/platform/demo-module-shell'
import s from '@/components/platform/module.module.css'
import { getPlatformModule } from '@/lib/demo-platform'

type InvoiceStatus = 'Paid' | 'Due' | 'Partial' | 'Overdue'

const STATUS_TONE: Record<InvoiceStatus, string | undefined> = {
  Paid: 'green',
  Due: 'blue',
  Partial: undefined,
  Overdue: 'red',
}

const INVOICES: {
  id: string
  student: string
  course: string
  amount: string
  status: InvoiceStatus
}[] = [
  { id: 'INV-1042', student: 'Elena Costa', course: 'GNPS Stage 1', amount: '$2,450', status: 'Paid' },
  { id: 'INV-1043', student: 'Noah Patel', course: 'NCLEX Strategies', amount: '$890', status: 'Paid' },
  { id: 'INV-1044', student: 'Priya Nair', course: 'BSBCRT511', amount: '$1,200', status: 'Due' },
  { id: 'INV-1045', student: 'Marcus Lee', course: 'Clinical Prep', amount: '$650', status: 'Partial' },
  { id: 'INV-1046', student: 'Aisha Rahman', course: 'GNPS Stage 2', amount: '$2,450', status: 'Overdue' },
]

export default function FeesDemoPage() {
  const module = getPlatformModule('fees')!
  return (
    <DemoModuleShell module={module}>
      <DemoKpis
        items={[
          { label: 'Collected (MTD)', value: '$48.2k' },
          { label: 'Outstanding', value: '$12.6k' },
          { label: 'Overdue invoices', value: '7' },
        ]}
      />

      <div className={s.section}>
        <h2>Recent invoices</h2>
        <small>{INVOICES.length} invoices</small>
      </div>
      <div className={s.tableWrap}>
        <table className={s.table}>
          <thead>
            <tr>
              <th scope="col">Invoice</th>
              <th scope="col">Student</th>
              <th scope="col">Course</th>
              <th scope="col" className={s.num}>Amount</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {INVOICES.map((row) => (
              <tr key={row.id}>
                <td className={s.muted}>{row.id}</td>
                <td>{row.student}</td>
                <td className={s.muted}>{row.course}</td>
                <td className={s.num}>{row.amount}</td>
                <td>
                  <span className={s.pill} data-tone={STATUS_TONE[row.status]}>
                    {row.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DemoModuleShell>
  )
}
