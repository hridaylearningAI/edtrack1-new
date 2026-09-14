'use client'

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { DemoKpis, DemoModuleShell } from '@/components/platform/demo-module-shell'
import s from '@/components/platform/module.module.css'
import { getPlatformModule } from '@/lib/demo-platform'

const DATA = [
  { month: 'Jan', enrolments: 42, completions: 18 },
  { month: 'Feb', enrolments: 55, completions: 24 },
  { month: 'Mar', enrolments: 48, completions: 31 },
  { month: 'Apr', enrolments: 67, completions: 29 },
  { month: 'May', enrolments: 71, completions: 38 },
  { month: 'Jun', enrolments: 63, completions: 41 },
]

// Pair checked with the dataviz palette validator on the light surface.
const SERIES = [
  { key: 'enrolments', label: 'Enrolments', color: '#2054a0' },
  { key: 'completions', label: 'Completions', color: '#2f8a64' },
] as const

const TICK = { fill: '#5f7390', fontSize: 12 }

export default function InsightDemoPage() {
  const module = getPlatformModule('insight')!
  return (
    <DemoModuleShell module={module}>
      <DemoKpis
        items={[
          { label: 'Enrolments YTD', value: '346' },
          { label: 'Completion rate', value: '64%' },
          { label: 'NPS', value: '52' },
          { label: 'At-risk learners', value: '17' },
        ]}
      />

      <section className={s.card} aria-labelledby="insight-chart-title">
        <div className={s.section}>
          <h2 id="insight-chart-title">Enrolments vs completions</h2>
          <div className={s.legend}>
            {SERIES.map((series) => (
              <span key={series.key}>
                <i style={{ background: series.color }} />
                {series.label}
              </span>
            ))}
          </div>
        </div>
        <div className={s.chart}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={DATA} barGap={2} margin={{ top: 8, right: 4, left: -12, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="#eef3f9" />
              <XAxis dataKey="month" axisLine={{ stroke: '#e0e7f0' }} tickLine={false} tick={TICK} />
              <YAxis axisLine={false} tickLine={false} tick={TICK} width={40} />
              <Tooltip
                cursor={{ fill: '#f5f7fb' }}
                contentStyle={{
                  background: '#fff',
                  border: '1px solid #e0e7f0',
                  borderRadius: 9,
                  fontSize: 12,
                  boxShadow: '0 9px 22px -15px #1749784d',
                }}
                labelStyle={{ color: '#1b304e', fontWeight: 600 }}
                itemStyle={{ color: '#29415e' }}
              />
              {SERIES.map((series) => (
                <Bar
                  key={series.key}
                  dataKey={series.key}
                  name={series.label}
                  fill={series.color}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={28}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
        <details className={s.tableToggle}>
          <summary>View as table</summary>
          <div className={s.tableWrap}>
            <table className={s.table}>
              <thead>
                <tr>
                  <th scope="col">Month</th>
                  {SERIES.map((series) => (
                    <th key={series.key} scope="col" className={s.num}>
                      {series.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DATA.map((row) => (
                  <tr key={row.month}>
                    <td>{row.month}</td>
                    {SERIES.map((series) => (
                      <td key={series.key} className={s.num}>
                        {row[series.key]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </section>
    </DemoModuleShell>
  )
}
